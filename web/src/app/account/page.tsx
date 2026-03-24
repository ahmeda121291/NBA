import { GlassCard } from "@/components/ui/glass-card";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { Crown, User, CreditCard, LogOut } from "lucide-react";
import { ManageButton } from "./manage-button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/auth/signin");

  const rows = await db.execute(sql`
    SELECT * FROM users WHERE email = ${session.user.email} LIMIT 1
  `);
  const user = rows[0] as any;
  const isPro = user?.subscription_status === "active" || user?.subscription_status === "trialing";
  const periodEnd = user?.subscription_current_period_end
    ? new Date(user.subscription_current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight gradient-text">Account</h1>

      <GlassCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <User className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">{session.user.name || "User"}</p>
            <p className="text-sm text-text-muted">{session.user.email}</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">Subscription</h2>
        </div>

        {isPro ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                Pro
              </span>
              <span className="text-sm text-text-secondary">Active</span>
            </div>
            {periodEnd && (
              <p className="text-sm text-text-muted">
                Next billing date: <span className="text-text-secondary font-semibold">{periodEnd}</span>
              </p>
            )}
            <ManageButton />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-white/[0.04] border border-white/[0.06] text-text-muted text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                Free
              </span>
              <span className="text-sm text-text-muted">Limited access</span>
            </div>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Upgrade to Pro
            </a>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
