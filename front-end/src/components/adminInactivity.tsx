"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 30 * 60 * 1000;

export default function AdminInactivityLogout() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const logout = async () => {
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
      await supabase.auth.signOut().catch(() => null);
      router.replace("/login");
    };

    const logoutOnClose = () => {
      navigator.sendBeacon("/api/auth/signout");
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    window.addEventListener("pagehide", logoutOnClose);

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      window.removeEventListener("pagehide", logoutOnClose);
    };
  }, [router]);

  return null;
}