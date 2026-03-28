import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { UserMenu } from "@/components/layout/user-menu";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CourtVision — NBA Intelligence Platform",
  description:
    "Advanced NBA analytics: player evaluation, team intelligence, game projections, and matchup analysis. Explanation-first basketball research.",
  openGraph: {
    title: "CourtVision — NBA Intelligence Platform",
    description:
      "Advanced NBA analytics: player evaluation, team intelligence, game projections, and matchup analysis. Explanation-first basketball research.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CourtVision — NBA Intelligence Platform",
    description:
      "Advanced NBA analytics: player evaluation, team intelligence, game projections, and matchup analysis. Explanation-first basketball research.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AppShell userMenu={<UserMenu />}>{children}</AppShell>
      </body>
    </html>
  );
}
