import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [positions, openOrders] = await Promise.all([
    prisma.sharePosition.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { card: true },
    }),
    prisma.order.findMany({
      where: { userId, status: { in: ["open", "partial"] } },
      include: { card: { select: { id: true, title: true, referencePriceCents: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const enriched = await Promise.all(
    positions.map(async (pos) => {
      const lastTrade = await prisma.trade.findFirst({
        where: { cardId: pos.cardId },
        orderBy: { createdAt: "desc" },
        select: { priceCents: true },
      });

      // Compute avg cost from ledger
      const buys = await prisma.shareLedgerEntry.findMany({
        where: { cardId: pos.cardId, userId, delta: { gt: 0 }, reason: "trade" },
      });
      const totalShares = buys.reduce((s, e) => s + e.delta, 0);
      const totalCost = await prisma.cashLedgerEntry.aggregate({
        where: {
          account: { userId },
          reason: "trade",
          deltaCents: { lt: 0 },
          refId: { in: buys.map((b) => b.refId).filter(Boolean) as string[] },
        },
        _sum: { deltaCents: true },
      });
      const avgCostCents =
        totalShares > 0
          ? Math.abs(Number(totalCost._sum.deltaCents ?? 0n)) / totalShares
          : 0;

      const currentPriceCents = lastTrade?.priceCents ?? pos.card.referencePriceCents;
      const currentValueCents = currentPriceCents * pos.quantity;
      const costBasisCents = avgCostCents * pos.quantity;
      const unrealizedPnlCents = currentValueCents - costBasisCents;

      return {
        cardId: pos.cardId,
        title: pos.card.title,
        grade: pos.card.grade,
        grader: pos.card.grader,
        imageUrl: pos.card.imageUrl,
        sharesIssued: pos.card.sharesIssued,
        quantity: pos.quantity,
        available: pos.quantity - pos.locked,
        locked: pos.locked,
        avgCostCents: Math.round(avgCostCents),
        currentPriceCents,
        currentValueCents,
        unrealizedPnlCents,
      };
    })
  );

  return NextResponse.json({ positions: enriched, openOrders });
}
