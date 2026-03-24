import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (subscriptionId) {
        const subResponse = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = subResponse as unknown as Stripe.Subscription;
        const periodEnd = (subscription as any).current_period_end;
        await db.execute(sql`
          UPDATE users SET
            subscription_status = ${subscription.status},
            subscription_id = ${subscriptionId},
            subscription_price_id = ${subscription.items.data[0]?.price.id || ""},
            subscription_current_period_end = ${periodEnd ? new Date(periodEnd * 1000).toISOString() : null}::timestamp,
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
        `);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const periodEndUpd = (subscription as any).current_period_end;

      await db.execute(sql`
        UPDATE users SET
          subscription_status = ${subscription.status},
          subscription_id = ${subscription.id},
          subscription_price_id = ${subscription.items.data[0]?.price.id || ""},
          subscription_current_period_end = ${periodEndUpd ? new Date(periodEndUpd * 1000).toISOString() : null}::timestamp,
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
      `);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await db.execute(sql`
        UPDATE users SET
          subscription_status = 'canceled',
          subscription_id = NULL,
          subscription_price_id = NULL,
          subscription_current_period_end = NULL,
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
      `);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
