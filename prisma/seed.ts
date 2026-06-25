import { PrismaClient, AccountType, LedgerReason, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Vault Exchange...");

  // ── System accounts ──────────────────────────────────────────────
  const systemAccounts = [
    { accountType: AccountType.house_treasury },
    { accountType: AccountType.house_mm },
    { accountType: AccountType.prize_pool },
    { accountType: AccountType.stripe_clearing },
  ];

  for (const acc of systemAccounts) {
    const existing = await prisma.cashAccount.findFirst({
      where: { accountType: acc.accountType, userId: null },
    });
    if (!existing) {
      await prisma.cashAccount.create({
        data: { accountType: acc.accountType, balanceCents: 0n, lockedCents: 0n },
      });
    }
  }

  // ── Admin user ────────────────────────────────────────────────────
  const adminEmail = "admin@vaultexchange.com";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: { email: adminEmail, displayName: "Admin", role: UserRole.admin },
    });
    await prisma.cashAccount.create({
      data: { userId: admin.id, accountType: AccountType.user, balanceCents: 100_000_00n, lockedCents: 0n },
    });
  }

  // ── Demo vaulter user ──────────────────────────────────────────────
  const vaulterEmail = "vaulter@vaultexchange.com";
  let vaulter = await prisma.user.findUnique({ where: { email: vaulterEmail } });
  if (!vaulter) {
    vaulter = await prisma.user.create({
      data: { email: vaulterEmail, displayName: "Demo Vaulter", role: UserRole.market_maker },
    });
    await prisma.cashAccount.create({
      data: { userId: vaulter.id, accountType: AccountType.user, balanceCents: 50_000_00n, lockedCents: 0n },
    });
  }

  // ── Demo trader user ───────────────────────────────────────────────
  const traderEmail = "trader@vaultexchange.com";
  let trader = await prisma.user.findUnique({ where: { email: traderEmail } });
  if (!trader) {
    trader = await prisma.user.create({
      data: { email: traderEmail, displayName: "Demo Trader" },
    });
    await prisma.cashAccount.create({
      data: { userId: trader.id, accountType: AccountType.user, balanceCents: 25_000_00n, lockedCents: 0n },
    });
  }


  // ── Cards ─────────────────────────────────────────────────────────
  const cardSeeds = [
    {
      title: "1999 Pokémon Base Set Charizard Holo",
      setName: "Base Set",
      year: 1999,
      grader: "PSA" as const,
      grade: 10,
      certNumber: "12345678",
      imageUrl: "https://images.pokemontcg.io/base1/4_hires.png",
      referencePriceCents: 500_000_00,  // $500,000
      sharesIssued: 10_000,
      treasuryShares: 5_000,
      vaulterShares: 3_000,
      prizePoolShares: 500,
      spreadBps: 200,
    },
    {
      title: "2003 Pokémon Skyridge Crystal Charizard",
      setName: "Skyridge",
      year: 2003,
      grader: "PSA" as const,
      grade: 9,
      certNumber: "87654321",
      imageUrl: "https://images.pokemontcg.io/ecard3/146_hires.png",
      referencePriceCents: 80_000_00,   // $80,000
      sharesIssued: 10_000,
      treasuryShares: 5_000,
      vaulterShares: 3_000,
      prizePoolShares: 200,
      spreadBps: 500,
    },
    {
      title: "2009 Pokémon Platinum Arceus Level X",
      setName: "Arceus",
      year: 2009,
      grader: "BGS" as const,
      grade: 9.5,
      certNumber: "11223344",
      imageUrl: null,
      referencePriceCents: 12_000_00,   // $12,000
      sharesIssued: 10_000,
      treasuryShares: 6_000,
      vaulterShares: 2_500,
      prizePoolShares: 100,
      spreadBps: 800,
    },
  ];

  const freePack = await prisma.pack.upsert({
    where: { id: "free-daily-pack" },
    create: { id: "free-daily-pack", name: "Daily Free Pack", type: "free_daily", priceCents: 0, isActive: true },
    update: {},
  });

  const paidPack = await prisma.pack.upsert({
    where: { id: "standard-pack" },
    create: { id: "standard-pack", name: "Standard Pack", type: "paid", priceCents: 9_99, isActive: true },
    update: {},
  });

  for (const seed of cardSeeds) {
    const existing = await prisma.card.findFirst({ where: { certNumber: seed.certNumber } });
    if (existing) continue;

    const offering = await prisma.offering.create({
      data: { totalShares: seed.sharesIssued, status: "open" },
    });

    const card = await prisma.card.create({
      data: {
        title: seed.title,
        setName: seed.setName,
        year: seed.year,
        grader: seed.grader,
        grade: seed.grade,
        certNumber: seed.certNumber,
        imageUrl: seed.imageUrl,
        referencePriceCents: seed.referencePriceCents,
        sharesIssued: seed.sharesIssued,
        vaultStatus: "vaulted",
        isTradeable: true,
        offeringId: offering.id,
      },
    });

    // Issue all shares to admin (acting as treasury)
    await prisma.sharePosition.create({
      data: { userId: admin.id, cardId: card.id, quantity: seed.sharesIssued, locked: 0 },
    });
    await prisma.shareLedgerEntry.create({
      data: { cardId: card.id, userId: admin.id, delta: seed.sharesIssued, reason: LedgerReason.issuance },
    });

    // Move vaulter allocation
    const vaulterShares = seed.vaulterShares;
    await prisma.sharePosition.update({
      where: { userId_cardId: { userId: admin.id, cardId: card.id } },
      data: { quantity: { decrement: vaulterShares } },
    });
    await prisma.sharePosition.upsert({
      where: { userId_cardId: { userId: vaulter.id, cardId: card.id } },
      create: { userId: vaulter.id, cardId: card.id, quantity: vaulterShares, locked: 0 },
      update: { quantity: { increment: vaulterShares } },
    });
    await prisma.shareLedgerEntry.createMany({
      data: [
        { cardId: card.id, userId: admin.id, delta: -vaulterShares, reason: LedgerReason.treasury_seed, refId: card.id },
        { cardId: card.id, userId: vaulter.id, delta: vaulterShares, reason: LedgerReason.treasury_seed, refId: card.id },
      ],
    });

    // Move prize pool allocation
    const prizeShares = seed.prizePoolShares;
    await prisma.sharePosition.update({
      where: { userId_cardId: { userId: admin.id, cardId: card.id } },
      data: { quantity: { decrement: prizeShares } },
    });
    await prisma.packPrizePool.upsert({
      where: { cardId: card.id },
      create: { cardId: card.id, quantityAvailable: prizeShares },
      update: { quantityAvailable: { increment: prizeShares } },
    });

    // Pack prize weights
    await prisma.packPrizeWeight.createMany({
      data: [
        { packId: freePack.id, cardId: card.id, sharesPerWin: 1, weight: 0.5 },
        { packId: paidPack.id, cardId: card.id, sharesPerWin: 5, weight: 2 },
      ],
    });

    // MM config
    await prisma.mmConfig.create({
      data: {
        cardId: card.id,
        enabled: true,
        spreadBps: seed.spreadBps,
        maxInventoryShares: 1000,
        quoteSize: 50,
      },
    });

    // Seed some initial bids/asks from vaulter and admin
    const pricePerShare = Math.round(seed.referencePriceCents / seed.sharesIssued);
    const spread = Math.round(pricePerShare * seed.spreadBps / 10000);

    // Vaulter posts asks (selling their allocation)
    await prisma.order.create({
      data: {
        cardId: card.id,
        userId: vaulter.id,
        side: "ask",
        type: "limit",
        priceCents: pricePerShare + spread,
        quantity: 100,
        filledQuantity: 0,
        status: "open",
        isHouse: false,
      },
    });
    // Lock the shares
    await prisma.sharePosition.update({
      where: { userId_cardId: { userId: vaulter.id, cardId: card.id } },
      data: { locked: { increment: 100 } },
    });

    // Admin posts bids
    const bidCost = BigInt((pricePerShare - spread) * 100);
    await prisma.order.create({
      data: {
        cardId: card.id,
        userId: admin.id,
        side: "bid",
        type: "limit",
        priceCents: pricePerShare - spread,
        quantity: 100,
        filledQuantity: 0,
        status: "open",
        isHouse: true,
      },
    });
    await prisma.cashAccount.update({
      where: { userId: admin.id },
      data: { lockedCents: { increment: bidCost } },
    });

    console.log(`✓ Seeded card: ${card.title}`);
  }

  console.log("✓ Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
