import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cards = await prisma.card.findMany({
    where: { isTradeable: true },
    include: {
      trades: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { priceCents: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute 24h change
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const enriched = await Promise.all(
    cards.map(async (card) => {
      const dayOldTrade = await prisma.trade.findFirst({
        where: { cardId: card.id, createdAt: { lte: yesterday } },
        orderBy: { createdAt: "desc" },
        select: { priceCents: true },
      });

      const lastPrice = card.trades[0]?.priceCents ?? card.referencePriceCents;
      const prevPrice = dayOldTrade?.priceCents ?? card.referencePriceCents;
      const change24h = prevPrice > 0 ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0;

      return {
        id: card.id,
        title: card.title,
        setName: card.setName,
        year: card.year,
        grader: card.grader,
        grade: card.grade,
        imageUrl: card.imageUrl,
        referencePriceCents: card.referencePriceCents,
        sharesIssued: card.sharesIssued,
        lastPriceCents: lastPrice,
        change24h: Math.round(change24h * 100) / 100,
        lastTradeAt: card.trades[0]?.createdAt ?? null,
      };
    })
  );

  return NextResponse.json(enriched);
}
