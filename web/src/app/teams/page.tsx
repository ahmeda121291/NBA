import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllTeamsWithFullStats } from "@/lib/db/queries";
import { TeamsTable } from "./teams-table";
import { CURRENT_SEASON } from "@/lib/constants";

export const metadata: Metadata = {
  title: "NBA Team Rankings & Analytics | CourtVision AI",
  description:
    "Team power rankings with proprietary TSC scores, defensive ratings, and performance trends.",
  openGraph: {
    title: "NBA Team Rankings & Analytics | CourtVision AI",
    description:
      "Team power rankings with proprietary TSC scores, defensive ratings, and performance trends.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/teams",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NBA Team Rankings & Analytics | CourtVision AI",
    description:
      "Team power rankings with proprietary TSC scores, defensive ratings, and performance trends.",
  },
};

export default async function TeamsPage() {
  const teams = (await getAllTeamsWithFullStats()) as any[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Teams</h1>
        <p className="text-sm text-text-muted mt-1">
          All 30 NBA teams — CourtVision metrics + traditional stats — {CURRENT_SEASON} season
        </p>
      </div>
      <Suspense>
        <TeamsTable teams={teams} />
      </Suspense>
    </div>
  );
}
