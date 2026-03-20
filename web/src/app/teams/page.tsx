const teamsData = [
  { id: 1, abbr: "BOS", name: "Celtics", city: "Boston", conf: "East", record: "42-20", netRtg: "+6.7", tsc: 78, ltfi: 68, color: "#007A33" },
  { id: 2, abbr: "OKC", name: "Thunder", city: "Oklahoma City", conf: "West", record: "44-18", netRtg: "+7.2", tsc: 81, ltfi: 71, color: "#007AC1" },
  { id: 3, abbr: "DEN", name: "Nuggets", city: "Denver", conf: "West", record: "40-22", netRtg: "+5.1", tsc: 74, ltfi: 60, color: "#0E2240" },
  { id: 4, abbr: "CLE", name: "Cavaliers", city: "Cleveland", conf: "East", record: "43-19", netRtg: "+6.9", tsc: 79, ltfi: 65, color: "#860038" },
  { id: 5, abbr: "NYK", name: "Knicks", city: "New York", conf: "East", record: "39-23", netRtg: "+4.3", tsc: 72, ltfi: 62, color: "#006BB6" },
  { id: 6, abbr: "PHX", name: "Suns", city: "Phoenix", conf: "West", record: "38-24", netRtg: "+3.8", tsc: 70, ltfi: 64, color: "#1D1160" },
  { id: 7, abbr: "MIN", name: "Timberwolves", city: "Minnesota", conf: "West", record: "38-24", netRtg: "+4.5", tsc: 73, ltfi: 58, color: "#0C2340" },
  { id: 8, abbr: "DAL", name: "Mavericks", city: "Dallas", conf: "West", record: "37-25", netRtg: "+3.2", tsc: 69, ltfi: 55, color: "#00538C" },
];

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <p className="text-sm text-text-secondary">
          All 30 NBA teams with composite metrics and live form
        </p>
      </div>

      <div className="flex gap-2">
        {["All", "East", "West"].map((filter) => (
          <button
            key={filter}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "All"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="p-4">Team</th>
              <th className="p-4">Record</th>
              <th className="p-4 text-right">Net Rtg</th>
              <th className="p-4 text-right">TSC</th>
              <th className="p-4 text-right">LTFI</th>
              <th className="p-4">Form</th>
            </tr>
          </thead>
          <tbody>
            {teamsData.map((team) => (
              <tr
                key={team.id}
                className="border-b border-border/50 transition-colors hover:bg-surface-hover"
              >
                <td className="p-4">
                  <a href={`/teams/${team.id}`} className="flex items-center gap-3 hover:text-accent">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.abbr}
                    </div>
                    <div>
                      <p className="font-medium">{team.city} {team.name}</p>
                      <p className="text-xs text-text-muted">{team.conf}ern Conference</p>
                    </div>
                  </a>
                </td>
                <td className="p-4 font-stat">{team.record}</td>
                <td className="p-4 text-right font-stat">
                  <span className={parseFloat(team.netRtg) > 0 ? "text-emerald-400" : "text-rose-400"}>
                    {team.netRtg}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className={`font-stat font-bold ${
                    team.tsc >= 75 ? "text-emerald-400" : team.tsc >= 60 ? "text-blue-400" : "text-amber-400"
                  }`}>
                    {team.tsc}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className={`font-stat font-bold ${
                    team.ltfi >= 65 ? "text-emerald-400" : team.ltfi >= 50 ? "text-blue-400" : "text-amber-400"
                  }`}>
                    {team.ltfi}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    team.ltfi >= 65
                      ? "bg-emerald-500/15 text-emerald-400"
                      : team.ltfi >= 50
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {team.ltfi >= 65 ? "Hot" : team.ltfi >= 55 ? "Warm" : team.ltfi >= 45 ? "Neutral" : "Cold"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
