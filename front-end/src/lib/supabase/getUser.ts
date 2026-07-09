import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function getAdminUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) return null;

  const normalizedEmail = user.email?.toLowerCase().trim();

  const dbUser = await db.user.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  return dbUser;
}
