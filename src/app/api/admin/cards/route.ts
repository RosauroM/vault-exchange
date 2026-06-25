import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LedgerReason, AccountType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    title, setName, year, grader, grade, certNumber, imageUrl,
    referencePriceCents, sharesIssued,
    treasuryShares, vaulterAllocations, prizePoolShares,
  } = body;

  const result = await prisma.$transaction(async (tx) => {
    // Create offering
    const offering = await tx.offering.create({
      data: { totalShares: sharesIssued, status: "open" },
    });

    // Create card
    const card = await tx.card.create({
      data: {
        title, setName, year, grader, grade, certNumber,
        imageUrl, referencePriceCents, sharesIssued,
        vaultStatus: "vaulted", isTradeable: true, offeringId: offering.id,
      },
    });

    // Get system accounts
    const treasury = await tx.cashAccount.findFirstOrThrow({
      where: { accountType: AccountType.house_treasury, userId: null },
    });
    const prizePool = await tx.cashAccount.findFirstOrThrow({
      where: { accountType: AccountType.prize_pool, userId: null },
    });

    // Issue all shares to treasury first
    await tx.sharePosition.create({
      data: { userId: treasury.userId ?? "__treasury__", cardId: card.id, quantity: sharesIssued, locked: 0 },
    });
    await tx.shareLedgerEntry.create({
      data: { cardId: card.id, userId: treasury.userId ?? "__treasury__", delta: sharesIssued, reason: LedgerReason.issuance },
    });

    // Allocate prize pool shares
    if (prizePoolShares > 0) {
      await tx.packPrizePool.upsert({
        where: { cardId: card.id },
        create: { cardId: card.id, quantityAvailable: prizePoolShares },
        update: { quantityAvailable: { increment: prizePoolShares } },
      });
    }

    // Allocate to vaulters
    if (vaulterAllocations) {
      for (const { userId: vaulterId, shares } of vaulterAllocations) {
        await tx.sharePosition.upsert({
          where: { userId_cardId: { userId: vaulterId, cardId: card.id } },
          create: { userId: vaulterId, cardId: card.id, quantity: shares, locked: 0 },
          update: { quantity: { increment: shares } },
        });
        await tx.shareLedgerEntry.create({
          data: { cardId: card.id, userId: vaulterId, delta: shares, reason: LedgerReason.treasury_seed, refId: card.id },
        });
      }
    }

    return { cardId: card.id, offeringId: offering.id };
  });

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(cards);
}
