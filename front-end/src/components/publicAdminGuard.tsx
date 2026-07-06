"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PublicAdminLogoutGuard() {
  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const res = await fetch("/api/user/role", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();

      if (["OWNER", "RECEPTIONIST", "BARBER"].includes(data.role)) {
        await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
        await supabase.auth.signOut().catch(() => null);
        window.location.href = "/login";
      }
    };

    checkRole();
  }, []);

  return null;
}