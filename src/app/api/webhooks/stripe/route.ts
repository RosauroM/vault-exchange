import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { CashReason } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountCents = Number(session.metadata?.amountCents ?? 0);

    if (!userId || !amountCents) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const userAccount = await tx.cashAccount.findUniqueOrThrow({ where: { userId } });
      const clearingAccount = await tx.cashAccount.findFirstOrThrow({
        where: { accountType: "stripe_clearing", userId: null },
      });

      // Credit user
      await tx.cashAccount.update({
        where: { id: userAccount.id },
        data: { balanceCents: { increment: BigInt(amountCents) } },
      });

      // Debit clearing (stripe_clearing was pre-funded or tracked separately)
      await tx.cashAccount.update({
        where: { id: clearingAccount.id },
        data: { balanceCents: { increment: BigInt(amountCents) } },
      });

      await tx.cashLedgerEntry.createMany({
        data: [
          {
            accountId: clearingAccount.id,
            deltaCents: BigInt(amountCents),
            reason: CashReason.deposit,
            refId: session.id,
          },
          {
            accountId: userAccount.id,
            deltaCents: BigInt(amountCents),
            reason: CashReason.deposit,
            refId: session.id,
          },
        ],
      });
    });
  }

  return NextResponse.json({ received: true });
}
