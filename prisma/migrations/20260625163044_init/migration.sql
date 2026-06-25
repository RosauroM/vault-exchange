-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'market_maker', 'admin');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('none', 'pending', 'verified');

-- CreateEnum
CREATE TYPE "VaultStatus" AS ENUM ('intake', 'vaulted', 'withdrawn');

-- CreateEnum
CREATE TYPE "Grader" AS ENUM ('PSA', 'BGS', 'CGC');

-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('bid', 'ask');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('limit', 'market');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'partial', 'filled', 'cancelled');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('user', 'house_treasury', 'house_mm', 'prize_pool', 'stripe_clearing');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('trade', 'pack_award', 'issuance', 'treasury_seed', 'adjustment');

-- CreateEnum
CREATE TYPE "CashReason" AS ENUM ('deposit', 'withdrawal', 'trade', 'pack_purchase', 'fee', 'adjustment');

-- CreateEnum
CREATE TYPE "PackType" AS ENUM ('free_daily', 'paid');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "set_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grader" "Grader" NOT NULL,
    "grade" DECIMAL(65,30) NOT NULL,
    "cert_number" TEXT NOT NULL,
    "image_url" TEXT,
    "vault_status" "VaultStatus" NOT NULL DEFAULT 'intake',
    "reference_price_cents" INTEGER NOT NULL,
    "shares_issued" INTEGER NOT NULL,
    "is_tradeable" BOOLEAN NOT NULL DEFAULT false,
    "offering_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offerings" (
    "id" TEXT NOT NULL,
    "total_shares" INTEGER NOT NULL,
    "status" "OfferingStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_positions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "locked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "share_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_ledger_entries" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "account_type" "AccountType" NOT NULL,
    "balance_cents" BIGINT NOT NULL DEFAULT 0,
    "locked_cents" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_ledger_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "delta_cents" BIGINT NOT NULL,
    "reason" "CashReason" NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL DEFAULT 'limit',
    "price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "filled_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'open',
    "is_house" BOOLEAN NOT NULL DEFAULT false,
    "cash_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "bid_order_id" TEXT NOT NULL,
    "ask_order_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PackType" NOT NULL,
    "price_cents" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_prize_pool" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "quantity_available" INTEGER NOT NULL,

    CONSTRAINT "pack_prize_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_prize_weights" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "shares_per_win" INTEGER NOT NULL,
    "weight" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "pack_prize_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_pulls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "server_seed_hash" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "card_id" TEXT,
    "shares_awarded" INTEGER NOT NULL DEFAULT 0,
    "ev_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_pulls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "claimed_date" DATE NOT NULL,

    CONSTRAINT "daily_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mm_config" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "spread_bps" INTEGER NOT NULL,
    "max_inventory_shares" INTEGER NOT NULL,
    "quote_size" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mm_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "share_positions_user_id_card_id_key" ON "share_positions"("user_id", "card_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_user_id_key" ON "cash_accounts"("user_id");

-- CreateIndex
CREATE INDEX "orders_card_id_side_status_price_cents_created_at_idx" ON "orders"("card_id", "side", "status", "price_cents", "created_at");

-- CreateIndex
CREATE INDEX "trades_card_id_created_at_idx" ON "trades"("card_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pack_prize_pool_card_id_key" ON "pack_prize_pool"("card_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_claims_user_id_pack_id_claimed_date_key" ON "daily_claims"("user_id", "pack_id", "claimed_date");

-- CreateIndex
CREATE UNIQUE INDEX "mm_config_card_id_key" ON "mm_config"("card_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_positions" ADD CONSTRAINT "share_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_positions" ADD CONSTRAINT "share_positions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_ledger_entries" ADD CONSTRAINT "share_ledger_entries_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_ledger_entries" ADD CONSTRAINT "share_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_ledger_entries" ADD CONSTRAINT "cash_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "cash_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_bid_order_id_fkey" FOREIGN KEY ("bid_order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_ask_order_id_fkey" FOREIGN KEY ("ask_order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_prize_pool" ADD CONSTRAINT "pack_prize_pool_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_prize_weights" ADD CONSTRAINT "pack_prize_weights_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_prize_weights" ADD CONSTRAINT "pack_prize_weights_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_pulls" ADD CONSTRAINT "pack_pulls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_pulls" ADD CONSTRAINT "pack_pulls_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_claims" ADD CONSTRAINT "daily_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_claims" ADD CONSTRAINT "daily_claims_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_config" ADD CONSTRAINT "mm_config_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
