import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireRepresentative,
} from "../middleware/auth.js";

export const classesRouter = Router();

classesRouter.use(requireAuth);

// Get all classes accessible to the current user
classesRouter.get("/", async (_req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const where =
    user.role === "ADMIN"
      ? {}
      : {
          memberships: {
            some: {
              userId: user.id,
            },
          },
        };

  const classes = await prisma.class.findMany({
    where,
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      },
      representatives: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      reservations: {
        where: {
          status: "CONFIRMED",
          endAt: { gt: new Date() },
        },
        orderBy: {
          startAt: "asc",
        },
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
          createdBy: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: {
      block: "asc",
    },
  });

  res.json(classes);
});

// Get one class
classesRouter.get("/:id", async (req, res) => {
  const user = res.locals.user as { id: string; role: string };

  const cls = await prisma.class.findFirst
});