import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.counter.upsert({
    where: { id: "customerCode" },
    update: {},
    create: {
      id: "customerCode",
      value: 0,
    },
  });

  console.log("Counter seeded");
}

main()
  .then(async () => {
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });