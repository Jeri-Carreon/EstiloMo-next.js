import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export interface DormantAppointmentCleanupResult {
  processed: number;
  rejectedAppointments: number;
  cancelledSales: number;
  rejectedPayments: number;
  appointments: { id: string; appointmentCode: string; saleId: string }[];
  issues: { appointmentId: string; saleId: string | null; reason: string }[];
}

/** Server-side reconciliation using the deadline captured when booking began. */
export async function cleanupDormantAppointments(
  client: Pick<typeof db, "$transaction"> = db
): Promise<DormantAppointmentCleanupResult> {
  const now = new Date();

  for (let attempt = 0; ; attempt++) {
    try {
      return await client.$transaction(async (tx) => {
        const result: DormantAppointmentCleanupResult = {
          processed: 0,
          rejectedAppointments: 0,
          cancelledSales: 0,
          rejectedPayments: 0,
          appointments: [],
          issues: [],
        };
        const candidates = await tx.appointment.findMany({
          where: {
            source: "BOOKING",
            status: { in: ["PENDING", "REJECTED"] },
            OR: [
              { sale: { is: { checkoutExpiresAt: { lte: now } } } },
              { status: "PENDING", sale: { is: null } },
              { status: "PENDING", sale: { is: { checkoutExpiresAt: null } } },
            ],
          },
          select: {
            id: true,
            saleId: true,
            sale: {
              select: {
                id: true,
                source: true,
                status: true,
                downPaymentStatus: true,
                checkoutExpiresAt: true,
                cancelReason: true,
                payment: { select: { status: true } },
                appointments: {
                  select: { id: true, appointmentCode: true, status: true, source: true },
                },
              },
            },
          },
        });
        const visitedSales = new Set<string>();

        for (const candidate of candidates) {
          const sale = candidate.sale;
          const report = (reason: string) => result.issues.push({
            appointmentId: candidate.id,
            saleId: candidate.saleId,
            reason,
          });

          // saleId and sale are optional in the schema. Do not fabricate a sale.
          if (!sale) {
            report(candidate.saleId ? "Associated Sale is missing" : "Appointment has no Sale");
            continue;
          }
          if (visitedSales.has(sale.id)) continue;
          visitedSales.add(sale.id);

          if (sale.status === "CANCELLED" && sale.appointments.every((a) => a.status === "REJECTED")) {
            continue;
          }
          if (!sale.checkoutExpiresAt) {
            report("Missing checkoutExpiresAt; dormancy cannot be determined safely");
            continue;
          }
          if (
            sale.source !== "BOOKING" ||
            !["PENDING", "CANCELLED"].includes(sale.status) ||
            !["PENDING", "FAILED", "EXPIRED", "CANCELLED"].includes(sale.downPaymentStatus) ||
            (sale.payment && !["PENDING", "REJECTED"].includes(sale.payment.status)) ||
            sale.appointments.some((a) =>
              a.source !== "BOOKING" || !["PENDING", "REJECTED"].includes(a.status)
            )
          ) {
            report("Sale has payment evidence or conflicting statuses; manual reconciliation required");
            continue;
          }

          // Reconcile the entire booking, including all appointments sharing a Sale.
          const appointments = await tx.appointment.updateMany({
            where: { saleId: sale.id, status: "PENDING", source: "BOOKING" },
            data: { status: "REJECTED" },
          });
          const sales = await tx.sale.updateMany({
            where: { id: sale.id, status: "PENDING" },
            data: {
              status: "CANCELLED",
              downPaymentStatus: "EXPIRED",
              cancelReason: sale.cancelReason ?? "Booking checkout expired",
            },
          });
          const payments = await tx.payment.updateMany({
            where: { saleId: sale.id, status: "PENDING" },
            data: { status: "REJECTED" },
          });

          result.processed += sale.appointments.length;
          result.rejectedAppointments += appointments.count;
          result.cancelledSales += sales.count;
          result.rejectedPayments += payments.count;
          result.appointments.push(...sale.appointments.map((a) => ({
            id: a.id, appointmentCode: a.appointmentCode, saleId: sale.id,
          })));
        }

        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      // Re-read state if a payment or another cleanup commits concurrently.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) {
        continue;
      }
      throw error;
    }
  }
}
