import { db } from "@/lib/db";
import { todayCodePH } from "@/lib/dateUtils";
import { Prisma } from "@prisma/client";

export type CodePrefix = "APT" | "TRX" | "PAY";
type DbClient = typeof db | Prisma.TransactionClient;

export async function createUniqueCode(
  prefix: CodePrefix,
  client: DbClient = db
) {
  const datePrefix = todayCodePH();
  const fullPrefix = `${prefix}-${datePrefix}`;

  let existingCodes = new Set<string>();

  if (prefix === "APT") {
    const rows = await client.appointment.findMany({
      where: {
        appointmentCode: {
          startsWith: `${fullPrefix}-`,
        },
      },
      select: {
        appointmentCode: true,
      },
    });

    existingCodes = new Set(rows.map((row) => row.appointmentCode));
  }

  if (prefix === "TRX") {
    const rows = await client.sale.findMany({
      where: {
        saleCode: {
          startsWith: `${fullPrefix}-`,
        },
      },
      select: {
        saleCode: true,
      },
    });

    existingCodes = new Set(rows.map((row) => row.saleCode));
  }

  if (prefix === "PAY") {
    const rows = await client.payment.findMany({
      where: {
        paymentCode: {
          startsWith: `${fullPrefix}-`,
        },
      },
      select: {
        paymentCode: true,
      },
    });

    existingCodes = new Set(
      rows
        .map((row) => row.paymentCode)
        .filter((code): code is string => Boolean(code))
    );
  }

  let nextNumber = existingCodes.size + 1;
  let candidate = `${fullPrefix}-${String(nextNumber).padStart(4, "0")}`;

  while (existingCodes.has(candidate)) {
    nextNumber += 1;
    candidate = `${fullPrefix}-${String(nextNumber).padStart(4, "0")}`;
  }

  return candidate;
}