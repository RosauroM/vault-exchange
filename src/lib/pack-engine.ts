import { prisma } from "./prisma";
import { LedgerReason, CashReason } from "@prisma/client";
import crypto from "crypto";

// Derive a deterministic float 0..1 from a server seed.
// This makes draws provably fair: store serverSeed after reveal,
// and anyone can verify roll = deriveRoll(serverSeed) against the
// stored serverSeedHash.
function deriveRoll(serverSeed: string): number {
  const hmac = crypto.createHmac("sha256", serverSeed).update("roll").digest("hex");
  const rollInt = parseInt(hmac.slice(0, 8), 16); // 0..0xFFFFFFFF
  return rollInt / 0xffffffff; // 0..1
}

export async function openPack({ packId, userId }: { packId: string; userId: string }) {
  return await prisma.$transaction(async (tx) => {
    const pack = await tx.pack.findUniqueOrThrow({ where: { id: packId } });

    if (!pack.isActive) throw new Error("Pack not available");

    // ── Free daily: enforce one per UTC day ──
    if (pack.type === "free_daily") {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const existing = await tx.dailyClaim.findUnique({
        where: { userId_packId_claimedDate: { userId, packId, claimedDate: today } },
      });
      if (existing) throw new Error("Free pack already claimed today");
      await tx.dailyClaim.create({ data: { userId, packId, claimedDate: today } });
    } else {
      // ── Paid pack: debit user cash → house treasury ──
      const account = await tx.cashAccount.findUniqueOrThrow({ where: { userId } });
      const price = BigInt(pack.priceCents);
      const available = account.balanceCents - account.lockedCents;
      if (available < price) throw new Error("Insufficient balance");

      const houseAccount = await tx.cashAccount.findFirstOrThrow({
        where: { accountType: "house_treasury", userId: null },
      });

      await tx.cashAccount.update({
        where: { userId },
        data: { balanceCents: { decrement: price } },
      });
      await tx.cashAccount.update({
        where: { id: houseAccount.id },
        data: { balanceCents: { increment: price } },
      });
      await tx.cashLedgerEntry.createMany({
        data: [
          { accountId: account.id,      deltaCents: -price, reason: CashReason.pack_purchase, refId: packId },
          { accountId: houseAccount.id, deltaCents:  price, reason: CashReason.pack_purchase, refId: packId },
        ],
      });
    }

    // ── Server-authoritative draw ──
    // serverSeed is secret until after the result. serverSeedHash is recorded now.
    // After the reveal, the client can be given serverSeed to verify:
    //   SHA256(serverSeed) === serverSeedHash  AND  deriveRoll(serverSeed) === roll
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");

    // Roll is 0..1, derived deterministically from the server seed
    const roll = deriveRoll(serverSeed);

    // Load weights only for cards that have enough prize pool inventory
    const weights = await tx.packPrizeWeight.findMany({
      where: { packId },
      include: {
        card: {
          include: {
            packPrizePool: true,
          },
        },
      },
    });

    const eligible = weights.filter(
      (w) => (w.card.packPrizePool[0]?.quantityAvailable ?? 0) >= w.sharesPerWin
    );

    // ── Weighted selection with proper no-win bucket ──
    // Each weight represents the percentage win-chance for that prize.
    // e.g. weight=0.5 → 0.5% chance.  totalWeight=3.0 → 3% overall win chance.
    // Rolls in [0, totalWeight/100) hit a prize; rolls ≥ totalWeight/100 → no win.
    //
    // We roll 0..1. Win zone = [0, totalWeight/100).
    // Within the win zone, prize is chosen by proportion.
    const totalWeight = eligible.reduce((sum, w) => sum + Number(w.weight), 0);
    // Cap total win probability at 99% (should never realistically exceed ~20% with current seeds)
    const winProbability = Math.min(totalWeight / 100, 0.99);

    let won = false;
    let wonCardId: string | null = null;
    let sharesAwarded = 0;
    let evCents = 0;
    let wonCard: { title: string; imageUrl: string | null; grade: number; grader: string; referencePriceCents: number } | null = null;

    if (eligible.length > 0 && roll < winProbability) {
      // Re-roll within the win zone to pick which prize
      const prizeRoll = (roll / winProbability) * totalWeight;
      let cursor = 0;

      for (const w of eligible) {
        cursor += Number(w.weight);
        if (prizeRoll <= cursor) {
          won = true;
          wonCardId = w.cardId;
          sharesAwarded = w.sharesPerWin;
          evCents = Math.round(
            (w.sharesPerWin * w.card.referencePriceCents) / w.card.sharesIssued
          );
          wonCard = {
            title: w.card.title,
            imageUrl: w.card.imageUrl ?? null,
            grade: Number(w.card.grade),
            grader: w.card.grader,
            referencePriceCents: w.card.referencePriceCents,
          };
          break;
        }
      }
    }

    if (won && wonCardId) {
      // Decrement prize pool
      await tx.packPrizePool.update({
        where: { cardId: wonCardId },
        data: { quantityAvailable: { decrement: sharesAwarded } },
      });

      // Credit user share position
      await tx.sharePosition.upsert({
        where: { userId_cardId: { userId, cardId: wonCardId } },
        create: { userId, cardId: wonCardId, quantity: sharesAwarded, locked: 0 },
        update: { quantity: { increment: sharesAwarded } },
      });

      // Share ledger: prize_pool → user
      await tx.shareLedgerEntry.create({
        data: {
          cardId: wonCardId,
          userId,
          delta: sharesAwarded,
          reason: LedgerReason.pack_award,
          refId: packId,
        },
      });
    }

    // Immutable audit log
    const pull = await tx.packPull.create({
      data: { userId, packId, serverSeedHash, won, cardId: wonCardId, sharesAwarded, evCents },
    });

    return {
      pullId: pull.id,
      won,
      cardId: wonCardId,
      sharesAwarded,
      evCents,
      // Include card details so the UI can render the won card without a second fetch
      card: wonCard,
    };
  });
}
