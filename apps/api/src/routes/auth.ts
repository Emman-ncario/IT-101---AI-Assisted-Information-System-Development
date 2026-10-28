import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });

authRouter.get("/csrf", (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomUUID();
  res.json({ csrfToken: req.session.csrfToken });
});
authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Enter a valid email and password." } });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    const valid = user ? await argon2.verify(user.passwordHash, parsed.data.password).catch(() => false) : false;
    if (!user || !valid) return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
    await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.userId = user.id;
    req.session.csrfToken = randomUUID();
    const memberships = await prisma.classMembership.findMany({ where: { userId: user.id }, include: { class: true } });
    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, memberships }, csrfToken: req.session.csrfToken });
  } catch (err) { next(err); }
});
authRouter.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: { code: "LOGOUT_FAILED", message: "Unable to end session." } });
    res.clearCookie("room.sid");
    res.status(204).end();
  });
});
authRouter.get("/me", requireAuth, async (_req, res) => res.json({ user: res.locals.user }));
