import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await db.execute(sql`
    SELECT stripe_customer_id FROM users WHERE email = ${session.user.email} LIMIT 1
  `);

  const customerId = rows[0]?.stripe_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account`,
  });

  return NextResponse.json({ url: portalSession.url });
}
