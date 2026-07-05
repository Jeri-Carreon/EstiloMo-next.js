import type { NextRequest } from "next/server";

export function getAppOriginFromRequest(req: Pick<NextRequest, "headers" | "nextUrl">): string {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = req.headers.get("host")?.split(",")[0]?.trim();

  const protocol = `${(forwardedProto || req.nextUrl?.protocol || "https").replace(/:$/, "")}:`;
  const originHost = forwardedHost || host || "localhost";

  if (!originHost) {
    return (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://estilomo.codeegoh.com"
    ).replace(/\/$/, "");
  }

  if (originHost.includes(":") && !originHost.startsWith("[")) {
    const [hostname, port] = originHost.split(":");
    if (hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "::1") {
      return (
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://estilomo.codeegoh.com"
      ).replace(/\/$/, "");
    }

    return `${protocol}//${originHost}`.replace(/\/$/, "");
  }

  return `${protocol}//${originHost}`.replace(/\/$/, "");
}
