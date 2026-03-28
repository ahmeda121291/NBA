import { ProGate } from "@/components/shared/pro-gate";

export default function LeaderboardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProGate feature="Leaderboards">
      {children}
    </ProGate>
  );
}
