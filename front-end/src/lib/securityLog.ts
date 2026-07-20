import { db } from "@/lib/db";
import { randomUUID } from "crypto";

type SecurityLogParams = {
  userId?: string | null;
  userName?: string | null;
  section: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

let securityLogMetadataColumnPromise: Promise<boolean> | null = null;

async function hasSecurityLogMetadataColumn() {
  if (!securityLogMetadataColumnPromise) {
    securityLogMetadataColumnPromise = db
      .$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'SecurityLog'
          AND column_name = 'metadata'
      `
      .then((rows) => rows.length > 0)
      .catch((error) => {
        securityLogMetadataColumnPromise = null;
        throw error;
      });
  }

  return securityLogMetadataColumnPromise;
}

export function getRequestMeta(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || realIp || "Unknown",
    userAgent: req.headers.get("user-agent") || "Unknown",
  };
}

export async function createSecurityLog({
  userId,
  userName,
  section,
  action,
  ipAddress,
  userAgent,
  metadata,
}: SecurityLogParams) {
  try {
    const metadataJson =
      metadata === undefined || metadata === null ? null : JSON.stringify(metadata);

    if (metadataJson && (await hasSecurityLogMetadataColumn())) {
      await db.$executeRaw`
        INSERT INTO "SecurityLog" (
          "id",
          "userId",
          "userName",
          "section",
          "action",
          "ipAddress",
          "userAgent",
          "metadata",
          "createdAt"
        )
        VALUES (
          ${randomUUID()},
          ${userId ?? null},
          ${userName ?? "Unknown"},
          ${section},
          ${action},
          ${ipAddress ?? "Unknown"},
          ${userAgent ?? "Unknown"},
          ${metadataJson}::jsonb,
          NOW()
        )
      `;
      return;
    }

    await db.securityLog.create({
      data: {
        userId: userId ?? null,
        userName: userName ?? "Unknown",
        section,
        action,
        ipAddress: ipAddress ?? "Unknown",
        userAgent: userAgent ?? "Unknown",
      },
    });
  } catch (error) {
    try {
      await db.$executeRaw`
        INSERT INTO "SecurityLog" (
          "id",
          "userId",
          "userName",
          "section",
          "action",
          "ipAddress",
          "userAgent",
          "createdAt"
        )
        VALUES (
          ${randomUUID()},
          ${userId ?? null},
          ${userName ?? "Unknown"},
          ${section},
          ${action},
          ${ipAddress ?? "Unknown"},
          ${userAgent ?? "Unknown"},
          NOW()
        )
      `;
    } catch (fallbackError) {
      console.error("CREATE SECURITY LOG ERROR:", error, fallbackError);
    }
  }
}
