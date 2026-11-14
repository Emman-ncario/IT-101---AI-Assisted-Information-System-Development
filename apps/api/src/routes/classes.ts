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
classesRouter.get("/:id", async (req, res, next) => {
  try {
    const user = res.locals.user as { id: string; role: string };
    const classId = String(req.params.id);

    const cls = await prisma.class.findFirst({
      where: {
        id: classId,
        ...(user.role === "ADMIN"
          ? {}
          : {
              memberships: {
                some: { userId: user.id },
              },
            }),
      },
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
          orderBy: { startAt: "asc" },
          include: {
            room: {
              include: {
                floor: {
                  include: { building: true },
                },
              },
            },
            createdBy: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    if (!cls) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Class not found.",
        },
      });
    }

    res.json(cls);
  } catch (error) {
    next(error);
  }
});

// Add an existing student to a class
classesRouter.post(
  "/:id/members",
  requireRepresentative,
  async (req, res, next) => {
    try {
      const user = res.locals.user as {
        id: string;
        role: string;
      };

      const classId = String(req.params.id);

      const parsed = z.object({
        email: z.string().trim().email().max(254),
      }).safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Enter a valid student email address.",
          },
        });
      }

      const cls = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!cls) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Class not found.",
          },
        });
      }

      // Representatives may only manage their assigned class.
      if (user.role !== "ADMIN") {
        const representativeMembership =
          await prisma.classMembership.findUnique({
            where: {
              userId_classId: {
                userId: user.id,
                classId: cls.id,
              },
            },
          });

        if (!representativeMembership?.isRep) {
          return res.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "You are not a representative of this class.",
            },
          });
        }
      }

      const email = parsed.data.email.toLowerCase();

      const student = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          role: true,
        },
      });

      if (!student || student.role !== "STUDENT") {
        return res.status(404).json({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "No existing student account was found with that email.",
          },
        });
      }

      const existingMembership =
        await prisma.classMembership.findUnique({
          where: {
            userId_classId: {
              userId: student.id,
              classId: cls.id,
            },
          },
        });

      if (existingMembership) {
        return res.status(409).json({
          error: {
            code: "ALREADY_MEMBER",
            message: "This student is already a member of the class.",
          },
        });
      }

      const membership = await prisma.classMembership.create({
        data: {
          userId: student.id,
          classId: cls.id,
          isRep: false,
        },
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
      });

      res.status(201).json({ membership });
    } catch (error) {
      next(error);
    }
  }
);
