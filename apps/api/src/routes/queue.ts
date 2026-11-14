
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRepresentative } from "../middleware/auth.js";
import { parseLocalDateTime, validateInterval } from "../lib/time.js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { env } from "../config.js";

export const queueRouter = Router();
queueRouter.use(requireAuth, requireRepresentative);

const queueInput = z.object({
  roomId: z.string().min(1),
  classId: z.string().min(1),
  startAt: z.string(),
  endAt: z.string()
});

async function validateClassAccess(userId: string, role: string, classId: string) {
  if (role === "ADMIN") return true;
  const membership = await prisma.classMembership.findUnique({
    where: { userId_classId: { userId, classId } }
  });
  return Boolean(membership?.isRep);
}

// Check whether a booking overlaps an active regular schedule.
async function hasRegularScheduleConflict(
  db: Pick<typeof prisma, "regularSchedule">,
  roomId: string,
  startAt: Date,
  endAt: Date
) {
  const firstDate = formatInTimeZone(
    startAt,
    env.TIME_ZONE,
    "yyyy-MM-dd"
  );

  const lastDate = formatInTimeZone(
    new Date(endAt.getTime() - 1),
    env.TIME_ZONE,
    "yyyy-MM-dd"
  );

  // Check every local calendar date touched by the booking.
  const currentDate = new Date(`${firstDate}T12:00:00.000Z`);
  const finalDate = new Date(`${lastDate}T12:00:00.000Z`);

  while (currentDate <= finalDate) {
    const date = currentDate.toISOString().slice(0, 10);

    const localMidday = fromZonedTime(
      `${date}T12:00:00`,
      env.TIME_ZONE
    );

    const weekday = Number(
      formatInTimeZone(localMidday, env.TIME_ZONE, "i")
    );

    const scheduleDate = new Date(`${date}T00:00:00.000Z`);

    const schedules = await db.regularSchedule.findMany({
      where: {
        roomId,
        active: true,
        days: { has: weekday },
        effectiveFrom: { lte: scheduleDate },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gte: scheduleDate } },
        ],
      },
      include: {
        exceptions: {
          where: { date: scheduleDate },
        },
      },
    });

    const conflict = schedules.some((schedule) => {
      const exception = schedule.exceptions[0];

      // A cancelled occurrence does not occupy the room.
      if (exception?.type === "CANCELLED") {
        return false;
      }

      // A modified occurrence uses its replacement times.
      const scheduleStart = exception?.type === "MODIFIED"
        ? exception.newStartTime ?? schedule.startTime
        : schedule.startTime;

      const scheduleEnd = exception?.type === "MODIFIED"
        ? exception.newEndTime ?? schedule.endTime
        : schedule.endTime;

      const scheduledStartAt = fromZonedTime(
        `${date}T${scheduleStart}:00`,
        env.TIME_ZONE
      );

      const scheduledEndAt = fromZonedTime(
        `${date}T${scheduleEnd}:00`,
        env.TIME_ZONE
      );

      const bookingDayStart = fromZonedTime(
        `${date}T00:00:00`,
        env.TIME_ZONE
      );

      const bookingDayEnd = new Date(
        bookingDayStart.getTime() + 24 * 60 * 60 * 1000
      );

      const overlapStart = startAt > bookingDayStart
        ? startAt
        : bookingDayStart;

      const overlapEnd = endAt < bookingDayEnd
        ? endAt
        : bookingDayEnd;

      return (
        scheduledStartAt < overlapEnd &&
        scheduledEndAt > overlapStart
      );
    });

    if (conflict) {
      return true;
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return false;
}

queueRouter.get("/", async (_req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const items = await prisma.bookingQueueItem.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    include: {
      room: {
        include: {
          floor: {
            include: { building: true }
          }
        }
      },
      class: true
    },
    orderBy: { createdAt: "asc" }
  });

  res.json(items);
});

queueRouter.post("/", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };
  const input = queueInput.safeParse(req.body);

  if (!input.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid booking details.",
      },
    });
  }

  try {
    if (!await validateClassAccess(user.id, user.role, input.data.classId)) {
      return res.status(403).json({
        error: {
          code: "CLASS_FORBIDDEN",
          message: "You are not a representative of this class.",
        },
      });
    }

    const startAt = parseLocalDateTime(input.data.startAt);
    const endAt = parseLocalDateTime(input.data.endAt);

    validateInterval(startAt, endAt);

    if (startAt <= new Date()) {
      return res.status(400).json({
        error: {
          code: "PAST_TIME",
          message: "Choose a future time.",
        },
      });
    }

    // Check whether the room, floor, and building are all active.
    const room = await prisma.room.findUnique({
      where: { id: input.data.roomId },
      include: {
        floor: {
          include: { building: true },
        },
      },
    });

    if (
      !room ||
      !room.active ||
      !room.floor.active ||
      !room.floor.building.active
    ) {
      return res.status(404).json({
        error: {
          code: "ROOM_NOT_AVAILABLE",
          message: "This room, floor, or building is currently unavailable.",
        },
      });
    }

    const overlap = await prisma.bookingQueueItem.findFirst({
      where: {
        userId: user.id,
        roomId: room.id,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlap) {
      return res.status(409).json({
        error: {
          code: "QUEUE_OVERLAP",
          message: "This overlaps another item in your queue.",
        },
      });
    }

    const confirmed = await prisma.reservation.findFirst({
      where: {
        roomId: room.id,
        status: "CONFIRMED",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (confirmed) {
      return res.status(409).json({
        error: {
          code: "ROOM_UNAVAILABLE",
          message: "That time range is already reserved.",
        },
      });
    }

    const scheduleConflict = await hasRegularScheduleConflict(
      prisma,
      room.id,
      startAt,
      endAt
    );

    if (scheduleConflict) {
      return res.status(409).json({
        error: {
          code: "REGULAR_SCHEDULE_CONFLICT",
          message: "That time range conflicts with a regular class schedule.",
        },
      });
    }

    const item = await prisma.bookingQueueItem.create({
      data: {
        userId: user.id,
        roomId: room.id,
        classId: input.data.classId,
        startAt,
        endAt,
      },
      include: {
        room: {
          include: {
            floor: {
              include: { building: true },
            },
          },
        },
        class: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({
      error: {
        code: "INVALID_INTERVAL",
        message: error instanceof Error
          ? error.message
          : "Invalid time interval.",
      },
    });
  }
});

queueRouter.patch("/:id", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };
  const input = queueInput.safeParse(req.body);

  if (!input.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid booking details.",
      },
    });
  }

  const existing = await prisma.bookingQueueItem.findFirst({
    where: {
      id: req.params.id,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
  });

  if (!existing) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Queue item not found.",
      },
    });
  }

  if (!await validateClassAccess(user.id, user.role, input.data.classId)) {
    return res.status(403).json({
      error: {
        code: "CLASS_FORBIDDEN",
        message: "You are not a representative of this class.",
      },
    });
  }

  try {
    const startAt = parseLocalDateTime(input.data.startAt);
    const endAt = parseLocalDateTime(input.data.endAt);

    validateInterval(startAt, endAt);

    if (startAt <= new Date()) {
      throw new Error("Choose a future time.");
    }

    // Check whether the selected room, floor, and building are active.
    const room = await prisma.room.findUnique({
      where: { id: input.data.roomId },
      include: {
        floor: {
          include: { building: true },
        },
      },
    });

    if (
      !room ||
      !room.active ||
      !room.floor.active ||
      !room.floor.building.active
    ) {
      return res.status(404).json({
        error: {
          code: "ROOM_NOT_AVAILABLE",
          message: "This room, floor, or building is currently unavailable.",
        },
      });
    }

    const overlap = await prisma.bookingQueueItem.findFirst({
      where: {
        id: { not: existing.id },
        userId: user.id,
        roomId: room.id,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlap) {
      return res.status(409).json({
        error: {
          code: "QUEUE_OVERLAP",
          message: "This overlaps another item in your queue.",
        },
      });
    }

    const confirmed = await prisma.reservation.findFirst({
      where: {
        roomId: room.id,
        status: "CONFIRMED",
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (confirmed) {
      return res.status(409).json({
        error: {
          code: "ROOM_UNAVAILABLE",
          message: "That time range is already reserved.",
        },
      });
    }

    const scheduleConflict = await hasRegularScheduleConflict(
      prisma,
      room.id,
      startAt,
      endAt
    );

    if (scheduleConflict) {
      return res.status(409).json({
        error: {
          code: "REGULAR_SCHEDULE_CONFLICT",
          message: "That time range conflicts with a regular class schedule.",
        },
      });
    }

    const updated = await prisma.bookingQueueItem.update({
      where: { id: existing.id },
      data: {
        roomId: room.id,
        classId: input.data.classId,
        startAt,
        endAt,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({
      error: {
        code: "INVALID_INTERVAL",
        message: error instanceof Error
          ? error.message
          : "Invalid time interval.",
      },
    });
  }
});

queueRouter.delete("/:id", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const item = await prisma.bookingQueueItem.findFirst({
    where: {
      id: req.params.id,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
  });

  if (!item) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Queue item not found.",
      },
    });
  }

  await prisma.bookingQueueItem.delete({
    where: { id: item.id },
  });

  res.status(204).end();
});

queueRouter.post("/confirm", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const input = z.object({
    itemIds: z.array(z.string().min(1)).min(1).max(20),
  }).safeParse(req.body);

  if (!input.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Choose one or more queue items.",
      },
    });
  }

  const items = await prisma.bookingQueueItem.findMany({
    where: {
      id: { in: input.data.itemIds },
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
  });

  if (items.length !== input.data.itemIds.length) {
    return res.status(404).json({
      error: {
        code: "QUEUE_ITEMS_NOT_FOUND",
        message: "One or more queue items were not found.",
      },
    });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const output = [];

      for (const item of items) {
        if (!await validateClassAccess(user.id, user.role, item.classId)) {
          throw new Error("CLASS_FORBIDDEN");
        }

        validateInterval(item.startAt, item.endAt);

        if (item.startAt <= new Date()) {
          throw new Error("PAST_TIME");
        }

        // Recheck room, floor, and building status before confirming.
        const room = await tx.room.findUnique({
          where: { id: item.roomId },
          include: {
            floor: {
              include: { building: true },
            },
          },
        });

        if (
          !room ||
          !room.active ||
          !room.floor.active ||
          !room.floor.building.active
        ) {
          throw new Error("ROOM_NOT_AVAILABLE");
        }

        const overlap = await tx.reservation.findFirst({
          where: {
            roomId: item.roomId,
            status: "CONFIRMED",
            startAt: { lt: item.endAt },
            endAt: { gt: item.startAt },
          },
        });

        if (overlap) {
          throw new Error("ROOM_UNAVAILABLE");
        }

        const scheduleConflict = await hasRegularScheduleConflict(
          tx,
          item.roomId,
          item.startAt,
          item.endAt
        );

        if (scheduleConflict) {
          throw new Error("REGULAR_SCHEDULE_CONFLICT");
        }

        const reservation = await tx.reservation.create({
          data: {
            roomId: item.roomId,
            classId: item.classId,
            createdById: user.id,
            startAt: item.startAt,
            endAt: item.endAt,
            status: "CONFIRMED",
          },
        });

        await tx.bookingQueueItem.delete({
          where: { id: item.id },
        });

        output.push(reservation);
      }

      return output;
    }, {
      isolationLevel: "Serializable",
    });

    res.status(201).json({ reservations: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    const map: Record<string, [number, string, string]> = {
      CLASS_FORBIDDEN: [
        403,
        "CLASS_FORBIDDEN",
        "You are not a representative of this class.",
      ],
      PAST_TIME: [
        400,
        "PAST_TIME",
        "A queued time is now in the past.",
      ],
      ROOM_NOT_AVAILABLE: [
        409,
        "ROOM_NOT_AVAILABLE",
        "The room, floor, or building is disabled. Your queue was preserved.",
      ],
      ROOM_UNAVAILABLE: [
        409,
        "ROOM_UNAVAILABLE",
        "A room is no longer available. Your queue was preserved.",
      ],
      REGULAR_SCHEDULE_CONFLICT: [
        409,
        "REGULAR_SCHEDULE_CONFLICT",
        "A queued time conflicts with a regular class schedule. Your queue was preserved.",
      ],
    };

    const result = map[message] ?? [
      409,
      "BOOKING_CONFLICT",
      "Confirmation failed due to a booking conflict. Your queue was preserved.",
    ];

    res.status(result[0]).json({
      error: {
        code: result[1],
        message: result[2],
      },
    });
  }
});
