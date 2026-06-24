import { db } from "@/lib/db";

type SecurityLogParams = {
  userId?: string | null;
  userName?: string | null;
  section: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

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
}: SecurityLogParams) {
  try {
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
    console.error("CREATE SECURITY LOG ERROR:", error);
  }
}