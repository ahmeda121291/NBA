import { auth } from "@/lib/auth";
import Link from "next/link";
import { Crown, User } from "lucide-react";

/**
 * Server component: renders either sign-in link or user avatar with account link.
 */
export async function UserMenu() {
  const session = await auth();
  const isPro = (session?.user as any)?.isPro === true;

  if (!session?.user) {
    return (
      <Link
        href="/auth/signin"
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg transition-colors"
      >
        <User className="h-3.5 w-3.5" />
        Sign In
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
    >
      {isPro && (
        <span className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
          <Crown className="h-2.5 w-2.5" />
          Pro
        </span>
      )}
      {session.user.image ? (
        <img
          src={session.user.image}
          alt=""
          className="h-7 w-7 rounded-full border border-white/[0.08]"
        />
      ) : (
        <div className="h-7 w-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-indigo-400" />
        </div>
      )}
    </Link>
  );
}
