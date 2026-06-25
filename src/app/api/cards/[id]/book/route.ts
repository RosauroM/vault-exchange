import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [bids, asks] = await Promise.all([
    prisma.order.groupBy({
      by: ["priceCents"],
      where: { cardId: id, side: "bid", status: { in: ["open", "partial"] } },
      _sum: { quantity: true, filledQuantity: true },
      orderBy: { priceCents: "desc" },
      take: 20,
    }),
    prisma.order.groupBy({
      by: ["priceCents"],
      where: { cardId: id, side: "ask", status: { in: ["open", "partial"] } },
      _sum: { quantity: true, filledQuantity: true },
      orderBy: { priceCents: "asc" },
      take: 20,
    }),
  ]);

  const formatLevel = (row: { priceCents: number; _sum: { quantity: number | null; filledQuantity: number | null } }) => ({
    priceCents: row.priceCents,
    quantity: (row._sum.quantity ?? 0) - (row._sum.filledQuantity ?? 0),
  });

  return NextResponse.json({
    bids: bids.map(formatLevel).filter((b) => b.quantity > 0),
    asks: asks.map(formatLevel).filter((a) => a.quantity > 0),
  });
}
