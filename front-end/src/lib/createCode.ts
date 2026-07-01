import { db } from "@/lib/db";
import { todayCodePH } from "@/lib/dateUtils";

export type CodePrefix = "APT" | "TRX" | "PAY";

export async function createUniqueCode(prefix: CodePrefix) {
  const datePrefix = todayCodePH();
  const fullPrefix = `${prefix}-${datePrefix}`;

  let existingCodes = new Set<string>();

  if (prefix === "APT") {
    const rows = await db.appointment.findMany({
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
    const rows = await db.sale.findMany({
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
    const rows = await db.payment.findMany({
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