
import { Router } from "express";
import { randomBytes, createHmac } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.js";

export const adminRouter = Router();

// Only authenticated Administrators can access these routes.
adminRouter.use(requireAuth, requireAdmin);

// View all programs, including inactive programs.
adminRouter.get("/programs", async (_req, res, next) => {
  try {
    const programs = await prisma.program.findMany({
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
    });

    res.json({
      programs: programs.map(({ id, code, name, active, createdAt, _count }) => ({
        id,
        code,
        name,
        active,
        classCount: _count.classes,
        createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Add a new academic program and automatically create its 16 classes.
adminRouter.post("/programs", async (req, res, next) => {
  try {
    const parsed = z.object({
      code: z.string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Invalid program abbreviation."),
      name: z.string()
        .trim()
        .min(2)
        .max(100),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid program name and abbreviation.",
        },
      });
    }

    const { code, name } = parsed.data;

    const existing = await prisma.program.findFirst({
      where: {
        OR: [
          { code },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({
        error: {
          code: "PROGRAM_ALREADY_EXISTS",
          message: "A program with this abbreviation or name already exists.",
        },
      });
    }

    const program = await prisma.$transaction(async (tx) => {
      const createdProgram = await tx.program.create({
        data: { code, name },
      });

      const classes = [];

      for (const yearLevel of [1, 2, 3, 4]) {
        for (const letter of ["A", "B", "C", "D"]) {
          classes.push({
            block: `${code}-${yearLevel}${letter}`,
            program: name,
            programId: createdProgram.id,
            yearLevel,
          });
        }
      }

      await tx.class.createMany({
        data: classes,
      });

      return createdProgram;
    });

    res.status(201).json({
      message: "Program and its 16 classes created successfully.",
      program,
    });
  } catch (error) {
    next(error);
  }
});

// Activate or deactivate an academic program.
adminRouter.patch("/programs/:id/status", async (req, res, next) => {
  try {
    const parsed = z.object({
      active: z.boolean(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid program status.",
        },
      });
    }

    const id = String(req.params.id);
    const { active } = parsed.data;

    const program = await prisma.program.findUnique({
      where: { id },
    });

    if (!program) {
      return res.status(404).json({
        error: {
          code: "PROGRAM_NOT_FOUND",
          message: "The selected program does not exist.",
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.program.update({
        where: { id },
        data: { active },
      });

      // Prevent invitation codes from being used while inactive.
      if (!active) {
        await tx.classInvitationCode.updateMany({
          where: {
            class: {
              programId: id,
            },
            active: true,
          },
          data: {
            active: false,
          },
        });
      }
    });

    res.json({
      message: active
        ? "Program reactivated successfully."
        : "Program deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
});



// Hash invitation codes before storing them in the database.
function hashInvitationCode(code: string): string {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(code)
    .digest("hex");
}

// Generate an invitation code for a class.
adminRouter.post("/invitation-codes", async (req, res, next) => {
  try {
    const parsed = z.object({
      classId: z.string().min(1),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please select a valid class.",
        },
      });
    }

    const cls = await prisma.class.findUnique({
      where: { id: parsed.data.classId },
    });

    if (!cls) {
      return res.status(404).json({
        error: {
          code: "CLASS_NOT_FOUND",
          message: "The selected class does not exist.",
        },
      });
    }

    const code = `RM-${randomBytes(8).toString("hex").toUpperCase()}`;
    const codeHash = hashInvitationCode(code);

    const admin = res.locals.user as { id: string };

    const invitation = await prisma.classInvitationCode.create({
      data: {
        codeHash,
        classId: cls.id,
        createdById: admin.id,
        maxUses: 2,
        usedCount: 0,
        active: true,
      },
      select: {
        id: true,
        classId: true,
        maxUses: true,
        usedCount: true,
        active: true,
        createdAt: true,
      },
    });

    // The plain invitation code is returned only once.
    res.status(201).json({
      message: "Invitation code created successfully.",
      code,
      invitation,
    });
  } catch (error) {
    next(error);
  }
});

// View all invitation codes and their usage information.
adminRouter.get("/invitation-codes", async (_req, res, next) => {
  try {
    const invitations = await prisma.classInvitationCode.findMany({
      select: {
        id: true,
        classId: true,
        maxUses: true,
        usedCount: true,
        active: true,
        expiresAt: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            program: true,
            yearLevel: true,
            block: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ invitations });
  } catch (error) {
    next(error);
  }
});

// Deactivate an invitation code.
adminRouter.patch(
  "/invitation-codes/:id/deactivate",
  async (req, res, next) => {
    try {
      const id = String(req.params.id);

      const result = await prisma.classInvitationCode.updateMany({
        where: {
          id,
          active: true,
        },
        data: {
          active: false,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({
          error: {
            code: "INVITATION_NOT_FOUND",
            message: "Active invitation code not found.",
          },
        });
      }

      res.json({
        message: "Invitation code deactivated successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);


// View all buildings, including inactive rooms, for Admin management.
adminRouter.get("/buildings", async (_req, res, next) => {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        floors: {
          orderBy: { number: "asc" },
          include: {
            rooms: {
              orderBy: { number: "asc" },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({ buildings });
  } catch (error) {
    next(error);
  }
});

// Create a building with its floors and rooms.
adminRouter.post("/buildings", async (req, res, next) => {
  try {
    const parsed = z.object({
    code: z.string().trim().toUpperCase().regex(
      /^[A-Z0-9-]{2,20}$/,
      "Building code must be 2–20 characters."
    ),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional().default(""),
    floors: z.array(
      z.object({
        number: z.number().int().positive(),
        rooms: z.array(
          z.object({
            number: z.string().trim().min(1).max(30),
            name: z.string().trim().max(100).optional().default(""),
            capacity: z.number().int().positive(),
            roomType: z.string().trim().max(50).optional().default(""),
            facilities: z.array(
              z.string().trim().min(1).max(50)
            ).optional().default([]),
          })
        ).min(1).max(100),
      })
    ).min(1).max(20),
  }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide valid building, floor, and room details.",
          details: parsed.error.flatten(),
        },
      });
    }

    const { code, name, description, floors } = parsed.data;

    // Check for duplicate floor and room numbers before saving.
    const floorNumbers = floors.map((floor) => floor.number);

    if (new Set(floorNumbers).size !== floorNumbers.length) {
      return res.status(400).json({
        error: {
          code: "DUPLICATE_FLOORS",
          message: "Floor numbers must be unique within a building.",
        },
      });
    }

    for (const floor of floors) {
      const roomNumbers = floor.rooms.map((room) => room.number);

      if (new Set(roomNumbers).size !== roomNumbers.length) {
        return res.status(400).json({
          error: {
            code: "DUPLICATE_ROOMS",
            message: `Room numbers must be unique on floor ${floor.number}.`,
          },
        });
      }
    }

    const existing = await prisma.building.findUnique({
      where: { code },
    });

    if (existing) {
      return res.status(409).json({
        error: {
          code: "BUILDING_ALREADY_EXISTS",
          message: "A building with this code already exists.",
        },
      });
    }

    const building = await prisma.building.create({
      data: {
        code,
        name,
        description,
        floors: {
          create: floors.map((floor) => ({
            number: floor.number,
            rooms: {
              create: floor.rooms.map((room) => ({
                number: room.number,
                name: room.name || "",
                capacity: room.capacity,
                roomType: room.roomType || "",
                facilities: room.facilities ?? [],
              })),
            },
          })),
        },
      },
      include: {
        floors: {
          orderBy: { number: "asc" },
          include: {
            rooms: {
              orderBy: { number: "asc" },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Building, floors, and rooms created successfully.",
      building,
    });
  } catch (error) {
    next(error);
  }
});

// Activate or deactivate a building.
adminRouter.patch("/buildings/:id/status", async (req, res, next) => {
  try {
    const parsed = z.object({
      active: z.boolean(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid building status.",
        },
      });
    }

    const id = String(req.params.id);
    const { active } = parsed.data;

    const building = await prisma.building.findUnique({
      where: { id },
    });

    if (!building) {
      return res.status(404).json({
        error: {
          code: "BUILDING_NOT_FOUND",
          message: "The selected building does not exist.",
        },
      });
    }

    await prisma.building.update({
      where: { id },
      data: { active },
    });

    res.json({
      message: active
        ? "Building reactivated successfully."
        : "Building deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
});

// Delete a building, but preserve reservation and queue records.
adminRouter.delete("/buildings/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const building = await tx.building.findUnique({
        where: { id },
      });

      if (!building) {
        return { status: 404, message: "Building not found." };
      }

      const reservationCount = await tx.reservation.count({
        where: {
          room: {
            floor: {
              buildingId: id,
            },
          },
        },
      });

      const queueCount = await tx.bookingQueueItem.count({
        where: {
          room: {
            floor: {
              buildingId: id,
            },
          },
        },
      });

      if (reservationCount > 0 || queueCount > 0) {
        return {
          status: 409,
          message:
            "This building cannot be deleted because it contains rooms with reservation history or pending booking queue entries.",
        };
      }

      await tx.building.delete({
        where: { id },
      });

      return {
        status: 200,
        message: "Building and its floors and rooms deleted successfully.",
      };
    });

    res.status(result.status).json({ message: result.message });
  } catch (error) {
    next(error);
  }
});

// Activate or deactivate a floor.
adminRouter.patch("/floors/:id/status", async (req, res, next) => {
  try {
    const parsed = z.object({
      active: z.boolean(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid floor status.",
        },
      });
    }

    const id = String(req.params.id);
    const { active } = parsed.data;

    const floor = await prisma.floor.findUnique({
      where: { id },
    });

    if (!floor) {
      return res.status(404).json({
        error: {
          code: "FLOOR_NOT_FOUND",
          message: "The selected floor does not exist.",
        },
      });
    }

    await prisma.floor.update({
      where: { id },
      data: { active },
    });

    res.json({
      message: active
        ? "Floor reactivated successfully."
        : "Floor deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
});

// Delete a floor, but preserve reservation and queue records.
adminRouter.delete("/floors/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const floor = await tx.floor.findUnique({
        where: { id },
      });

      if (!floor) {
        return { status: 404, message: "Floor not found." };
      }

      const reservationCount = await tx.reservation.count({
        where: {
          room: {
            floorId: id,
          },
        },
      });

      const queueCount = await tx.bookingQueueItem.count({
        where: {
          room: {
            floorId: id,
          },
        },
      });

      if (reservationCount > 0 || queueCount > 0) {
        return {
          status: 409,
          message:
            "This floor cannot be deleted because it contains rooms with reservation history or pending booking queue entries.",
        };
      }

      await tx.floor.delete({
        where: { id },
      });

      return {
        status: 200,
        message: "Floor and its rooms deleted successfully.",
      };
    });

    res.status(result.status).json({ message: result.message });
  } catch (error) {
    next(error);
  }
});

// Activate or deactivate a room.
adminRouter.patch("/rooms/:id/status", async (req, res, next) => {
  try {
    const parsed = z.object({
      active: z.boolean(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide a valid room status.",
        },
      });
    }

    const id = String(req.params.id);
    const { active } = parsed.data;

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      return res.status(404).json({
        error: {
          code: "ROOM_NOT_FOUND",
          message: "The selected room does not exist.",
        },
      });
    }

    await prisma.room.update({
      where: { id },
      data: { active },
    });

    res.json({
      message: active
        ? "Room reactivated successfully."
        : "Room deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
});

// Delete a room, but preserve reservation and queue records.
adminRouter.delete("/rooms/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where: { id },
      });

      if (!room) {
        return { status: 404, message: "Room not found." };
      }

      const reservationCount = await tx.reservation.count({
        where: { roomId: id },
      });

      const queueCount = await tx.bookingQueueItem.count({
        where: { roomId: id },
      });

      if (reservationCount > 0 || queueCount > 0) {
        return {
          status: 409,
          message:
            "This room cannot be deleted because it has reservation history or pending booking queue entries.",
        };
      }

      await tx.room.delete({
        where: { id },
      });

      return {
        status: 200,
        message: "Room deleted successfully.",
      };
    });

    res.status(result.status).json({ message: result.message });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// REGULAR SCHEDULE MANAGEMENT
// ==========================================

// Validate a date string and convert it to a Prisma date-only value.
function parseScheduleDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

// Check whether two time ranges overlap.
function scheduleTimesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return startA < endB && endA > startB;
}

// View all regular schedules.
adminRouter.get("/regular-schedules", async (_req, res, next) => {
  try {
    const schedules = await prisma.regularSchedule.findMany({
      include: {
        room: {
          include: {
            floor: {
              include: {
                building: true,
              },
            },
          },
        },
        class: true,
        exceptions: {
          orderBy: {
            date: "asc",
          },
        },
      },
      orderBy: [
        { roomId: "asc" },
        { startTime: "asc" },
      ],
    });

    res.json({ schedules });
  } catch (error) {
    next(error);
  }
});

// Create a recurring weekly schedule.
adminRouter.post("/regular-schedules", async (req, res, next) => {
  try {
    const parsed = z.object({
      roomId: z.string().min(1),
      classId: z.string().min(1),
      days: z.array(z.number().int().min(1).max(6)).min(1),
      startTime: z.string().regex(
        /^([01]\d|2[0-3]):[0-5]\d$/
      ),
      endTime: z.string().regex(
        /^([01]\d|2[0-3]):[0-5]\d$/
      ),
      effectiveFrom: z.string(),
      effectiveUntil: z.string().nullable().optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please provide valid regular schedule details.",
          details: parsed.error.flatten(),
        },
      });
    }

    const {
      roomId,
      classId,
      days,
      startTime,
      endTime,
      effectiveFrom,
      effectiveUntil,
    } = parsed.data;

    if (new Set(days).size !== days.length) {
      return res.status(400).json({
        error: {
          code: "DUPLICATE_DAYS",
          message: "Please select each weekday only once.",
        },
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        error: {
          code: "INVALID_TIME_RANGE",
          message: "The end time must be later than the start time.",
        },
      });
    }

    const fromDate = parseScheduleDate(effectiveFrom);
    const untilDate = effectiveUntil
      ? parseScheduleDate(effectiveUntil)
      : null;

    if (!fromDate || (effectiveUntil && !untilDate)) {
      return res.status(400).json({
        error: {
          code: "INVALID_DATE",
          message: "Please provide valid effective dates in YYYY-MM-DD format.",
        },
      });
    }

    if (untilDate && untilDate < fromDate) {
      return res.status(400).json({
        error: {
          code: "INVALID_DATE_RANGE",
          message: "The ending date cannot be earlier than the starting date.",
        },
      });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        floor: {
          include: {
            building: true,
          },
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
          message: "The selected room, floor, or building is unavailable.",
        },
      });
    }

    const cls = await prisma.class.findUnique({
      where: { id: classId },
    });

    if (!cls) {
      return res.status(404).json({
        error: {
          code: "CLASS_NOT_FOUND",
          message: "The selected class does not exist.",
        },
      });
    }

    // Prevent overlapping recurring schedules in the same room.
    const existingSchedules = await prisma.regularSchedule.findMany({
      where: {
        roomId,
        active: true,
      },
    });

    const hasConflict = existingSchedules.some((schedule) => {
      const sharesDay = schedule.days.some((day) => days.includes(day));

      if (!sharesDay) {
        return false;
      }

      const existingEnd = schedule.effectiveUntil?.getTime() ?? Infinity;
      const newEnd = untilDate?.getTime() ?? Infinity;

      const datesOverlap =
        fromDate.getTime() <= existingEnd &&
        newEnd >= schedule.effectiveFrom.getTime();

      const timesOverlap = scheduleTimesOverlap(
        startTime,
        endTime,
        schedule.startTime,
        schedule.endTime
      );

      return datesOverlap && timesOverlap;
    });

    if (hasConflict) {
      return res.status(409).json({
        error: {
          code: "SCHEDULE_CONFLICT",
          message: "This room already has an overlapping regular schedule.",
        },
      });
    }

    const schedule = await prisma.regularSchedule.create({
      data: {
        roomId,
        classId,
        days,
        startTime,
        endTime,
        effectiveFrom: fromDate,
        effectiveUntil: untilDate,
      },
      include: {
        room: true,
        class: true,
        exceptions: true,
      },
    });

    res.status(201).json({
      message: "Regular schedule created successfully.",
      schedule,
    });
  } catch (error) {
    next(error);
  }
});

// Activate or deactivate a regular schedule.
adminRouter.patch(
  "/regular-schedules/:id/status",
  async (req, res, next) => {
    try {
      const parsed = z.object({
        active: z.boolean(),
      }).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide a valid schedule status.",
          },
        });
      }

      const id = String(req.params.id);

      const result = await prisma.regularSchedule.updateMany({
        where: { id },
        data: {
          active: parsed.data.active,
        },
      });

      if (result.count === 0) {
        return res.status(404).json({
          error: {
            code: "SCHEDULE_NOT_FOUND",
            message: "The selected regular schedule does not exist.",
          },
        });
      }

      res.json({
        message: parsed.data.active
          ? "Regular schedule reactivated successfully."
          : "Regular schedule deactivated successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel or modify one occurrence of a regular schedule.
adminRouter.post(
  "/regular-schedules/:id/exceptions",
  async (req, res, next) => {
    try {
      const parsed = z.discriminatedUnion("type", [
        z.object({
          type: z.literal("CANCELLED"),
          date: z.string(),
          reason: z.string().trim().max(500).nullable().optional(),
        }),
        z.object({
          type: z.literal("MODIFIED"),
          date: z.string(),
          newStartTime: z.string().regex(
            /^([01]\d|2[0-3]):[0-5]\d$/
          ),
          newEndTime: z.string().regex(
            /^([01]\d|2[0-3]):[0-5]\d$/
          ),
          reason: z.string().trim().max(500).nullable().optional(),
        }),
      ]).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Please provide valid schedule exception details.",
            details: parsed.error.flatten(),
          },
        });
      }

      const id = String(req.params.id);
      const date = parseScheduleDate(parsed.data.date);

      if (!date) {
        return res.status(400).json({
          error: {
            code: "INVALID_DATE",
            message: "Please provide a valid date in YYYY-MM-DD format.",
          },
        });
      }

      if (
        parsed.data.type === "MODIFIED" &&
        parsed.data.newStartTime >= parsed.data.newEndTime
      ) {
        return res.status(400).json({
          error: {
            code: "INVALID_TIME_RANGE",
            message: "The new end time must be later than the new start time.",
          },
        });
      }

      const schedule = await prisma.regularSchedule.findUnique({
        where: { id },
      });

      if (!schedule || !schedule.active) {
        return res.status(404).json({
          error: {
            code: "SCHEDULE_NOT_FOUND",
            message: "An active regular schedule was not found.",
          },
        });
      }

      if (
        date < schedule.effectiveFrom ||
        (schedule.effectiveUntil && date > schedule.effectiveUntil)
      ) {
        return res.status(400).json({
          error: {
            code: "DATE_OUTSIDE_SCHEDULE",
            message: "The selected date is outside this schedule's effective dates.",
          },
        });
      }

      // Only allow exceptions on a weekday included in the schedule.
      const weekday = date.getUTCDay() === 0
        ? 7
        : date.getUTCDay();

      if (!schedule.days.includes(weekday)) {
        return res.status(400).json({
          error: {
            code: "INVALID_SCHEDULE_DAY",
            message: "The selected date is not one of this schedule's weekdays.",
          },
        });
      }

      const exceptionData = parsed.data.type === "CANCELLED"
        ? {
            type: "CANCELLED",
            newStartTime: null,
            newEndTime: null,
            reason: parsed.data.reason ?? null,
          }
        : {
            type: "MODIFIED",
            newStartTime: parsed.data.newStartTime,
            newEndTime: parsed.data.newEndTime,
            reason: parsed.data.reason ?? null,
          };

      const exception = await prisma.scheduleException.upsert({
        where: {
          regularScheduleId_date: {
            regularScheduleId: id,
            date,
          },
        },
        create: {
          regularScheduleId: id,
          date,
          ...exceptionData,
        },
        update: exceptionData,
      });

      res.json({
        message: parsed.data.type === "CANCELLED"
          ? "This schedule occurrence has been cancelled. The room is now available for that time."
          : "This schedule occurrence has been modified successfully.",
        exception,
      });
    } catch (error) {
      next(error);
    }
  }
);
