import dotenv from "dotenv";
import { spawnSync } from "node:child_process";

dotenv.config({ path: "apps/api/.env" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL was not found.");
  process.exit(1);
}

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.delete("schema");

const result = spawnSync(
  "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
  [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    "../IT-101-Capstone-Backup-2026-11-06/room-for-more-db-before-schedules-20261107.dump",
    "--dbname",
    databaseUrl.toString()
  ],
  { stdio: "inherit" }
);

if (result.error) {
  console.error("Backup failed:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
