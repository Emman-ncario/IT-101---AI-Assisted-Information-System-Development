import { prisma } from "./lib/prisma.js";

async function main() {
  const details = await prisma.$queryRaw`
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      datetime_precision,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session'
    ORDER BY ordinal_position
  `;

  const constraints = await prisma.$queryRaw`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'session'
  `;

  console.log("COLUMN DETAILS:");
  console.log(details);

  console.log("CONSTRAINTS:");
  console.log(constraints);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });