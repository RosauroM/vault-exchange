import { prisma } from "./prisma";
import { LedgerReason, CashReason } from "@prisma/client";
import crypto from "crypto";

export async function openPack({ packId, userId }: { packId: string; userId: string }) {
  return await prisma.$transaction(async (tx) => {
    const pack = await tx.pack.findUniqueOrThrow({ where: { id: packId } });

    if (!pack.isActive) throw new Error("Pack not available");

    // Enforce one free pack per day
    if (pack.type === "free_daily") {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const existing = await tx.dailyClaim.findUnique({
        where: { userId_packId_claimedDate: { userId, packId, claimedDate: today } },
      });
      if (existing) throw new Error("Free pack already claimed today");

      await tx.dailyClaim.create({ data: { userId, packId, claimedDate: today } });
    } else {
      // Paid pack: debit cash
      const account = await tx.cashAccount.findUniqueOrThrow({ where: { userId } });
      const price = BigInt(pack.priceCents);
      if (account.balanceCents < price) throw new Error("Insufficient balance");

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
          { accountId: account.id, deltaCents: -price, reason: CashReason.pack_purchase, refId: packId },
          { accountId: houseAccount.id, deltaCents: price, reason: CashReason.pack_purchase, refId: packId },
        ],
      });
    }

    // Server-side draw
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");

    // Load weights for cards that still have prize pool inventory
    const weights = await tx.packPrizeWeight.findMany({
      where: { packId },
      include: { card: { include: { packPrizePool: true } } },
    });

    const eligible = weights.filter(
      (w) => (w.card.packPrizePool[0]?.quantityAvailable ?? 0) >= w.sharesPerWin
    );

    let won = false;
    let wonCardId: string | null = null;
    let sharesAwarded = 0;
    let evCents = 0;

    if (eligible.length > 0) {
      const totalWeight = eligible.reduce((sum, w) => sum + Number(w.weight), 0);
      const roll = Math.random() * totalWeight;
      let cursor = 0;

      for (const w of eligible) {
        cursor += Number(w.weight);
        if (roll <= cursor) {
          won = true;
          wonCardId = w.cardId;
          sharesAwarded = w.sharesPerWin;
          evCents = Math.round((w.sharesPerWin * w.card.referencePriceCents) / w.card.sharesIssued);
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

      // Ledger entry: prize_pool -> user
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

    // Audit log
    const pull = await tx.packPull.create({
      data: {
        userId,
        packId,
        serverSeedHash,
        won,
        cardId: wonCardId,
        sharesAwarded,
        evCents,
      },
    });

    return { pullId: pull.id, won, cardId: wonCardId, sharesAwarded, evCents };
  });
}
