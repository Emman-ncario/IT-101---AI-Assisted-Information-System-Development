
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRepresentative } from "../middleware/auth.js";
import { parseLocalDateTime, validateInterval } from "../lib/time.js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { env } from "../config.js";

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth);

async function hasRegularScheduleConflict(
  db: Pick<typeof prisma, "regularSchedule">,
  roomId: string,
  startAt: Date,
  endAt: Date,
) {
  const firstDate = formatInTimeZone(
    startAt,
    env.TIME_ZONE,
    "yyyy-MM-dd",
  );

  const lastDate = formatInTimeZone(
    new Date(endAt.getTime() - 1),
    env.TIME_ZONE,
    "yyyy-MM-dd",
  );

  const currentDate = new Date(`${firstDate}T12:00:00.000Z`);
  const finalDate = new Date(`${lastDate}T12:00:00.000Z`);

  while (currentDate <= finalDate) {
    const date = currentDate.toISOString().slice(0, 10);

    const localMidday = fromZonedTime(
      `${date}T12:00:00`,
      env.TIME_ZONE,
    );

    const weekday = Number(
      formatInTimeZone(localMidday, env.TIME_ZONE, "i"),
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

      if (exception?.type === "CANCELLED") {
        return false;
      }

      const scheduleStart =
        exception?.type === "MODIFIED"
          ? exception.newStartTime ?? schedule.startTime
          : schedule.startTime;

      const scheduleEnd =
        exception?.type === "MODIFIED"
          ? exception.newEndTime ?? schedule.endTime
          : schedule.endTime;

      const scheduledStartAt = fromZonedTime(
        `${date}T${scheduleStart}:00`,
        env.TIME_ZONE,
      );

      const scheduledEndAt = fromZonedTime(
        `${date}T${scheduleEnd}:00`,
        env.TIME_ZONE,
      );

      const bookingDayStart = fromZonedTime(
        `${date}T00:00:00`,
        env.TIME_ZONE,
      );

      const bookingDayEnd = new Date(
        bookingDayStart.getTime() + 24 * 60 * 60 * 1000,
      );

      const overlapStart =
        startAt > bookingDayStart ? startAt : bookingDayStart;

      const overlapEnd =
        endAt < bookingDayEnd ? endAt : bookingDayEnd;

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

async function hasReservationConflict(
  db: Pick<typeof prisma, "reservation">,
  roomId: string,
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string,
) {
  const conflict = await db.reservation.findFirst({
    where: {
      roomId,
      status: "CONFIRMED",
      ...(excludeReservationId
        ? { id: { not: excludeReservationId } }
        : {}),
      startAt: { lt: endAt },
      OR: [
        {
          endedEarlyAt: null,
          endAt: { gt: startAt },
        },
        {
          endedEarlyAt: { gt: startAt },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(conflict);
}

async function hasClassRepresentativeAccess(
  userId: string,
  classId: string,
) {
  const membership = await prisma.classMembership.findUnique({
    where: {
      userId_classId: {
        userId,
        classId,
      },
    },
  });

  return Boolean(membership?.isRep);
}

// View reservations belonging to the user's classes.
// Administrators can view all reservations.
reservationsRouter.get("/", async (_req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const where =
    user.role === "ADMIN"
      ? {}
      : {
          class: {
            memberships: {
              some: { userId: user.id },
            },
          },
        };

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      room: {
        include: {
          floor: {
            include: { building: true },
          },
        },
      },
      class: true,
      createdBy: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { startAt: "asc" },
  });

  res.json(reservations);
});

// View one reservation belonging to the user's class.
reservationsRouter.get("/:id", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: req.params.id,
      ...(user.role === "ADMIN"
        ? {}
        : {
            class: {
              memberships: {
                some: { userId: user.id },
              },
            },
          }),
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
      createdBy: {
        select: { id: true, fullName: true },
      },
    },
  });

  if (!reservation) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Reservation not found.",
      },
    });
  }

  res.json(reservation);
});

// Cancel a future reservation.
// Either representative of the class can cancel it.
reservationsRouter.post("/:id/cancel", requireRepresentative, async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const reservation = await prisma.reservation.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!reservation) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Reservation not found.",
      },
    });
  }

  if (
    user.role !== "ADMIN" &&
    !(await hasClassRepresentativeAccess(user.id, reservation.classId))
  ) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You may manage reservations only for your assigned class.",
      },
    });
  }

  if (
    reservation.status !== "CONFIRMED" ||
    reservation.startAt <= new Date()
  ) {
    return res.status(400).json({
      error: {
        code: "TOO_LATE",
        message: "Only future reservations can be cancelled.",
      },
    });
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  res.json(updated);
});

// Undo cancellation of a future reservation.
reservationsRouter.post("/:id/undo-cancel", requireRepresentative, async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const reservation = await prisma.reservation.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!reservation) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Reservation not found.",
      },
    });
  }

  if (
    user.role !== "ADMIN" &&
    !(await hasClassRepresentativeAccess(user.id, reservation.classId))
  ) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You may manage reservations only for your assigned class.",
      },
    });
  }

  if (
    reservation.status !== "CANCELLED" ||
    reservation.startAt <= new Date()
  ) {
    return res.status(400).json({
      error: {
        code: "CANNOT_UNDO",
        message: "Only cancelled future reservations can be restored.",
      },
    });
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const room = await tx.room.findUnique({
          where: { id: reservation.roomId },
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

        const conflict = await hasReservationConflict(
          tx,
          reservation.roomId,
          reservation.startAt,
          reservation.endAt,
        );

        if (conflict) {
          throw new Error("RESERVATION_CONFLICT");
        }

        const scheduleConflict = await hasRegularScheduleConflict(
          tx,
          reservation.roomId,
          reservation.startAt,
          reservation.endAt,
        );

        if (scheduleConflict) {
          throw new Error("SCHEDULE_CONFLICT");
        }

        return tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: "CONFIRMED",
            cancelledAt: null,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    res.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "ROOM_NOT_AVAILABLE") {
      return res.status(409).json({
        error: {
          code: "ROOM_NOT_AVAILABLE",
          message: "This room, floor, or building is inactive.",
        },
      });
    }

    if (message === "RESERVATION_CONFLICT") {
      return res.status(409).json({
        error: {
          code: "RESERVATION_CONFLICT",
          message: "The reservation time has already been booked.",
        },
      });
    }

    if (message === "SCHEDULE_CONFLICT") {
      return res.status(409).json({
        error: {
          code: "SCHEDULE_CONFLICT",
          message: "The reservation conflicts with a regular class schedule.",
        },
      });
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        error: {
          code: "BOOKING_CONFLICT",
          message: "The reservation changed. Please try again.",
        },
      });
    }

    throw error;
  }
});

// End an active reservation early.
// The original scheduled endAt is preserved.
reservationsRouter.post("/:id/end-early", requireRepresentative, async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const reservation = await prisma.reservation.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!reservation) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Reservation not found.",
      },
    });
  }

  if (
    user.role !== "ADMIN" &&
    !(await hasClassRepresentativeAccess(user.id, reservation.classId))
  ) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You may manage reservations only for your assigned class.",
      },
    });
  }

  const now = new Date();

  if (
    reservation.status !== "CONFIRMED" ||
    reservation.endedEarlyAt ||
    reservation.startAt > now ||
    reservation.endAt <= now
  ) {
    return res.status(400).json({
      error: {
        code: "INVALID_EARLY_END",
        message: "Only an active reservation can be ended early.",
      },
    });
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { endedEarlyAt: now },
  });

  res.json(updated);
});

// Extend a reservation.
// Either representative of the class can extend it.
reservationsRouter.patch("/:id/extend", requireRepresentative, async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const parsed = z.object({
    endAt: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Provide a valid new endAt date and time.",
      },
    });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!reservation) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Reservation not found.",
      },
    });
  }

  if (
    user.role !== "ADMIN" &&
    !(await hasClassRepresentativeAccess(user.id, reservation.classId))
  ) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You may manage reservations only for your assigned class.",
      },
    });
  }

  if (
    reservation.status !== "CONFIRMED" ||
    reservation.endedEarlyAt ||
    reservation.endAt <= new Date()
  ) {
    return res.status(400).json({
      error: {
        code: "CANNOT_EXTEND",
        message: "This reservation can no longer be extended.",
      },
    });
  }

  let newEndAt: Date;

  try {
    newEndAt = parseLocalDateTime(parsed.data.endAt);
    validateInterval(reservation.startAt, newEndAt);
  } catch (error) {
    return res.status(400).json({
      error: {
        code: "INVALID_TIME",
        message:
          error instanceof Error
            ? error.message
            : "Invalid reservation time.",
      },
    });
  }

  if (newEndAt <= reservation.endAt) {
    return res.status(400).json({
      error: {
        code: "INVALID_EXTENSION",
        message: "The new end time must be later than the current end time.",
      },
    });
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const room = await tx.room.findUnique({
          where: { id: reservation.roomId },
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

        const conflict = await hasReservationConflict(
          tx,
          reservation.roomId,
          reservation.startAt,
          newEndAt,
          reservation.id,
        );

        if (conflict) {
          throw new Error("RESERVATION_CONFLICT");
        }

        const scheduleConflict = await hasRegularScheduleConflict(
          tx,
          reservation.roomId,
          reservation.startAt,
          newEndAt,
        );

        if (scheduleConflict) {
          throw new Error("SCHEDULE_CONFLICT");
        }

        return tx.reservation.update({
          where: { id: reservation.id },
          data: { endAt: newEndAt },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    res.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "ROOM_NOT_AVAILABLE") {
      return res.status(409).json({
        error: {
          code: "ROOM_NOT_AVAILABLE",
          message: "This room, floor, or building is inactive.",
        },
      });
    }

    if (message === "RESERVATION_CONFLICT") {
      return res.status(409).json({
        error: {
          code: "RESERVATION_CONFLICT",
          message: "The extension conflicts with another reservation.",
        },
      });
    }

    if (message === "SCHEDULE_CONFLICT") {
      return res.status(409).json({
        error: {
          code: "SCHEDULE_CONFLICT",
          message: "The extension conflicts with a regular class schedule.",
        },
      });
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        error: {
          code: "BOOKING_CONFLICT",
          message: "The reservation changed. Please try again.",
        },
      });
    }

    throw error;
  }
});

// Create a reservation directly.
// Successful bookings are automatically confirmed.
reservationsRouter.post("/", requireRepresentative, async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const parsed = z.object({
    roomId: z.string().min(1),
    classId: z.string().min(1),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Provide roomId, classId, startAt, and endAt.",
      },
    });
  }

  if (
    user.role !== "ADMIN" &&
    !(await hasClassRepresentativeAccess(user.id, parsed.data.classId))
  ) {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "You may only book rooms for your assigned class.",
      },
    });
  }

  let startAt: Date;
  let endAt: Date;

  try {
    startAt = parseLocalDateTime(parsed.data.startAt);
    endAt = parseLocalDateTime(parsed.data.endAt);
    validateInterval(startAt, endAt);
  } catch (error) {
    return res.status(400).json({
      error: {
        code: "INVALID_TIME",
        message:
          error instanceof Error
            ? error.message
            : "Invalid reservation time.",
      },
    });
  }

  if (startAt <= new Date()) {
    return res.status(400).json({
      error: {
        code: "PAST_RESERVATION",
        message: "Reservations must start in the future.",
      },
    });
  }

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        const room = await tx.room.findUnique({
          where: { id: parsed.data.roomId },
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

        const conflict = await hasReservationConflict(
          tx,
          room.id,
          startAt,
          endAt,
        );

        if (conflict) {
          throw new Error("RESERVATION_CONFLICT");
        }

        const scheduleConflict = await hasRegularScheduleConflict(
          tx,
          room.id,
          startAt,
          endAt,
        );

        if (scheduleConflict) {
          throw new Error("SCHEDULE_CONFLICT");
        }

        return tx.reservation.create({
          data: {
            roomId: room.id,
            classId: parsed.data.classId,
            createdById: user.id,
            startAt,
            endAt,
            status: "CONFIRMED",
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
            createdBy: {
              select: { id: true, fullName: true },
            },
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return res.status(201).json(reservation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "ROOM_NOT_AVAILABLE") {
      return res.status(409).json({
        error: {
          code: "ROOM_NOT_AVAILABLE",
          message: "This room, floor, or building is inactive.",
        },
      });
    }

    if (message === "RESERVATION_CONFLICT") {
      return res.status(409).json({
        error: {
          code: "RESERVATION_CONFLICT",
          message: "This room already has a reservation at that time.",
        },
      });
    }

    if (message === "SCHEDULE_CONFLICT") {
      return res.status(409).json({
        error: {
          code: "SCHEDULE_CONFLICT",
          message: "This room has a regular class schedule at that time.",
        },
      });
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        error: {
          code: "BOOKING_CONFLICT",
          message: "The room availability changed. Please try again.",
        },
      });
    }

    throw error;
  }
});
