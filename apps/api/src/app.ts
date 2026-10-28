import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { buildingsRouter } from "./routes/buildings.js";
import { reservationsRouter } from "./routes/reservations.js";
import { queueRouter } from "./routes/queue.js";
import { classesRouter } from "./routes/classes.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const app = express();
const PgSession = connectPgSimple(session);
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

app.disable("x-powered-by");
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "X-CSRF-Token"] }));
app.use(express.json({ limit: "100kb" }));
app.use(session({
  name: "room.sid",
  store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 }
}));

app.use((req, res, next) => {
  if (["POST", "PATCH", "DELETE", "PUT"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && origin !== env.FRONTEND_ORIGIN) return res.status(403).json({ error: { code: "BAD_ORIGIN", message: "Request origin is not allowed." } });
    if (req.path === "/api/auth/login") return next();
    if (!req.session.userId || !req.session.csrfToken || req.get("x-csrf-token") !== req.session.csrfToken) {
      return res.status(403).json({ error: { code: "CSRF_INVALID", message: "Refresh the page and retry the request." } });
    }
  }
  next();
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }), authRouter);
app.use("/api/buildings", buildingsRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/booking-queue", queueRouter);
app.use("/api/classes", classesRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
