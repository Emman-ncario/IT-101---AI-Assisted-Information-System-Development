import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export const notFound = (_req: Request, res: Response) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found." } });

export const errorHandler: ErrorRequestHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2002" || err.code === "P2004")) {
    return res.status(409).json({ error: { code: "CONFLICT", message: "This action conflicts with existing data or a reservation." } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
};
