"use client";

import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "../components/ThemeRegistry";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </SessionProvider>
      </body>
    </html>

  );
}