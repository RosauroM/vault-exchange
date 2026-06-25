import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const card = await prisma.card.findUniqueOrThrow({ where: { id } });

  const [lastTrade, dayOldTrade] = await Promise.all([
    prisma.trade.findFirst({ where: { cardId: id }, orderBy: { createdAt: "desc" } }),
    prisma.trade.findFirst({
      where: { cardId: id, createdAt: { lte: new Date(Date.now() - 86_400_000) } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const lastPrice = lastTrade?.priceCents ?? card.referencePriceCents;
  const prevPrice = dayOldTrade?.priceCents ?? card.referencePriceCents;
  const change24h = prevPrice > 0 ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0;

  return NextResponse.json({
    ...card,
    lastPriceCents: lastPrice,
    change24h: Math.round(change24h * 100) / 100,
  });
}
