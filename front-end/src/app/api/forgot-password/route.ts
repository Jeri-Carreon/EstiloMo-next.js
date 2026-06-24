import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    console.error("Password reset error:", error.message);
  }

  // Always return ok to not reveal if account exists
  return Response.json({ ok: true });
}