import { Search } from "lucide-react";

const playersData = [
  { id: 1, name: "Nikola Jokic", team: "DEN", pos: "C", bis: 91, lfi: 55, drs: 52, ppg: 26.4, rpg: 12.1, apg: 9.2 },
  { id: 2, name: "Shai Gilgeous-Alexander", team: "OKC", pos: "PG", bis: 88, lfi: 78, drs: 62, ppg: 31.2, rpg: 5.4, apg: 6.1 },
  { id: 3, name: "Luka Doncic", team: "DAL", pos: "PG", bis: 86, lfi: 48, drs: 42, ppg: 29.8, rpg: 8.7, apg: 8.9 },
  { id: 4, name: "Giannis Antetokounmpo", team: "MIL", pos: "PF", bis: 85, lfi: 60, drs: 68, ppg: 30.1, rpg: 11.4, apg: 5.8 },
  { id: 5, name: "Jayson Tatum", team: "BOS", pos: "SF", bis: 82, lfi: 68, drs: 65, ppg: 27.2, rpg: 8.1, apg: 4.8 },
  { id: 6, name: "Anthony Edwards", team: "MIN", pos: "SG", bis: 78, lfi: 69, drs: 55, ppg: 26.8, rpg: 5.5, apg: 5.2 },
  { id: 7, name: "Joel Embiid", team: "PHI", pos: "C", bis: 84, lfi: 35, drs: 58, ppg: 28.5, rpg: 11.2, apg: 4.1 },
  { id: 8, name: "Kevin Durant", team: "PHX", pos: "SF", bis: 80, lfi: 52, drs: 48, ppg: 27.1, rpg: 6.5, apg: 5.2 },
  { id: 9, name: "LeBron James", team: "LAL", pos: "SF", bis: 76, lfi: 55, drs: 50, ppg: 25.5, rpg: 7.8, apg: 7.1 },
  { id: 10, name: "Tyrese Haliburton", team: "IND", pos: "PG", bis: 74, lfi: 58, drs: 44, ppg: 20.1, rpg: 3.8, apg: 10.2 },
];

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-sm text-text-secondary">
            All active NBA players with composite evaluations
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search players..."
            className="h-9 w-64 rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {["All", "PG", "SG", "SF", "PF", "C"].map((pos) => (
          <button
            key={pos}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              pos === "All"
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-muted">
              <th className="p-4">#</th>
              <th className="p-4">Player</th>
              <th className="p-4">Team</th>
              <th className="p-4">Pos</th>
              <th className="p-4 text-right">BIS</th>
              <th className="p-4 text-right">LFI</th>
              <th className="p-4 text-right">DRS</th>
              <th className="p-4 text-right">PPG</th>
              <th className="p-4 text-right">RPG</th>
              <th className="p-4 text-right">APG</th>
            </tr>
          </thead>
          <tbody>
            {playersData.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-border/50 transition-colors hover:bg-surface-hover"
              >
                <td className="p-4 font-stat text-text-muted">{i + 1}</td>
                <td className="p-4">
                  <a href={`/players/${p.id}`} className="font-medium hover:text-accent">
                    {p.name}
                  </a>
                </td>
                <td className="p-4 text-text-muted">{p.team}</td>
                <td className="p-4 text-text-muted">{p.pos}</td>
                <td className={`p-4 text-right font-stat font-bold ${
                  p.bis >= 80 ? "text-emerald-400" : p.bis >= 65 ? "text-blue-400" : "text-amber-400"
                }`}>{p.bis}</td>
                <td className={`p-4 text-right font-stat font-bold ${
                  p.lfi >= 65 ? "text-emerald-400" : p.lfi >= 50 ? "text-blue-400" : "text-amber-400"
                }`}>{p.lfi}</td>
                <td className={`p-4 text-right font-stat font-bold ${
                  p.drs >= 65 ? "text-emerald-400" : p.drs >= 50 ? "text-blue-400" : "text-amber-400"
                }`}>{p.drs}</td>
                <td className="p-4 text-right font-stat">{p.ppg}</td>
                <td className="p-4 text-right font-stat">{p.rpg}</td>
                <td className="p-4 text-right font-stat">{p.apg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
