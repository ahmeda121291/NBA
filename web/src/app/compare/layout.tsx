import type { Metadata } from "next";
import { ProGate } from "@/components/shared/pro-gate";

export const metadata: Metadata = {
  title: "Player H2H Compare | CourtVision AI",
  description:
    "Head-to-head NBA player comparison with 6-metric battle system and AI-generated verdicts.",
  openGraph: {
    title: "Player H2H Compare | CourtVision AI",
    description:
      "Head-to-head NBA player comparison with 6-metric battle system and AI-generated verdicts.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/compare",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Player H2H Compare | CourtVision AI",
    description:
      "Head-to-head NBA player comparison with 6-metric battle system and AI-generated verdicts.",
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProGate feature="Player H2H Compare">
      {children}
    </ProGate>
  );
}
