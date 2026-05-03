"use client";

import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "../components/ThemeRegistry";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeRegistry>{children}</ThemeRegistry>
    </SessionProvider>
  );
}
