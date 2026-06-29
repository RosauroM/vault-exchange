import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LedgerReason, Grader } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    title, setName, year, grader, grade, certNumber, imageUrl,
    referencePriceCents, sharesIssued, vaulterAllocations, prizePoolShares,
  } = body as {
    title: string; setName: string; year: number; grader: string; grade: number;
    certNumber: string; imageUrl: string; referencePriceCents: number; sharesIssued: number;
    vaulterAllocations: { userId: string; shares: number }[]; prizePoolShares: number;
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const offering = await tx.offering.create({
        data: { totalShares: sharesIssued, status: "open" },
      });

      const card = await tx.card.create({
        data: {
          title, setName, year, grader: grader as Grader, grade, certNumber,
          imageUrl, referencePriceCents, sharesIssued,
          vaultStatus: "vaulted", isTradeable: true, offeringId: offering.id,
        },
      });

      // Issue all shares to the admin user (acts as treasury holder)
      await tx.sharePosition.create({
        data: { userId: session.user.id, cardId: card.id, quantity: sharesIssued, locked: 0 },
      });
      await tx.shareLedgerEntry.create({
        data: { cardId: card.id, userId: session.user.id, delta: sharesIssued, reason: LedgerReason.issuance },
      });

      // Allocate prize pool shares — decrement admin position to maintain invariant:
      // sum(sharePositions) + packPrizePool.quantityAvailable = sharesIssued
      if (prizePoolShares > 0) {
        await tx.sharePosition.update({
          where: { userId_cardId: { userId: session.user.id, cardId: card.id } },
          data: { quantity: { decrement: prizePoolShares } },
        });
        await tx.packPrizePool.upsert({
          where: { cardId: card.id },
          create: { cardId: card.id, quantityAvailable: prizePoolShares },
          update: { quantityAvailable: { increment: prizePoolShares } },
        });

        // Wire pack prize weights for all active packs so this card can be won
        const activePacks = await tx.pack.findMany({ where: { isActive: true } });
        for (const pack of activePacks) {
          const exists = await tx.packPrizeWeight.findFirst({
            where: { packId: pack.id, cardId: card.id },
          });
          if (!exists) {
            const defaultWeight = pack.type === "free_daily" ? 0.5 : 2.0;
            const defaultShares = pack.type === "free_daily" ? 1   : 5;
            await tx.packPrizeWeight.create({
              data: { packId: pack.id, cardId: card.id, sharesPerWin: defaultShares, weight: defaultWeight },
            });
          }
        }
      }

      // Allocate to vaulters
      if (vaulterAllocations?.length) {
        for (const { userId: vaulterId, shares } of vaulterAllocations) {
          await tx.sharePosition.update({
            where: { userId_cardId: { userId: session.user.id, cardId: card.id } },
            data: { quantity: { decrement: shares } },
          });
          await tx.sharePosition.upsert({
            where: { userId_cardId: { userId: vaulterId, cardId: card.id } },
            create: { userId: vaulterId, cardId: card.id, quantity: shares, locked: 0 },
            update: { quantity: { increment: shares } },
          });
          await tx.shareLedgerEntry.createMany({
            data: [
              { cardId: card.id, userId: session.user.id, delta: -shares, reason: LedgerReason.treasury_seed, refId: card.id },
              { cardId: card.id, userId: vaulterId,        delta:  shares, reason: LedgerReason.treasury_seed, refId: card.id },
            ],
          });
        }
      }

      return { cardId: card.id, offeringId: offering.id };
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(cards);
}
