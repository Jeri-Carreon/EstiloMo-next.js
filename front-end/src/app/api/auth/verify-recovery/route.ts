// front-end/src/app/api/auth/verify-recovery/route.ts
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { token_hash, type } = await req.json();

  if (!token_hash || type !== "recovery") {
    return Response.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: "recovery",
  });

  if (error) {
    console.error("Recovery verification error:", error.message);
    return Response.json({ ok: false }, { status: 400 });
  }

  return Response.json({ ok: true });
}