import { Suspense } from "react";
import { getAllTeamsWithFullStats } from "@/lib/db/queries";
import { TeamsTable } from "./teams-table";
import { CURRENT_SEASON } from "@/lib/constants";

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
