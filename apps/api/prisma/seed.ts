import { PrismaClient, UserRole } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash("DemoPass!234", {
    type: argon2.argon2id,
  });

  const [repA, studentA, repB, studentB] = await Promise.all([
    prisma.user.upsert({
      where: { email: "rep.it1a@example.test" },
      update: {
        passwordHash,
        role: UserRole.REPRESENTATIVE,
      },
      create: {
        fullName: "Alex Representative",
        email: "rep.it1a@example.test",
        passwordHash,
        role: UserRole.REPRESENTATIVE,
      },
    }),

    prisma.user.upsert({
      where: { email: "student.it1a@example.test" },
      update: {
        passwordHash,
        role: UserRole.STUDENT,
      },
      create: {
        fullName: "Sam Student",
        email: "student.it1a@example.test",
        passwordHash,
        role: UserRole.STUDENT,
      },
    }),

    prisma.user.upsert({
      where: { email: "rep.it1b@example.test" },
      update: {
        passwordHash,
        role: UserRole.REPRESENTATIVE,
      },
      create: {
        fullName: "Taylor Representative",
        email: "rep.it1b@example.test",
        passwordHash,
        role: UserRole.REPRESENTATIVE,
      },
    }),

    prisma.user.upsert({
      where: { email: "student.it1b@example.test" },
      update: {
        passwordHash,
        role: UserRole.STUDENT,
      },
      create: {
        fullName: "Jordan Student",
        email: "student.it1b@example.test",
        passwordHash,
        role: UserRole.STUDENT,
      },
    }),
  ]);

  const classA = await prisma.class.upsert({
    where: { block: "BSIT-1A" },
    update: {},
    create: {
      block: "BSIT-1A",
      program: "BS Information Technology",
      yearLevel: 1,
    },
  });

  const classB = await prisma.class.upsert({
    where: { block: "BSIT-1B" },
    update: {},
    create: {
      block: "BSIT-1B",
      program: "BS Information Technology",
      yearLevel: 1,
    },
  });

  for (const [user, cls, isRep] of [
    [repA, classA, true],
    [studentA, classA, false],
    [repB, classB, true],
    [studentB, classB, false],
  ] as const) {
    await prisma.classMembership.upsert({
      where: {
        userId_classId: {
          userId: user.id,
          classId: cls.id,
        },
      },
      update: { isRep },
      create: {
        userId: user.id,
        classId: cls.id,
        isRep,
      },
    });
  }

  await prisma.class.update({
    where: { id: classA.id },
    data: {
      representatives: {
        connect: { id: repA.id },
      },
    },
  });

  await prisma.class.update({
    where: { id: classB.id },
    data: {
      representatives: {
        connect: { id: repB.id },
      },
    },
  });

  const building = await prisma.building.upsert({
    where: { code: "SCI" },
    update: {},
    create: {
      code: "SCI",
      name: "Science and Technology Building",
      description:
        "Sample academic building with general classrooms and computer labs.",
    },
  });

  for (const floorNumber of [1, 2, 3]) {
    const floor = await prisma.floor.upsert({
      where: {
        buildingId_number: {
          buildingId: building.id,
          number: floorNumber,
        },
      },
      update: {},
      create: {
        buildingId: building.id,
        number: floorNumber,
      },
    });

    for (let i = 1; i <= 3; i++) {
      const number = `${floorNumber}0${i}`;

      await prisma.room.upsert({
        where: {
          floorId_number: {
            floorId: floor.id,
            number,
          },
        },
        update: {},
        create: {
          number,
          name: `Classroom ${number}`,
          capacity: 40,
          roomType: "Classroom",
          facilities: [
            "Projector",
            "Whiteboard",
            "Air conditioning",
          ],
          floor: {
            connect: { id: floor.id },
          },
        },
      });
    }
  }

  console.log("Seed complete. Development-only password: DemoPass!234");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });