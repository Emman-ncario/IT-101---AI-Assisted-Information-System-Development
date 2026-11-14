import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { env } from "../config.js";

export const buildingsRouter = Router();
buildingsRouter.use(requireAuth);

buildingsRouter.get("/", async (_req, res) => {
  const buildings = await prisma.building.findMany({
    include: { floors: { include: { rooms: { where: { active: true }, select: { id: true } } } } },
    orderBy: { name: "asc" }
  });
  res.json(buildings.map(b => ({
    id: b.id, code: b.code, name: b.name, description: b.description, imageUrl: b.imageUrl,
    floorCount: b.floors.length, roomCount: b.floors.reduce((sum, f) => sum + f.rooms.length, 0),
    floors: b.floors.map(f => ({ id: f.id, number: f.number, roomCount: f.rooms.length }))
  })));
});

buildingsRouter.get("/:id", async (req, res) => {
  const building = await prisma.building.findUnique({
    where: { id: req.params.id },
    include: {
      floors: {
        orderBy: { number: "desc" },
        include: {
          rooms: {
            orderBy: { number: "asc" },
          },
        },
      },
    },
  });

  if (!building) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Building not found.",
      },
    });
  }

  res.json(building);
});


buildingsRouter.get("/rooms/:roomId/availability", async (req, res) => {
  const parsed = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Provide date=YYYY-MM-DD.",
      },
    });
  }

  const room = await prisma.room.findUnique({
    where: { id: req.params.roomId },
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
        code: "NOT_FOUND",
        message: "Room, floor, or building is unavailable.",
      },
    });
  }

  const date = parsed.data.date;

  // Use the configured timezone for the selected day.
  const dayStart = fromZonedTime(
    `${date}T00:00:00`,
    env.TIME_ZONE
  );

const dayEnd = new Date(
  dayStart.getTime() + 24 * 60 * 60 * 1000
);

  dayEnd.setDate(dayEnd.getDate() + 1);

  // Prisma Date fields use a date-only value.
  const scheduleDate = new Date(`${date}T00:00:00.000Z`);

  // ISO weekday: Monday = 1, Sunday = 7.
  const weekday = Number(
    formatInTimeZone(dayStart, env.TIME_ZONE, "i")
  );

  const reservations = await prisma.reservation.findMany({
    where: {
      roomId: room.id,
      status: "CONFIRMED",
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      class: {
        select: {
          block: true,
        },
      },
    },
    orderBy: {
      startAt: "asc",
    },
  });

  // Find active recurring schedules for this room and weekday.
  const regularSchedules = await prisma.regularSchedule.findMany({
    where: {
      roomId: room.id,
      active: true,
      days: {
        has: weekday,
      },
      effectiveFrom: {
        lte: scheduleDate,
      },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: scheduleDate } },
      ],
    },
    include: {
      class: {
        select: {
          block: true,
        },
      },
      exceptions: {
        where: {
          date: scheduleDate,
        },
      },
    },
  });

  const slots = [];

  for (let minutes = 7 * 60; minutes < 21 * 60; minutes += 30) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");

    const startAt = fromZonedTime(
      `${date}T${hour}:${minute}:00`,
      env.TIME_ZONE
    );

    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);

    const reservation = reservations.find(
      (r) => r.startAt < endAt && r.endAt > startAt
    );

    const regularSchedule = regularSchedules.find((schedule) => {
      const exception = schedule.exceptions[0];

      // A cancelled occurrence does not occupy the room.
      if (exception?.type === "CANCELLED") {
        return false;
      }

      // A modified occurrence uses its new time.
      const scheduleStart = exception?.type === "MODIFIED"
        ? exception.newStartTime
        : schedule.startTime;

      const scheduleEnd = exception?.type === "MODIFIED"
        ? exception.newEndTime
        : schedule.endTime;

      if (!scheduleStart || !scheduleEnd) {
        return false;
      }

      const scheduleStartAt = fromZonedTime(
        `${date}T${scheduleStart}:00`,
        env.TIME_ZONE
      );

      const scheduleEndAt = fromZonedTime(
        `${date}T${scheduleEnd}:00`,
        env.TIME_ZONE
      );

      return scheduleStartAt < endAt && scheduleEndAt > startAt;
    });

    const past = startAt <= new Date();

    slots.push({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      available: !reservation && !regularSchedule && !past,
      past,
      reservation: reservation
        ? { classBlock: reservation.class.block }
        : null,
      regularSchedule: regularSchedule
        ? { classBlock: regularSchedule.class.block }
        : null,
    });
  }

  res.json({
    room: {
      id: room.id,
      number: room.number,
      name: room.name,
      floor: room.floor.number,
      building: room.floor.building.name,
    },
    date,
    timeZone: env.TIME_ZONE,
    slots,
    reservations,
  });
});


buildingsRouter.get("/rooms/:roomId", async (req, res) => {
  const room = await prisma.room.findUnique({ where: { id: req.params.roomId }, include: { floor: { include: { building: true } } } });
  if (!room || !room.active) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Room not found." } });
  res.json({ ...room, floor: { ...room.floor, building: room.floor.building } });
});
