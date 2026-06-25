import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trades = await prisma.trade.findMany({
    where: { cardId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, priceCents: true, quantity: true, createdAt: true },
  });

  return NextResponse.json(trades);
}
