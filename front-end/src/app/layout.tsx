import type { Metadata } from "next";
import ThemeRegistry from "../components/ThemeRegistry";
import Providers from "./providers";
import { Nunito_Sans } from 'next/font/google';

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-nunito-sans',
});

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
      <body className={`${nunitoSans.className} ${nunitoSans.variable}`}>
        <Providers>
          <ThemeRegistry>{children}</ThemeRegistry>
        </Providers>
      </body>
    </html>
  );
}