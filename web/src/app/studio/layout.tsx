import type { Metadata } from "next";
import { ProGate } from "@/components/shared/pro-gate";

export const metadata: Metadata = {
  title: "Studio | CourtVision AI",
  description:
    "Create shareable NBA analytics charts and visualizations.",
  openGraph: {
    title: "Studio | CourtVision AI",
    description:
      "Create shareable NBA analytics charts and visualizations.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio | CourtVision AI",
    description:
      "Create shareable NBA analytics charts and visualizations.",
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProGate feature="Studio">
      {children}
    </ProGate>
  );
}
