import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { cleanupDormantAppointments } from "./cleanupDormantAppointments";
import { GET } from "../app/api/cron/cleanup-pending-bookings/route";

function fixture() {
  return {
    id: "sale-1",
    source: "BOOKING",
    status: "PENDING",
    downPaymentStatus: "PENDING",
    checkoutExpiresAt: new Date(0) as Date | null,
    cancelReason: null,
    payment: { saleId: "sale-1", status: "PENDING" },
    appointments: [1, 2].map((n) => ({
      id: `appointment-${n}`, appointmentCode: `APT-${n}`,
      saleId: "sale-1" as string | null, status: "PENDING", source: "BOOKING",
    })),
  };
}

type Row = Record<string, unknown>;

// Small in-memory Prisma substitute: evaluate the actual query predicates and
// restore all records if the transaction callback fails. No database is contacted.
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Row[]).some((item) => matches(row, item));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const filter = value as Row;
      if ("is" in filter) {
        return filter.is === null ? row[key] == null :
          row[key] != null && matches(row[key] as Row, filter.is as Row);
      }
      if ("in" in filter) return (filter.in as unknown[]).includes(row[key]);
      if ("lte" in filter) return row[key] instanceof Date &&
        (row[key] as Date).getTime() <= (filter.lte as Date).getTime();
    }
    return row[key] === value;
  });
}

test("cleanup preserves successful bookings, reconciles expired bookings, and handles failures", async (t) => {
  let sale = fixture();
  let orphan = false;
  let failSaleUpdate = false;
  let conflicts = 0;
  let attempts = 0;
  const client = { $transaction: (async (
    callback: (tx: unknown) => Promise<unknown>,
    options?: { isolationLevel?: string }
  ) => {
    attempts++;
    assert.equal(options?.isolationLevel, "Serializable");
    if (conflicts-- > 0) {
      throw new Prisma.PrismaClientKnownRequestError("Conflict", { code: "P2034", clientVersion: "6.19.3" });
    }
    const snapshot = structuredClone(sale);
    const update = (rows: Row[], where: Row, data: Row) => {
      const found = rows.filter((row) => matches(row, where));
      found.forEach((row) => Object.assign(row, data));
      return { count: found.length };
    };
    try {
      return await callback({
        appointment: {
          findMany: async ({ where }: { where: Row }) => sale.appointments
            .map((a) => ({ ...a, sale: orphan ? null : sale }))
            .filter((a) => matches(a, where)),
          updateMany: async ({ where, data }: { where: Row; data: Row }) => update(sale.appointments, where, data),
        },
        sale: {
          updateMany: async ({ where, data }: { where: Row; data: Row }) => {
            if (failSaleUpdate) throw new Error("Database unavailable");
            return update([sale], where, data);
          },
        },
        payment: {
          updateMany: async ({ where, data }: { where: Row; data: Row }) => update([sale.payment], where, data),
        },
      });
    } catch (error) {
      sale = snapshot;
      throw error;
    }
  }) as typeof db.$transaction };

  await t.test("expired checkout without a session rejects all appointments once", async () => {
    const result = await cleanupDormantAppointments(client);
    assert.equal(result.processed, 2);
    assert.equal(result.rejectedAppointments, 2);
    assert.equal(result.cancelledSales, 1);
    assert.equal(result.rejectedPayments, 1);
    assert.equal(sale.status, "CANCELLED");
    assert.equal(sale.downPaymentStatus, "EXPIRED");
    assert.ok(sale.appointments.every((a) => a.status === "REJECTED"));
    assert.equal((await cleanupDormantAppointments(client)).processed, 0);
  });

  await t.test("a live checkout remains pending", async () => {
    sale = fixture();
    sale.checkoutExpiresAt = new Date(Date.now() + 60_000);
    assert.equal((await cleanupDormantAppointments(client)).processed, 0);
    assert.equal(sale.status, "PENDING");
  });

  await t.test("scheduled/partial and completed/paid bookings are preserved", async () => {
    for (const [appointmentStatus, saleStatus] of [["SCHEDULED", "PARTIAL"], ["COMPLETED", "PAID"]]) {
      sale = fixture();
      sale.status = saleStatus;
      sale.appointments.forEach((a) => { a.status = appointmentStatus; });
      assert.equal((await cleanupDormantAppointments(client)).processed, 0);
      assert.equal(sale.status, saleStatus);
    }
  });

  await t.test("shared sales with scheduled appointments or paid evidence are reported", async () => {
    for (const kind of ["scheduled sibling", "paid sale", "paid downpayment", "paid payment", "unknown downpayment", "walkin"]) {
      sale = fixture();
      if (kind === "scheduled sibling") sale.appointments[1].status = "SCHEDULED";
      if (kind === "paid sale") sale.status = "PARTIAL";
      if (kind === "paid downpayment") sale.downPaymentStatus = "PAID";
      if (kind === "paid payment") sale.payment.status = "PARTIAL";
      if (kind === "unknown downpayment") sale.downPaymentStatus = "UNKNOWN";
      if (kind === "walkin") sale.source = "WALKIN";
      const result = await cleanupDormantAppointments(client);
      assert.equal(result.processed, 0, kind);
      assert.equal(result.issues.length, 1, kind);
      assert.equal(sale.appointments[0].status, "PENDING", kind);
    }
  });

  await t.test("partially reconciled records are repaired", async () => {
    sale = fixture();
    sale.status = "CANCELLED";
    assert.equal((await cleanupDormantAppointments(client)).rejectedAppointments, 2);
    sale = fixture();
    sale.appointments.forEach((a) => { a.status = "REJECTED"; });
    const result = await cleanupDormantAppointments(client);
    assert.equal(result.cancelledSales, 1);
    assert.equal(result.rejectedAppointments, 0);
  });

  await t.test("missing sale and deadline are reported without mutation", async () => {
    sale = fixture();
    orphan = true;
    assert.equal((await cleanupDormantAppointments(client)).issues.length, 2);
    orphan = false;
    sale.checkoutExpiresAt = null;
    const result = await cleanupDormantAppointments(client);
    assert.equal(result.issues.length, 1);
    assert.equal(result.processed, 0);
    assert.equal(sale.status, "PENDING");
  });

  await t.test("database failure rolls back appointment updates and propagates", async () => {
    sale = fixture();
    failSaleUpdate = true;
    await assert.rejects(() => cleanupDormantAppointments(client), /Database unavailable/);
    assert.ok(sale.appointments.every((a) => a.status === "PENDING"));
    assert.equal(sale.status, "PENDING");
    failSaleUpdate = false;
  });

  await t.test("serialization conflicts retry at most three times", async () => {
    sale = fixture();
    conflicts = 1;
    attempts = 0;
    assert.equal((await cleanupDormantAppointments(client)).cancelledSales, 1);
    assert.equal(attempts, 2);
    conflicts = 3;
    attempts = 0;
    await assert.rejects(() => cleanupDormantAppointments(client), { code: "P2034" });
    assert.equal(attempts, 3);
  });

  await t.test("cron fails closed when CRON_SECRET is missing", async () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const response = await GET(new Request("http://localhost/api/cron/cleanup-pending-bookings", {
        headers: { authorization: "Bearer undefined" },
      }));
      assert.equal(response.status, 401);
    } finally {
      if (previous !== undefined) process.env.CRON_SECRET = previous;
    }
  });
});
