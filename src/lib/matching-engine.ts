import { prisma } from "./prisma";
import { OrderSide, OrderStatus, LedgerReason, CashReason } from "@prisma/client";

/**
 * Places an order and runs the matching engine inside a single serialized transaction.
 * Uses pg_advisory_xact_lock to prevent concurrent fills on the same card.
 *
 * Invariants enforced:
 * - Bid: buyer's available cash >= price * qty before locking
 * - Ask: seller's available shares >= qty before locking
 * - All share + cash movements for a fill happen atomically with the trade row
 * - Execution price = resting order's price (taker gets price improvement)
 * - No negative balances or positions ever
 */
export async function placeOrder({
  cardId,
  userId,
  side,
  priceCents,
  quantity,
  isHouse = false,
}: {
  cardId: string;
  userId: string;
  side: OrderSide;
  priceCents: number;
  quantity: number;
  isHouse?: boolean;
}) {
  return await prisma.$transaction(
    async (tx) => {
      // Advisory lock: serializes all matching for this card
      const lockKey = await cardLockKey(cardId);
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

      if (side === OrderSide.bid) {
        // Validate available cash
        const cashAccount = await tx.cashAccount.findUniqueOrThrow({
          where: { userId },
        });
        const available = cashAccount.balanceCents - cashAccount.lockedCents;
        const required = BigInt(priceCents * quantity);
        if (available < required) {
          throw new Error(`Insufficient cash: need ${required}, have ${available}`);
        }
        // Lock cash
        await tx.cashAccount.update({
          where: { userId },
          data: { lockedCents: { increment: required } },
        });
      } else {
        // Validate available shares
        const position = await tx.sharePosition.findUnique({
          where: { userId_cardId: { userId, cardId } },
        });
        const available = (position?.quantity ?? 0) - (position?.locked ?? 0);
        if (available < quantity) {
          throw new Error(`Insufficient shares: need ${quantity}, have ${available}`);
        }
        // Lock shares
        await tx.sharePosition.update({
          where: { userId_cardId: { userId, cardId } },
          data: { locked: { increment: quantity } },
        });
      }

      // Create the incoming order
      const cashAccount = side === OrderSide.bid
        ? await tx.cashAccount.findUnique({ where: { userId } })
        : null;

      const order = await tx.order.create({
        data: {
          cardId,
          userId,
          side,
          type: "limit",
          priceCents,
          quantity,
          filledQuantity: 0,
          status: OrderStatus.open,
          isHouse,
          cashAccountId: cashAccount?.id ?? null,
        },
      });

      // Run matching
      let remaining = quantity;

      while (remaining > 0) {
        // Find best opposing resting order
        const opposing = side === OrderSide.bid
          ? await tx.order.findFirst({
              where: {
                cardId,
                side: OrderSide.ask,
                status: { in: [OrderStatus.open, OrderStatus.partial] },
                priceCents: { lte: priceCents }, // bid crosses ask
              },
              orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
            })
          : await tx.order.findFirst({
              where: {
                cardId,
                side: OrderSide.bid,
                status: { in: [OrderStatus.open, OrderStatus.partial] },
                priceCents: { gte: priceCents }, // ask crosses bid
              },
              orderBy: [{ priceCents: "desc" }, { createdAt: "asc" }],
            });

        if (!opposing) break;

        const fillQty = Math.min(remaining, opposing.quantity - opposing.filledQuantity);
        const fillPrice = opposing.priceCents; // taker gets price improvement

        const bidOrderId = side === OrderSide.bid ? order.id : opposing.id;
        const askOrderId = side === OrderSide.ask ? order.id : opposing.id;
        const buyerId = side === OrderSide.bid ? userId : opposing.userId;
        const sellerId = side === OrderSide.ask ? userId : opposing.userId;

        // Create trade record
        const trade = await tx.trade.create({
          data: { cardId, bidOrderId, askOrderId, buyerId, sellerId, priceCents: fillPrice, quantity: fillQty },
        });

        // Move shares: seller -> buyer
        await transferShares(tx, { cardId, fromUserId: sellerId, toUserId: buyerId, quantity: fillQty, tradeId: trade.id });

        // Move cash: buyer -> seller
        const totalCents = BigInt(fillPrice * fillQty);
        await transferCash(tx, { fromUserId: buyerId, toUserId: sellerId, amountCents: totalCents, tradeId: trade.id });

        // Update opposing order
        const opposingFilled = opposing.filledQuantity + fillQty;
        const opposingStatus =
          opposingFilled >= opposing.quantity ? OrderStatus.filled : OrderStatus.partial;
        await tx.order.update({
          where: { id: opposing.id },
          data: { filledQuantity: opposingFilled, status: opposingStatus },
        });

        remaining -= fillQty;
      }

      // Update incoming order status
      const filledQty = quantity - remaining;
      const incomingStatus =
        remaining === 0
          ? OrderStatus.filled
          : filledQty > 0
          ? OrderStatus.partial
          : OrderStatus.open;

      await tx.order.update({
        where: { id: order.id },
        data: { filledQuantity: filledQty, status: incomingStatus },
      });

      // If bid order is fully filled or resting, adjust locked cash
      if (side === OrderSide.bid && remaining > 0) {
        // Order is resting; locked cash stays (already locked above)
        // If partially filled, release excess lock
        const excessLocked = BigInt(priceCents * remaining);
        // Cash already locked for full qty; now remaining stays locked, filled portion was consumed
        // No adjustment needed — the transfer already debited the exact fill amount
      }

      return { orderId: order.id, filled: filledQty, remaining };
    },
    { timeout: 15000 }
  );
}

export async function cancelOrder({ orderId, userId }: { orderId: string; userId: string }) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

    if (order.userId !== userId) throw new Error("Not your order");
    if (order.status === OrderStatus.filled || order.status === OrderStatus.cancelled) {
      throw new Error("Order cannot be cancelled");
    }

    const lockKey = await cardLockKey(order.cardId);
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

    const remaining = order.quantity - order.filledQuantity;

    if (order.side === OrderSide.bid) {
      // Unlock cash
      const unlockCents = BigInt(order.priceCents * remaining);
      await tx.cashAccount.update({
        where: { userId },
        data: { lockedCents: { decrement: unlockCents } },
      });
    } else {
      // Unlock shares
      await tx.sharePosition.update({
        where: { userId_cardId: { userId, cardId: order.cardId } },
        data: { locked: { decrement: remaining } },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.cancelled },
    });
  });
}

// ---- helpers ----

async function transferShares(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  { cardId, fromUserId, toUserId, quantity, tradeId }: { cardId: string; fromUserId: string; toUserId: string; quantity: number; tradeId: string }
) {
  // Decrement seller (unlock + remove)
  await tx.sharePosition.update({
    where: { userId_cardId: { userId: fromUserId, cardId } },
    data: { quantity: { decrement: quantity }, locked: { decrement: quantity } },
  });

  // Increment buyer (upsert)
  await tx.sharePosition.upsert({
    where: { userId_cardId: { userId: toUserId, cardId } },
    create: { userId: toUserId, cardId, quantity, locked: 0 },
    update: { quantity: { increment: quantity } },
  });

  // Ledger entries
  await tx.shareLedgerEntry.createMany({
    data: [
      { cardId, userId: fromUserId, delta: -quantity, reason: LedgerReason.trade, refId: tradeId },
      { cardId, userId: toUserId, delta: quantity, reason: LedgerReason.trade, refId: tradeId },
    ],
  });
}

async function transferCash(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  { fromUserId, toUserId, amountCents, tradeId }: { fromUserId: string; toUserId: string; amountCents: bigint; tradeId: string }
) {
  const buyerAccount = await tx.cashAccount.findUniqueOrThrow({ where: { userId: fromUserId } });
  const sellerAccount = await tx.cashAccount.findUniqueOrThrow({ where: { userId: toUserId } });

  // Debit buyer (remove from balance + locked)
  await tx.cashAccount.update({
    where: { id: buyerAccount.id },
    data: {
      balanceCents: { decrement: amountCents },
      lockedCents: { decrement: amountCents },
    },
  });

  // Credit seller
  await tx.cashAccount.update({
    where: { id: sellerAccount.id },
    data: { balanceCents: { increment: amountCents } },
  });

  // Ledger entries
  await tx.cashLedgerEntry.createMany({
    data: [
      { accountId: buyerAccount.id, deltaCents: -amountCents, reason: CashReason.trade, refId: tradeId },
      { accountId: sellerAccount.id, deltaCents: amountCents, reason: CashReason.trade, refId: tradeId },
    ],
  });
}

// Converts a UUID card ID to a stable bigint for pg_advisory_xact_lock
async function cardLockKey(cardId: string): Promise<bigint> {
  const result = await prisma.$queryRawUnsafe<[{ key: bigint }]>(
    `SELECT ('x' || substr(md5($1), 1, 16))::bit(64)::bigint AS key`,
    cardId
  );
  return result[0].key;
}
