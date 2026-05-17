import { PrismaClient } from "@prisma/client";

console.log("SEED SCRIPT IS RUNNING");

const db = new PrismaClient();

const counters = [
  { id: "userCode", value: 0 },
  { id: "customerCode", value: 0 },
  { id: "serviceCode", value: 0 },
  { id: "appointmentCode", value: 0 },
  { id: "barberCode", value: 0 },
];

async function main() {
  for (const counter of counters) {
    await db.counter.upsert({
      where: { id: counter.id },
      update: {}, // don't overwrite existing values
      create: counter,
    });
  }

  console.log("All counters seeded successfully");
}

main()
  .then(async () => {
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Seed error:", e);
    await db.$disconnect();
    process.exit(1);
  });