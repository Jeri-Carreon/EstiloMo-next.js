import type { Metadata } from "next";
import Providers from "./providers";
import { Nunito_Sans } from "next/font/google";
import { headers } from "next/headers";
import { connection } from "next/server";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  title: "EstiloMo",
  description: "Professional barbershop services",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <body
        className={`${nunitoSans.className} ${nunitoSans.variable}`}
        suppressHydrationWarning
      >
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
