import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list all cards with their current prize pool and pack weights
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cards = await prisma.card.findMany({
    select: {
      id: true, title: true, grader: true, grade: true,
      sharesIssued: true, referencePriceCents: true,
      packPrizePool: { select: { quantityAvailable: true } },
      packPrizeWeights: {
        select: { id: true, packId: true, sharesPerWin: true, weight: true,
                  pack: { select: { name: true, type: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cards);
}

// POST — fund the prize pool for a card and/or update pack odds
// Body: { cardId, addShares?, weights?: [{ packId, sharesPerWin, weight }] }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { cardId, addShares = 0, weights = [] } = body as {
    cardId: string;
    addShares?: number;
    weights?: { packId: string; sharesPerWin: number; weight: number }[];
  };

  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    // Add shares to prize pool (debited from admin's share position)
    if (addShares > 0) {
      const adminPos = await tx.sharePosition.findFirst({
        where: { userId: session.user.id, cardId },
      });
      const available = (adminPos?.quantity ?? 0) - (adminPos?.locked ?? 0);
      if (available < addShares) throw new Error("Insufficient treasury shares");

      await tx.sharePosition.update({
        where: { userId_cardId: { userId: session.user.id, cardId } },
        data: { quantity: { decrement: addShares } },
      });
      await tx.packPrizePool.upsert({
        where: { cardId },
        create: { cardId, quantityAvailable: addShares },
        update: { quantityAvailable: { increment: addShares } },
      });
    }

    // Update pack prize weights
    for (const w of weights) {
      const existing = await tx.packPrizeWeight.findFirst({
        where: { packId: w.packId, cardId },
      });
      if (existing) {
        await tx.packPrizeWeight.update({
          where: { id: existing.id },
          data: { sharesPerWin: w.sharesPerWin, weight: w.weight },
        });
      } else {
        await tx.packPrizeWeight.create({
          data: { packId: w.packId, cardId, sharesPerWin: w.sharesPerWin, weight: w.weight },
        });
      }
    }

    return await tx.packPrizePool.findUnique({ where: { cardId } });
  });

  return NextResponse.json(result);
}
