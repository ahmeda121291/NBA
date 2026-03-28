import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllPlayersWithFullStats } from "@/lib/db/queries";
import { PlayersTable } from "./players-table";
import { CURRENT_SEASON } from "@/lib/constants";

export const metadata: Metadata = {
  title: "NBA Player Analytics & BIS Scores | CourtVision AI",
  description:
    "Comprehensive player ratings with BIS impact scores, defensive metrics, form tracking, and scouting reports.",
  openGraph: {
    title: "NBA Player Analytics & BIS Scores | CourtVision AI",
    description:
      "Comprehensive player ratings with BIS impact scores, defensive metrics, form tracking, and scouting reports.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/players",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NBA Player Analytics & BIS Scores | CourtVision AI",
    description:
      "Comprehensive player ratings with BIS impact scores, defensive metrics, form tracking, and scouting reports.",
  },
};

export default async function PlayersPage() {
  const players = (await getAllPlayersWithFullStats(200)) as any[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Players</h1>
        <p className="text-sm text-text-muted mt-1">
          All players — CourtVision metrics + traditional stats — {CURRENT_SEASON} season
        </p>
      </div>
      <Suspense>
        <PlayersTable players={players} />
      </Suspense>
    </div>
  );
}
