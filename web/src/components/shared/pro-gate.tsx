import { auth } from "@/lib/auth";
import { Crown, Lock } from "lucide-react";

interface ProGateProps {
  children: React.ReactNode;
  /** What to show free users instead of the content */
  fallback?: React.ReactNode;
  /** Brief label for what's behind the gate */
  feature?: string;
}

/**
 * Server component that gates content behind a Pro subscription.
 * Free users see a blurred overlay with upgrade CTA.
 */
export async function ProGate({ children, fallback, feature }: ProGateProps) {
  const session = await auth();
  const isPro = (session?.user as any)?.isPro === true;

  if (isPro) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="blur-[6px] pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-lg">
        <div className="text-center p-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-3">
            <Lock className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">
            {feature || "This feature"} requires Pro
          </p>
          <p className="text-[11px] text-text-muted mb-4">
            Upgrade for full access to advanced analytics.
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Pro
          </a>
        </div>
      </div>
    </div>
  );
}
