import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, fullName: true, email: true, role: true, memberships: { include: { class: true } } }
    });
    if (!user) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Session is no longer valid." } });
    }
    res.locals.user = user;
    next();
  } catch (error) { next(error); }
}

export function requireRepresentative(req: Request, res: Response, next: NextFunction) {
  const user = res.locals.user as { role?: string } | undefined;
  if (!user || !["REPRESENTATIVE", "ADMIN"].includes(user.role ?? "")) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "A class representative account is required." } });
  }
  next();
}
