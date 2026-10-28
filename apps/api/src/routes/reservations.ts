import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRepresentative } from "../middleware/auth.js";
import { parseLocalDateTime, validateInterval } from "../lib/time.js";

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth);

reservationsRouter.get("/", async (_req, res) => {
  const user = res.locals.user as { id: string; role: string };
  const where = user.role === "ADMIN" ? {} : { class: { memberships: { some: { userId: user.id } } } };
  const reservations = await prisma.reservation.findMany({
    where, include: { room: { include: { floor: { include: { building: true } } } }, class: true, createdBy: { select: { id: true, fullName: true } } },
    orderBy: { startAt: "asc" }
  });
  res.json(reservations);
});

reservationsRouter.get("/:id", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };
  const reservation = await prisma.reservation.findFirst({
    where: { id: req.params.id, ...(user.role === "ADMIN" ? {} : { class: { memberships: { some: { userId: user.id } } } }) },
    include: { room: { include: { floor: { include: { building: true } } } }, class: true, createdBy: { select: { id: true, fullName: true } } }
  });
  if (!reservation) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Reservation not found." } });
  res.json(reservation);
});

reservationsRouter.post("/:id/cancel", requireRepresentative, async (req, res) => {
  const user = res.locals.user as { id: string; role: string };
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
  if (!reservation) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Reservation not found." } });
  if (user.role !== "ADMIN") {
    const membership = await prisma.classMembership.findUnique({ where: { userId_classId: { userId: user.id, classId: reservation.classId } } });
    if (!membership?.isRep || reservation.createdById !== user.id) return res.status(403).json({ error: { code: "FORBIDDEN", message: "You may cancel only your own reservations for your assigned class." } });
  }
  if (reservation.startAt <= new Date()) return res.status(400).json({ error: { code: "TOO_LATE", message: "Only future reservations can be cancelled." } });
  const updated = await prisma.reservation.update({ where: { id: reservation.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  res.json(updated);
});

reservationsRouter.post("/", requireRepresentative, async (req, res) => {
  return res.status(400).json({ error: { code: "USE_QUEUE", message: "Add a proposal to the booking queue, then confirm it." } });
});
