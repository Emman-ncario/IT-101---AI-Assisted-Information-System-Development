import { env } from "./config.js";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => console.log(`Room Reservation API listening on http://localhost:${env.PORT}`));
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
