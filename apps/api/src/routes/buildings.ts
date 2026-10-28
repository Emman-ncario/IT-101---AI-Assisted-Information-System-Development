import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { formatInTimeZone } from "date-fns-tz";
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
    include: { floors: { orderBy: { number: "desc" }, include: { rooms: { where: { active: true }, orderBy: { number: "asc" } } } } }
  });
  if (!building) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Building not found." } });
  res.json(building);
});

buildingsRouter.get("/rooms/:roomId/availability", async (req, res) => {
  const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide date=YYYY-MM-DD." } });
  const room = await prisma.room.findUnique({ where: { id: req.params.roomId }, include: { floor: { include: { building: true } } } });
  if (!room || !room.active) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Room not found." } });
  const date = parsed.data.date;
  const dayStart = new Date(`${date}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const reservations = await prisma.reservation.findMany({
    where: { roomId: room.id, status: "CONFIRMED", startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
    select: { id: true, startAt: true, endAt: true, status: true, class: { select: { block: true } } },
    orderBy: { startAt: "asc" }
  });
  const slots = [];
  for (let minutes = 7 * 60; minutes < 21 * 60; minutes += 30) {
    const startAt = new Date(`${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+08:00`);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const reservation = reservations.find(r => r.startAt < endAt && r.endAt > startAt);
    slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), available: !reservation && startAt > new Date(), past: startAt <= new Date(), reservation: reservation ? { classBlock: reservation.class.block } : null });
  }
  res.json({ room: { id: room.id, number: room.number, name: room.name, floor: room.floor.number, building: room.floor.building.name }, date, timeZone: env.TIME_ZONE, slots, reservations });
});

buildingsRouter.get("/rooms/:roomId", async (req, res) => {
  const room = await prisma.room.findUnique({ where: { id: req.params.roomId }, include: { floor: { include: { building: true } } } });
  if (!room || !room.active) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Room not found." } });
  res.json({ ...room, floor: { ...room.floor, building: room.floor.building } });
});
