import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

import {
  logLogin,
  logFailedLogin,
} from "@/lib/securityLogEvents";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").toLowerCase().trim();
    const success = Boolean(body.success);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email" },
        { status: 400 }
      );
    }

    if (!success) {
      await logFailedLogin(req, email);

      return NextResponse.json({
        ok: true,
        message: "Failed login logged",
      });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    await logLogin(req, dbUser);

    return NextResponse.json({
      ok: true,
      message: "Login logged",
    });
  } catch (error) {
    console.error("SECURITY LOGIN LOG ERROR:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to log login activity" },
      { status: 500 }
    );
  }
}