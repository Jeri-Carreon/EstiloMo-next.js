import test from "node:test";
import assert from "node:assert/strict";

import { getAppOriginFromRequest } from "./appOrigin";

test("prefers forwarded host and protocol over loopback defaults", () => {
  const request = {
    headers: new Headers({
      host: "0.0.0.0:3000",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "estilomo.codeegoh.com",
    }),
    nextUrl: { protocol: "http:" },
  } as any;

  assert.equal(getAppOriginFromRequest(request), "https://estilomo.codeegoh.com");
});

test("falls back to the configured app URL when no forwarded headers are present", () => {
  const request = {
    headers: new Headers({ host: "0.0.0.0:3000" }),
    nextUrl: { protocol: "http:" },
  } as any;

  const originalAppUrl = process.env.APP_URL;
  process.env.APP_URL = "https://example.com";

  try {
    assert.equal(getAppOriginFromRequest(request), "https://example.com");
  } finally {
    if (originalAppUrl === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalAppUrl;
    }
  }
});
