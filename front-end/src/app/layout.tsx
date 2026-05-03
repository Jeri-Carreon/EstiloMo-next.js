import type { Metadata } from "next";
import ThemeRegistry from "../components/ThemeRegistry";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "The Barbs Bro",
  description: "Professional barbershop services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ThemeRegistry>{children}</ThemeRegistry>
        </Providers>
      </body>
    </html>
  );
}
