import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Upsert user in our database
      const rows = await db.execute(sql`
        INSERT INTO users (email, name, image)
        VALUES (${user.email}, ${user.name || ""}, ${user.image || ""})
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, users.name),
          image = COALESCE(EXCLUDED.image, users.image),
          updated_at = NOW()
        RETURNING id
      `);

      const userId = Number(rows[0].id);

      // Upsert account link
      if (account) {
        await db.execute(sql`
          INSERT INTO accounts (user_id, type, provider, provider_account_id, access_token, refresh_token, expires_at)
          VALUES (${userId}, ${account.type}, ${account.provider}, ${account.providerAccountId},
            ${account.access_token || ""}, ${account.refresh_token || ""}, ${account.expires_at || 0})
          ON CONFLICT (provider, provider_account_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at
        `);
      }

      return true;
    },

    async session({ session }) {
      if (session.user?.email) {
        const rows = await db.execute(sql`
          SELECT id, subscription_status, stripe_customer_id,
                 subscription_current_period_end
          FROM users WHERE email = ${session.user.email} LIMIT 1
        `);

        if (rows.length > 0) {
          const user = rows[0];
          (session.user as any).id = Number(user.id);
          (session.user as any).subscriptionStatus = String(user.subscription_status || "free");
          (session.user as any).isPro =
            user.subscription_status === "active" ||
            user.subscription_status === "trialing";
        }
      }
      return session;
    },
  },
});

/**
 * Check if the current user has a pro subscription.
 * Use in server components / API routes.
 */
export async function isPro(): Promise<boolean> {
  const session = await auth();
  return (session?.user as any)?.isPro === true;
}

/**
 * Get the current user's DB record.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const rows = await db.execute(sql`
    SELECT * FROM users WHERE email = ${session.user.email} LIMIT 1
  `);

  return rows.length > 0 ? rows[0] : null;
}
