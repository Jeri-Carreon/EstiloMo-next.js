"use client";

import ThemeRegistry from "../components/ThemeRegistry";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
      <ThemeRegistry>{children}</ThemeRegistry>
  );
}
