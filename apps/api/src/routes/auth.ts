import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import { randomUUID, createHmac } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../config.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
  role: z.enum(["STUDENT", "REPRESENTATIVE"]),
  classId: z.string().min(1),
  inviteCode: z.string().trim().min(1).max(100).optional(),
});

// Use the same hashing method as the Admin invitation-code generator.
function hashInvitationCode(code: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(code).digest("hex");
}

authRouter.get("/csrf", (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = randomUUID();
  res.json({ csrfToken: req.session.csrfToken });
});

// Get available classes for registration.
authRouter.get("/classes", async (_req, res, next) => {
  try {
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        block: true,
        program: true,
        yearLevel: true,
      },
      orderBy: { block: "asc" },
    });

    res.json(classes);
  } catch (err) {
    next(err);
  }
});

// Register a Student or Representative.
authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check your registration details.",
        },
      });
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();

    // Representatives must provide a class invitation code.
    if (data.role === "REPRESENTATIVE" && !data.inviteCode) {
      return res.status(400).json({
        error: {
          code: "INVITATION_CODE_REQUIRED",
          message: "A class invitation code is required.",
        },
      });
    }

    const passwordHash = await argon2.hash(data.password);
    const codeHash = data.inviteCode
      ? hashInvitationCode(data.inviteCode)
      : null;

    const result = await prisma.$transaction(
      async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return {
            error: {
              status: 409,
              code: "EMAIL_EXISTS",
              message: "An account with this email already exists.",
            },
          };
        }

        const classExists = await tx.class.findUnique({
          where: { id: data.classId },
        });

        if (!classExists) {
          return {
            error: {
              status: 400,
              code: "INVALID_CLASS",
              message: "Please select a valid class.",
            },
          };
        }

        if (data.role === "REPRESENTATIVE" && codeHash) {
          const invitation = await tx.classInvitationCode.findUnique({
            where: { codeHash },
          });

          if (
            !invitation ||
            !invitation.active ||
            invitation.classId !== data.classId ||
            invitation.usedCount >= invitation.maxUses ||
            (invitation.expiresAt !== null &&
              invitation.expiresAt <= new Date())
          ) {
            return {
              error: {
                status: 403,
                code: "INVALID_INVITE_CODE",
                message:
                  "The invitation code is invalid, expired, inactive, or does not belong to the selected class.",
              },
            };
          }

          // Count representatives already registered in this class.
          const representativeCount = await tx.classMembership.count({
            where: {
              classId: data.classId,
              isRep: true,
            },
          });

          if (representativeCount >= 2) {
            return {
              error: {
                status: 409,
                code: "CLASS_REPRESENTATIVES_FULL",
                message:
                  "This class already has two registered representatives.",
              },
            };
          }

          // Reserve one use of the invitation code.
          const updatedInvitation = await tx.classInvitationCode.updateMany({
            where: {
              id: invitation.id,
              active: true,
              usedCount: {
                lt: invitation.maxUses,
              },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });

          if (updatedInvitation.count === 0) {
            return {
              error: {
                status: 403,
                code: "INVALID_INVITE_CODE",
                message: "This invitation code is no longer available.",
              },
            };
          }
        }

        // Create the account and its class membership.
        const user = await tx.user.create({
          data: {
            fullName: data.fullName,
            email,
            passwordHash,
            role: data.role,
            memberships: {
              create: {
                classId: data.classId,
                isRep: data.role === "REPRESENTATIVE",
              },
            },
          },
        });

        return { user };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    if (result.error !== undefined) {
      return res.status(result.error.status).json({
        error: {
          code: result.error.code,
          message: result.error.message,
        },
      });
    }

    const user = result.user;

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.userId = user.id;
    req.session.csrfToken = randomUUID();

    const memberships = await prisma.classMembership.findMany({
      where: { userId: user.id },
      include: { class: true },
    });

    res.status(201).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        memberships,
      },
      csrfToken: req.session.csrfToken,
    });
  } catch (err) {
    // A concurrent registration may cause a serializable transaction conflict.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2034"
    ) {
      return res.status(409).json({
        error: {
          code: "REGISTRATION_CONFLICT",
          message:
            "Another registration was processed at the same time. Please try again.",
        },
      });
    }

    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Enter a valid email and password.",
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    const valid = user
      ? await argon2
          .verify(user.passwordHash, parsed.data.password)
          .catch(() => false)
      : false;

    if (!user || !valid) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        },
      });
    }

    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );

    req.session.userId = user.id;
    req.session.csrfToken = randomUUID();

    const memberships = await prisma.classMembership.findMany({
      where: { userId: user.id },
      include: { class: true },
    });

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        memberships,
      },
      csrfToken: req.session.csrfToken,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: {
          code: "LOGOUT_FAILED",
          message: "Unable to end session.",
        },
      });
    }

    res.clearCookie("room.sid");
    res.status(204).end();
  });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  res.json({ user: res.locals.user });
});
