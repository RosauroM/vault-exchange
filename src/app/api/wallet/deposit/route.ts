import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amountCents } = await req.json();
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum deposit is $1.00" }, { status: 400 });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Vault Exchange Deposit" },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: { userId: session.user.id, amountCents: String(amountCents) },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?deposit=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?deposit=cancelled`,
  });

  return NextResponse.json({ url: checkout.url });
}
