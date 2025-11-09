-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "search_name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "rarity" TEXT,
    "quality" TEXT NOT NULL DEFAULT 'normal',
    "wear" TEXT NOT NULL DEFAULT 'none',
    "weapon_type" TEXT,
    "image_url" TEXT NOT NULL,
    "image_url_fallback" TEXT,
    "image_local_path" TEXT,
    "wear_min" DOUBLE PRECISION,
    "wear_max" DOUBLE PRECISION,
    "pattern_count" INTEGER,
    "collection_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "is_discontinued" BOOLEAN NOT NULL DEFAULT false,
    "discontinued_date" TIMESTAMP(3),
    "previous_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "key_price" DOUBLE PRECISION NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "previous_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseItem" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "drop_probability" DOUBLE PRECISION NOT NULL,
    "is_special_item" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplacePrice" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "seller_fee_percent" DOUBLE PRECISION,
    "buyer_fee_percent" DOUBLE PRECISION,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "quantity_available" INTEGER,
    "listing_url" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplacePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeeConfig" (
    "platform" TEXT NOT NULL,
    "buyer_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "seller_fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hidden_markup_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "fee_notes" TEXT NOT NULL,
    "last_verified" TIMESTAMP(3),
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeeConfig_pkey" PRIMARY KEY ("platform")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "steam_id" TEXT NOT NULL,
    "persona_name" TEXT NOT NULL,
    "profile_url" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "profile_state" INTEGER NOT NULL DEFAULT 1,
    "has_cs2_game" BOOLEAN NOT NULL DEFAULT false,
    "last_logoff" TIMESTAMP(3),
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "steam_id" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_synced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "last_asset_id" TEXT,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" TIMESTAMP(3),
    "scheduled_delete" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "item_id" TEXT,
    "steam_asset_id" TEXT NOT NULL,
    "market_hash_name" TEXT NOT NULL,
    "float_value" DECIMAL(10,8),
    "pattern_seed" INTEGER,
    "wear" TEXT,
    "quality" TEXT,
    "custom_name" TEXT,
    "stickers" JSONB,
    "can_trade" BOOLEAN NOT NULL DEFAULT true,
    "trade_hold_until" TIMESTAMP(3),
    "current_value" DECIMAL(10,2),
    "best_platform" TEXT,
    "acquired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_search_name_idx" ON "Item"("search_name");

-- CreateIndex
CREATE INDEX "Item_type_rarity_idx" ON "Item"("type", "rarity");

-- CreateIndex
CREATE INDEX "Item_weapon_type_idx" ON "Item"("weapon_type");

-- CreateIndex
CREATE INDEX "Item_collection_id_idx" ON "Item"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_quality_wear_key" ON "Item"("name", "quality", "wear");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_slug_idx" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_release_date_idx" ON "Collection"("release_date");

-- CreateIndex
CREATE UNIQUE INDEX "Case_slug_key" ON "Case"("slug");

-- CreateIndex
CREATE INDEX "Case_slug_idx" ON "Case"("slug");

-- CreateIndex
CREATE INDEX "Case_release_date_idx" ON "Case"("release_date");

-- CreateIndex
CREATE INDEX "CaseItem_case_id_idx" ON "CaseItem"("case_id");

-- CreateIndex
CREATE INDEX "CaseItem_item_id_idx" ON "CaseItem"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "CaseItem_case_id_item_id_key" ON "CaseItem"("case_id", "item_id");

-- CreateIndex
CREATE INDEX "MarketplacePrice_item_id_idx" ON "MarketplacePrice"("item_id");

-- CreateIndex
CREATE INDEX "MarketplacePrice_platform_idx" ON "MarketplacePrice"("platform");

-- CreateIndex
CREATE INDEX "MarketplacePrice_total_cost_idx" ON "MarketplacePrice"("total_cost");

-- CreateIndex
CREATE INDEX "MarketplacePrice_last_updated_idx" ON "MarketplacePrice"("last_updated");

-- CreateIndex
CREATE INDEX "MarketplacePrice_item_id_total_cost_idx" ON "MarketplacePrice"("item_id", "total_cost");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplacePrice_item_id_platform_key" ON "MarketplacePrice"("item_id", "platform");

-- CreateIndex
CREATE INDEX "PlatformFeeConfig_platform_idx" ON "PlatformFeeConfig"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "User_steam_id_key" ON "User"("steam_id");

-- CreateIndex
CREATE INDEX "User_steam_id_idx" ON "User"("steam_id");

-- CreateIndex
CREATE INDEX "User_last_login_idx" ON "User"("last_login");

-- CreateIndex
CREATE INDEX "Account_user_id_idx" ON "Account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_provider_account_id_key" ON "Account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_user_id_key" ON "UserInventory"("user_id");

-- CreateIndex
CREATE INDEX "UserInventory_user_id_idx" ON "UserInventory"("user_id");

-- CreateIndex
CREATE INDEX "UserInventory_last_synced_idx" ON "UserInventory"("last_synced");

-- CreateIndex
CREATE INDEX "UserInventory_sync_status_idx" ON "UserInventory"("sync_status");

-- CreateIndex
CREATE INDEX "UserInventory_scheduled_delete_idx" ON "UserInventory"("scheduled_delete");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_steam_asset_id_key" ON "InventoryItem"("steam_asset_id");

-- CreateIndex
CREATE INDEX "InventoryItem_inventory_id_idx" ON "InventoryItem"("inventory_id");

-- CreateIndex
CREATE INDEX "InventoryItem_item_id_idx" ON "InventoryItem"("item_id");

-- CreateIndex
CREATE INDEX "InventoryItem_current_value_idx" ON "InventoryItem"("current_value");

-- CreateIndex
CREATE INDEX "InventoryItem_market_hash_name_idx" ON "InventoryItem"("market_hash_name");

-- CreateIndex
CREATE INDEX "InventoryItem_trade_hold_until_idx" ON "InventoryItem"("trade_hold_until");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_inventory_id_steam_asset_id_key" ON "InventoryItem"("inventory_id", "steam_asset_id");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseItem" ADD CONSTRAINT "CaseItem_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseItem" ADD CONSTRAINT "CaseItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePrice" ADD CONSTRAINT "MarketplacePrice_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "UserInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

