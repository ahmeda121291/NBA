import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, PLANS } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email;

  // Get or create Stripe customer
  const rows = await db.execute(sql`
    SELECT id, stripe_customer_id FROM users WHERE email = ${email} LIMIT 1
  `);

  if (rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customerId = rows[0].stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: session.user.name || undefined,
      metadata: { userId: String(rows[0].id) },
    });
    customerId = customer.id;

    await db.execute(sql`
      UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${Number(rows[0].id)}
    `);
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PLANS.pro.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing?canceled=true`,
    metadata: {
      userId: String(rows[0].id),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
