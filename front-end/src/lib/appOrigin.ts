import type { NextRequest } from "next/server";

export function getAppOriginFromRequest(req: Pick<NextRequest, "headers" | "nextUrl">): string {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = req.headers.get("host")?.split(",")[0]?.trim();

  const protocol = `${(forwardedProto || req.nextUrl?.protocol || "https").replace(/:$/, "")}:`;
  const originHost = forwardedHost || host || "localhost";
  const configuredAppUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!originHost) {
    return configuredAppUrl;
  }

  if (originHost.includes(":") && !originHost.startsWith("[")) {
    const [hostname] = originHost.split(":");
    if (hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "::1") {
      return configuredAppUrl;
    }

    return `${protocol}//${originHost}`.replace(/\/$/, "");
  }

  return `${protocol}//${originHost}`.replace(/\/$/, "");
}
