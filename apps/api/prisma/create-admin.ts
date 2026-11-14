
import { password as passwordPrompt } from "@inquirer/prompts";
import "../src/config.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (adminCount > 0) {
    console.log("An Administrator account already exists.");
    console.log("No new account was created.");
    return;
  }

  const terminal = createInterface({ input: stdin, output: stdout });

  try {
    console.log("\n=== Room for More? Admin Setup ===\n");

    const fullName = (await terminal.question("Full name: ")).trim();

    const email = (await terminal.question("Email address: "))
      .trim()
      .toLowerCase();

    if (fullName.length < 2 || fullName.length > 100) {
      throw new Error("Full name must contain 2–100 characters.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    const existingAccount = await prisma.user.findUnique({
      where: { email },
      select: { fullName: true, role: true },
    });

    if (existingAccount) {
      console.log("\nThis email already belongs to an account.");
      console.log(`Name: ${existingAccount.fullName}`);
      console.log(`Role: ${existingAccount.role}`);
      console.log("No account was created or modified.");
      return;
    }

    terminal.close();

    const password = await passwordPrompt({
      message: "Enter your Administrator password (minimum 12 characters):",
    });

    if (password.length < 12) {
      throw new Error("Password must contain at least 12 characters.");
    }

    const passwordHash = await argon2.hash(password);

    const admin = await prisma.$transaction(async (tx) => {
      // Prevent two setup commands from creating the first Admin together.
      await tx.$queryRaw`
        SELECT 1 AS lock_acquired
        FROM (SELECT pg_advisory_xact_lock(72110607, 1)) AS lock_result
      `;

      const existingAdmin = await tx.user.count({
        where: { role: "ADMIN" },
      });

      if (existingAdmin > 0) {
        throw new Error("An Administrator account already exists.");
      }

      return tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          role: "ADMIN",
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      });
    });

    console.log("\nAdministrator account created successfully!");
    console.log(`Name: ${admin.fullName}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
  } finally {
    terminal.close();
  }
}

main()
  .catch((error) => {
    console.error("\nAdmin setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
