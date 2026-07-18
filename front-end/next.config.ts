import type { NextConfig } from "next";

process.env.TZ = "Asia/Manila";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";

const supabaseImageSource = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseConnectSources = supabaseHost
  ? `https://${supabaseHost} wss://${supabaseHost}`
  : "";

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: ${supabaseImageSource};
  font-src 'self';
  connect-src 'self' ${supabaseConnectSources};
  frame-ancestors 'none';
`.replace(/\s{2,}/g, " ").trim();

const strictTransportSecurityHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
};

const contentTypeOptionsHeader = {
  key: "X-Content-Type-Options",
  value: "nosniff",
};

const securityHeaders = [
  strictTransportSecurityHeader,
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  contentTypeOptionsHeader,
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [strictTransportSecurityHeader, contentTypeOptionsHeader],
      },
      {
        source: "/((?!api/).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
