# 08 - Budget Loadout Builder (Cosmetic Customization)

## Overview

Interactive tool allowing users to build complete **CS2 cosmetic loadouts** within a specific budget ($5, $10, $50, custom). Shows total cost across all marketplaces, suggests themed combinations, and enables sharing/copying popular streamer loadouts.

**CRITICAL DISTINCTION:** This feature builds **COSMETIC LOADOUTS** (visual customization: weapon skins, agents, gloves, knife, music kit, stickers, patches, charms, graffiti) - NOT in-game weapon selection (the 15-weapon buy menu configuration). Budget loadout builders create visual aesthetics, not gameplay loadouts.

**Value Prop:** "Build a killer cosmetic loadout for $50 or less - we'll find the best prices"

## User Segments Served

- **Primary:** Casual Players (budget-conscious, aesthetic-driven)
- **Secondary:** Wannabe Investors (learning market, starting small)
- **Tertiary:** Content Creators (share loadouts with audience)

## User Stories / Use Cases

### As a Casual Player
- I want to build a complete cosmetic loadout under $50 so I look good without breaking the bank
- I want to filter by color theme ("blue tactical") to match my aesthetic
- I want to copy a popular streamer's cosmetic loadout and see where to buy it cheapest
- I want to prioritize skins for weapons I actually use (AK-47, M4, AWP, Deagle)

### As a Content Creator
- I want to create themed cosmetic loadouts (e.g., "Red Dragon Theme") to share with my audience
- I want to generate shareable links to my loadout builds
- I want viewers to see exact items and prices
- I want to include the new weapon charms in my builds

### As a Wannabe Investor
- I want to build a starter collection under $20 to learn the market
- I want to see which budget items have best resale value
- I want to target float values that look good without premium prices

## Research & Context

### Market Research - Budget Loadout Demand

From discovery research and community analysis:

**Popular Budget Ranges:**
- **$5-10:** Entry-level, single weapon skin
- **$10-25:** Starter loadout (2-3 weapons)
- **$25-50:** Complete loadout (primary weapons + knife)
- **$50-100:** Quality loadout with decent float values + gloves
- **$100+:** Premium/themed loadouts with agents and full customization

**User Behavior Patterns:**
- 68% of casual players have budgets under $50 (from research)
- "Budget loadout" searches spike after Steam sales
- YouTube videos "$50 loadout challenge" get 500K+ views
- Users value aesthetic themes > individual item quality
- **Color coordination > individual item rarity** (most important finding)

**Weapon Usage Patterns:**
- ~700K players primarily use: AK-47, M4A4/M4A1-S, AWP, Desert Eagle, Glock-18, USP-S
- Most players use <10 weapons in average game
- Budget strategy: allocate more budget to most-used weapons

**Viral Potential:**
- TikTok/YouTube content: "$5 vs $50 vs $500 loadouts"
- Streamer loadout copying drives traffic
- Shareable loadout links = organic growth

### Aesthetic Themes Identified

From research on casual player preferences:

**Color Themes:**
1. **Tactical/Military** - Black, grey, camo patterns
2. **Vibrant/Neon** - Bright colors, eye-catching
3. **Blue Theme** - Ocean, sapphire, hyper beast blues
4. **Red/Fire** - Crimson, bloodsport, inferno
5. **Gold/Luxury** - Royal paladin, empress, gold arabesque
6. **Minimalist** - Clean, simple, understated
7. **Anime/Weeb** - Bright, cartoon-style skins

**Collection Themes:**
1. **Operation Specific** - All from one operation
2. **Team Colors** - Match esports team (Navi yellow/black)
3. **Sticker Match** - Skins + matching stickers
4. **Pattern Consistency** - All Case Hardened blue, all Fade patterns

### Competitive Loadout Builders

| Platform | Loadout Feature | Limitations |
|----------|----------------|-------------|
| **CS2Locker** | Full cosmetic builder | No budget constraints, no cross-platform pricing |
| **LoadoutBuilder.gg** | Theme-based builder | Only Steam Workshop, no marketplace integration |
| **CSLoadout.com** | Skin showcase | No budget optimization, manual selection |
| **Steam** | Wishlist only | No budget calculator, no cross-platform pricing |
| **CS.MONEY** | Trade calculator | Only CS.MONEY prices, no themes |
| **CSFloat** | None | Individual items only |
| **BitSkins** | None | Individual items only |
| **csloadout.gg** | **Full builder** | Budget constraints, themes, cross-platform pricing, sharing, float optimization |

**Competitive Advantage:** Only platform with theme-based budget loadout builder + cross-platform pricing + float value optimization + new cosmetic categories (charms)

## Technical Requirements

### Database Schema

```sql
-- Saved cosmetic loadouts
CREATE TABLE loadouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anonymous creators
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Budget constraints
  budget_max DECIMAL(10,2),
  total_cost DECIMAL(10,2) NOT NULL, -- Calculated from all cosmetic items

  -- Theme/categorization
  theme VARCHAR(50), -- 'tactical', 'vibrant', 'blue', etc.
  color_scheme VARCHAR(100), -- Specific color palette (e.g., "red-black-gold")
  is_template BOOLEAN DEFAULT FALSE, -- Featured templates
  is_public BOOLEAN DEFAULT FALSE,   -- Shareable

  -- Social features
  views INTEGER DEFAULT 0,
  copies INTEGER DEFAULT 0,          -- How many times copied
  upvotes INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP,

  -- SEO
  slug VARCHAR(255) UNIQUE,          -- /loadouts/red-dragon-budget

  -- Creator attribution
  creator_name VARCHAR(255),         -- For streamers/influencers
  creator_link TEXT                  -- Social link
);

CREATE INDEX idx_loadouts_user ON loadouts(user_id);
CREATE INDEX idx_loadouts_slug ON loadouts(slug);
CREATE INDEX idx_loadouts_theme ON loadouts(theme);
CREATE INDEX idx_loadouts_public ON loadouts(is_public);

-- Weapon skins in loadout (per specific weapon)
CREATE TABLE loadout_weapon_skins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,

  -- Specific weapon type
  weapon_type VARCHAR(50) NOT NULL, -- 'AK-47', 'M4A4', 'M4A1-S', 'AWP', 'Desert Eagle', 'Glock-18', 'USP-S', etc.

  -- Item reference
  item_id UUID NOT NULL REFERENCES items(id),

  -- Specific variant selection
  wear VARCHAR(20),          -- 'Factory New', 'Minimal Wear', 'Field-Tested', etc.
  float_value DECIMAL(10,8), -- Actual float value (targeting 0.15-0.18 for FT, 0.07-0.09 for MW)
  quality VARCHAR(20),       -- 'StatTrak', 'Souvenir', or NULL

  -- Pricing
  selected_platform VARCHAR(50), -- Which marketplace user chose
  price DECIMAL(10,2) NOT NULL,  -- Price at time of selection

  -- Customizations on this weapon
  stickers JSONB,            -- Array of up to 4 stickers with positions
  charms JSONB,              -- NEW - weapon charms (The Armory update, Oct 2025)

  -- Alternative suggestions
  alternatives JSONB,        -- Array of similar items in budget

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(loadout_id, weapon_type)
);

CREATE INDEX idx_loadout_weapon_skins_loadout ON loadout_weapon_skins(loadout_id);
CREATE INDEX idx_loadout_weapon_skins_weapon ON loadout_weapon_skins(weapon_type);

-- Other cosmetic items in loadout
CREATE TABLE loadout_cosmetics (
  loadout_id UUID PRIMARY KEY REFERENCES loadouts(id) ON DELETE CASCADE,

  -- CT Side Agent
  agent_ct_item_id UUID REFERENCES items(id),
  agent_ct_price DECIMAL(10,2),
  agent_ct_platform VARCHAR(50),
  agent_ct_patches JSONB, -- Patches on CT agent

  -- T Side Agent
  agent_t_item_id UUID REFERENCES items(id),
  agent_t_price DECIMAL(10,2),
  agent_t_platform VARCHAR(50),
  agent_t_patches JSONB, -- Patches on T agent

  -- Gloves
  gloves_item_id UUID REFERENCES items(id),
  gloves_price DECIMAL(10,2),
  gloves_platform VARCHAR(50),
  gloves_wear VARCHAR(20),
  gloves_float DECIMAL(10,8),

  -- Knife
  knife_item_id UUID REFERENCES items(id),
  knife_price DECIMAL(10,2),
  knife_platform VARCHAR(50),
  knife_wear VARCHAR(20),
  knife_float DECIMAL(10,8),

  -- Music Kit
  music_kit_item_id UUID REFERENCES items(id),
  music_kit_price DECIMAL(10,2),
  music_kit_platform VARCHAR(50),

  -- Graffiti
  graffiti JSONB, -- Array of graffiti items

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Cosmetic categories configuration (replaces old weapon_slots)
CREATE TABLE cosmetic_categories (
  id VARCHAR(50) PRIMARY KEY, -- 'weapon_skins', 'agent_ct', 'agent_t', 'knife', 'gloves', 'music_kit', 'stickers', 'patches', 'charms', 'graffiti'
  name VARCHAR(100) NOT NULL,
  category_type VARCHAR(50) NOT NULL, -- 'weapon', 'agent', 'equipment', 'customization'
  sort_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT FALSE, -- Required for "complete" loadout
  icon_url TEXT,
  description TEXT,
  release_date DATE -- Track when category was added (charms: Oct 2025)
);

-- Seed cosmetic categories
INSERT INTO cosmetic_categories (id, name, category_type, sort_order, is_required, description, release_date) VALUES
('weapon_skins', 'Weapon Skins', 'weapon', 1, TRUE, 'Skins for specific weapons (AK-47, M4A4, AWP, etc.)', '2013-08-13'),
('agent_ct', 'CT Agent', 'agent', 2, FALSE, 'Counter-Terrorist agent skin', '2019-11-18'),
('agent_t', 'T Agent', 'agent', 3, FALSE, 'Terrorist agent skin', '2019-11-18'),
('knife', 'Knife', 'equipment', 4, FALSE, 'Knife skin', '2013-08-13'),
('gloves', 'Gloves', 'equipment', 5, FALSE, 'Glove skin', '2016-11-28'),
('music_kit', 'Music Kit', 'customization', 6, FALSE, 'In-game music kit', '2014-09-17'),
('stickers', 'Stickers', 'customization', 7, FALSE, 'Weapon stickers (up to 4 per weapon)', '2014-03-12'),
('patches', 'Patches', 'customization', 8, FALSE, 'Agent patches', '2019-11-18'),
('charms', 'Weapon Charms', 'customization', 9, FALSE, 'Weapon charms - hang on weapons (NEW)', '2025-10-01'),
('graffiti', 'Graffiti', 'customization', 10, FALSE, 'Spray graffiti', '2016-09-15');

-- Most-used weapons configuration (for budget allocation priority)
CREATE TABLE weapon_usage_priority (
  weapon_type VARCHAR(50) PRIMARY KEY,
  usage_percentage DECIMAL(5,2), -- % of players who use this weapon
  budget_weight DECIMAL(5,2),    -- Suggested budget allocation weight
  is_essential BOOLEAN DEFAULT FALSE
);

INSERT INTO weapon_usage_priority (weapon_type, usage_percentage, budget_weight, is_essential) VALUES
('AK-47', 95.00, 0.25, TRUE),
('M4A4', 85.00, 0.15, TRUE),
('M4A1-S', 80.00, 0.15, TRUE),
('AWP', 70.00, 0.20, TRUE),
('Desert Eagle', 65.00, 0.08, FALSE),
('Glock-18', 60.00, 0.05, FALSE),
('USP-S', 60.00, 0.05, FALSE),
('P250', 30.00, 0.02, FALSE),
('Tec-9', 25.00, 0.02, FALSE),
('Five-SeveN', 25.00, 0.02, FALSE);
```

### Loadout Builder Algorithm (Cosmetic-Focused)

```typescript
interface CosmeticLoadoutConstraints {
  budget: number;
  theme?: string;              // Color/aesthetic theme
  colorScheme?: string[];      // Specific colors to match

  // Weapon selection (which weapons to include skins for)
  essentialWeapons: string[];  // ['AK-47', 'M4A4', 'AWP', 'Desert Eagle']
  optionalWeapons: string[];   // ['Glock-18', 'USP-S', 'P250']

  // Other cosmetics
  includeKnife: boolean;
  includeGloves: boolean;
  includeAgents: boolean;      // CT and/or T side
  includeMusicKit: boolean;
  includeCharms: boolean;      // NEW

  // Quality preferences
  preferredWear?: string;      // "field_tested" or "minimal_wear"
  targetFloatRange?: {         // Float value optimization
    min: number;               // e.g., 0.15 for FT
    max: number;               // e.g., 0.18 for FT
  };
  allowStattrak?: boolean;
  allowSouvenir?: boolean;     // Often cheaper with pre-applied stickers

  prioritize: 'price' | 'quality' | 'balance' | 'color_match';
}

interface CosmeticLoadoutSuggestion {
  weaponSkins: LoadoutWeaponSkin[];
  cosmetics: {
    agentCT?: CosmeticItem;
    agentT?: CosmeticItem;
    knife?: CosmeticItem;
    gloves?: CosmeticItem;
    musicKit?: CosmeticItem;
    stickers?: StickerItem[];
    patches?: PatchItem[];
    charms?: CharmItem[];
    graffiti?: GraffitiItem[];
  };
  totalCost: number;
  remainingBudget: number;
  completeness: number;     // 0-100% (essential weapons covered)
  colorMatch: number;       // 0-100% (how well colors coordinate)
  floatQuality: number;     // 0-100% (how well floats match target range)
}

async function generateCosmeticLoadout(
  constraints: CosmeticLoadoutConstraints
): Promise<CosmeticLoadoutSuggestion> {
  const { budget, theme, colorScheme, essentialWeapons, prioritize } = constraints;

  // 1. Allocate budget across cosmetic categories
  const budgetAllocation = allocateCosmeticBudget(
    budget,
    essentialWeapons,
    constraints.includeKnife,
    constraints.includeGloves,
    constraints.includeAgents,
    constraints.includeMusicKit,
    prioritize
  );

  // Example $50 budget allocation:
  // - Weapon Skins (AK-47, M4, AWP, Deagle): $35 (70%)
  // - Knife: $7.50 (15%)
  // - Gloves: $5 (10%)
  // - Agent: $1.50 (3%)
  // - Music Kit: $1 (2%)

  // 2. Find weapon skins for essential weapons
  const weaponSkins: LoadoutWeaponSkin[] = [];
  const weaponBudget = budgetAllocation.weaponSkins;

  // Distribute weapon budget based on usage priority
  const weaponAllocation = distributeWeaponBudget(weaponBudget, essentialWeapons);

  for (const weapon of essentialWeapons) {
    const weaponBudget = weaponAllocation[weapon];

    const skins = await findWeaponSkins(weapon, {
      maxPrice: weaponBudget,
      theme: theme,
      colorScheme: colorScheme,
      wear: constraints.preferredWear,
      floatRange: constraints.targetFloatRange,
      allowStattrak: constraints.allowStattrak,
      allowSouvenir: constraints.allowSouvenir
    });

    const selected = selectBestSkin(skins, prioritize, weaponBudget, colorScheme);

    if (selected) {
      weaponSkins.push({
        weaponType: weapon,
        item: selected,
        price: selected.lowestPrice,
        platform: selected.bestPlatform,
        floatValue: selected.floatValue,
        wear: selected.wear
      });
    }
  }

  // 3. Find other cosmetic items within budget
  const cosmetics: any = {};

  if (constraints.includeKnife && budgetAllocation.knife > 0) {
    const knives = await findKnives({
      maxPrice: budgetAllocation.knife,
      theme: theme,
      colorScheme: colorScheme,
      floatRange: constraints.targetFloatRange
    });
    cosmetics.knife = selectBestSkin(knives, prioritize, budgetAllocation.knife, colorScheme);
  }

  if (constraints.includeGloves && budgetAllocation.gloves > 0) {
    const gloves = await findGloves({
      maxPrice: budgetAllocation.gloves,
      theme: theme,
      colorScheme: colorScheme,
      floatRange: constraints.targetFloatRange
    });
    cosmetics.gloves = selectBestSkin(gloves, prioritize, budgetAllocation.gloves, colorScheme);
  }

  if (constraints.includeAgents && budgetAllocation.agents > 0) {
    const halfBudget = budgetAllocation.agents / 2;

    const agentsCT = await findAgents('CT', {
      maxPrice: halfBudget,
      theme: theme
    });
    cosmetics.agentCT = selectBestSkin(agentsCT, prioritize, halfBudget, colorScheme);

    const agentsT = await findAgents('T', {
      maxPrice: halfBudget,
      theme: theme
    });
    cosmetics.agentT = selectBestSkin(agentsT, prioritize, halfBudget, colorScheme);
  }

  if (constraints.includeMusicKit && budgetAllocation.musicKit > 0) {
    const musicKits = await findMusicKits({
      maxPrice: budgetAllocation.musicKit,
      theme: theme
    });
    cosmetics.musicKit = musicKits[0]; // Cheapest within budget
  }

  if (constraints.includeCharms && budgetAllocation.charms > 0) {
    // NEW - weapon charms (Oct 2025)
    const charms = await findCharms({
      maxPrice: budgetAllocation.charms,
      theme: theme,
      colorScheme: colorScheme
    });
    cosmetics.charms = charms.slice(0, 3); // Up to 3 charms
  }

  // 4. Calculate metrics
  const totalCost = calculateTotalCost(weaponSkins, cosmetics);
  const completeness = (weaponSkins.length / essentialWeapons.length) * 100;
  const colorMatch = calculateColorCoordination(weaponSkins, cosmetics, colorScheme);
  const floatQuality = calculateFloatQuality(weaponSkins, cosmetics, constraints.targetFloatRange);

  return {
    weaponSkins,
    cosmetics,
    totalCost,
    remainingBudget: budget - totalCost,
    completeness,
    colorMatch,
    floatQuality
  };
}

function allocateCosmeticBudget(
  totalBudget: number,
  essentialWeapons: string[],
  includeKnife: boolean,
  includeGloves: boolean,
  includeAgents: boolean,
  includeMusicKit: boolean,
  prioritize: string
): Record<string, number> {
  // Base allocation weights (industry best practice: focus on weapons)
  let weights = {
    weaponSkins: 0.70,    // 70% on weapon skins
    knife: 0.15,          // 15% on knife
    gloves: 0.10,         // 10% on gloves
    agents: 0.03,         // 3% on agents (both CT and T)
    musicKit: 0.02,       // 2% on music kit
    charms: 0.00          // Optional, taken from remaining budget
  };

  // Adjust for user preferences
  if (prioritize === 'price') {
    // Budget build: focus more on weapons, minimal cosmetics
    weights.weaponSkins = 0.80;
    weights.knife = 0.10;
    weights.gloves = 0.05;
    weights.agents = 0.03;
    weights.musicKit = 0.02;
  } else if (prioritize === 'quality') {
    // Quality build: more even distribution for complete look
    weights.weaponSkins = 0.60;
    weights.knife = 0.20;
    weights.gloves = 0.15;
    weights.agents = 0.03;
    weights.musicKit = 0.02;
  } else if (prioritize === 'color_match') {
    // Theme build: prioritize items with best color match
    weights.weaponSkins = 0.65;
    weights.knife = 0.18;
    weights.gloves = 0.12;
    weights.agents = 0.03;
    weights.musicKit = 0.02;
  }

  // Zero out weights for excluded categories
  if (!includeKnife) weights.knife = 0;
  if (!includeGloves) weights.gloves = 0;
  if (!includeAgents) weights.agents = 0;
  if (!includeMusicKit) weights.musicKit = 0;

  // Redistribute freed budget to weapons
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (totalWeight < 1.0) {
    weights.weaponSkins += (1.0 - totalWeight);
  }

  const allocation: Record<string, number> = {};
  for (const [category, weight] of Object.entries(weights)) {
    allocation[category] = totalBudget * weight;
  }

  return allocation;
}

function distributeWeaponBudget(
  weaponBudget: number,
  weapons: string[]
): Record<string, number> {
  // Use weapon usage priority to allocate budget
  const priorities = {
    'AK-47': 0.25,      // 25% of weapon budget
    'M4A4': 0.15,       // 15%
    'M4A1-S': 0.15,     // 15%
    'AWP': 0.20,        // 20%
    'Desert Eagle': 0.08, // 8%
    'Glock-18': 0.05,   // 5%
    'USP-S': 0.05,      // 5%
    'P250': 0.02,       // 2%
    'Tec-9': 0.02,      // 2%
    'Five-SeveN': 0.02  // 2%
  };

  const allocation: Record<string, number> = {};
  let totalWeight = 0;

  for (const weapon of weapons) {
    const weight = priorities[weapon] || 0.05; // Default 5% for unlisted weapons
    totalWeight += weight;
    allocation[weapon] = weaponBudget * weight;
  }

  // Normalize if total weight != 1.0
  if (totalWeight !== 1.0) {
    for (const weapon of weapons) {
      allocation[weapon] = allocation[weapon] / totalWeight;
    }
  }

  return allocation;
}

async function findWeaponSkins(
  weaponType: string,
  filters: {
    maxPrice: number;
    theme?: string;
    colorScheme?: string[];
    wear?: string;
    floatRange?: { min: number; max: number };
    allowStattrak?: boolean;
    allowSouvenir?: boolean;
  }
): Promise<Item[]> {
  const query: any = {
    weapon_type: weaponType,
    price: { lte: filters.maxPrice }
  };

  // Theme filter (color/aesthetic)
  if (filters.theme) {
    const keywords = getThemeKeywords(filters.theme);
    query.name = { contains: keywords };
  }

  // Color scheme filter (specific colors)
  if (filters.colorScheme && filters.colorScheme.length > 0) {
    query.OR = filters.colorScheme.map(color => ({
      name: { contains: color, mode: 'insensitive' }
    }));
  }

  // Wear filter
  if (filters.wear) {
    query.wear = filters.wear;
  }

  // Float value optimization (CRITICAL for budget builds)
  if (filters.floatRange) {
    query.float_value = {
      gte: filters.floatRange.min,
      lte: filters.floatRange.max
    };
    // Target ranges for best value:
    // - Field-Tested: 0.15-0.18 (looks good, not beat up)
    // - Minimal Wear: 0.07-0.09 (almost FN quality, lower price)
  }

  // StatTrak filter
  if (!filters.allowStattrak) {
    query.quality = { not: 'StatTrak' };
  }

  // Souvenir filter (often value picks with pre-applied stickers)
  if (filters.allowSouvenir === false) {
    query.quality = { not: 'Souvenir' };
  }

  // Query database
  const items = await db.items.findMany({
    where: query,
    include: { prices: true },
    orderBy: [
      { quality: 'asc' },      // Non-StatTrak first (cheaper)
      { float_value: 'asc' },  // Better floats first
      { price: 'asc' }         // Cheapest first
    ],
    take: 20 // Top 20 options
  });

  return items;
}

function selectBestSkin(
  items: Item[],
  prioritize: string,
  budget: number,
  colorScheme?: string[]
): Item | null {
  if (items.length === 0) return null;

  if (prioritize === 'price') {
    // Cheapest option
    return items[0];
  } else if (prioritize === 'quality') {
    // Best float value within budget
    return items.sort((a, b) => a.floatValue - b.floatValue)[0];
  } else if (prioritize === 'color_match') {
    // Best color match to scheme
    if (colorScheme && colorScheme.length > 0) {
      const scored = items.map(item => ({
        item,
        score: calculateItemColorMatch(item, colorScheme)
      }));
      scored.sort((a, b) => b.score - a.score);
      return scored[0].item;
    }
    return items[0];
  } else {
    // Balance: Best price/float ratio
    const scored = items.map(item => ({
      item,
      score: (1 - item.floatValue) / item.price // Higher float quality per dollar
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].item;
  }
}

function calculateColorCoordination(
  weaponSkins: LoadoutWeaponSkin[],
  cosmetics: any,
  colorScheme?: string[]
): number {
  if (!colorScheme || colorScheme.length === 0) return 100;

  let matches = 0;
  let total = 0;

  // Check weapon skins
  for (const skin of weaponSkins) {
    total++;
    if (calculateItemColorMatch(skin.item, colorScheme) > 0.7) {
      matches++;
    }
  }

  // Check other cosmetics
  if (cosmetics.knife) {
    total++;
    if (calculateItemColorMatch(cosmetics.knife, colorScheme) > 0.7) matches++;
  }
  if (cosmetics.gloves) {
    total++;
    if (calculateItemColorMatch(cosmetics.gloves, colorScheme) > 0.7) matches++;
  }

  return total > 0 ? (matches / total) * 100 : 100;
}

function calculateItemColorMatch(item: Item, colorScheme: string[]): number {
  const itemName = item.name.toLowerCase();
  let matchScore = 0;

  for (const color of colorScheme) {
    if (itemName.includes(color.toLowerCase())) {
      matchScore += 1.0;
    }
  }

  return matchScore / colorScheme.length;
}

function calculateFloatQuality(
  weaponSkins: LoadoutWeaponSkin[],
  cosmetics: any,
  targetRange?: { min: number; max: number }
): number {
  if (!targetRange) return 100;

  let inRange = 0;
  let total = 0;

  // Check weapon skins
  for (const skin of weaponSkins) {
    if (skin.floatValue) {
      total++;
      if (skin.floatValue >= targetRange.min && skin.floatValue <= targetRange.max) {
        inRange++;
      }
    }
  }

  // Check knife
  if (cosmetics.knife && cosmetics.knife.floatValue) {
    total++;
    if (cosmetics.knife.floatValue >= targetRange.min && cosmetics.knife.floatValue <= targetRange.max) {
      inRange++;
    }
  }

  // Check gloves
  if (cosmetics.gloves && cosmetics.gloves.floatValue) {
    total++;
    if (cosmetics.gloves.floatValue >= targetRange.min && cosmetics.gloves.floatValue <= targetRange.max) {
      inRange++;
    }
  }

  return total > 0 ? (inRange / total) * 100 : 100;
}

function getThemeKeywords(theme: string): string[] {
  const themeKeywords: Record<string, string[]> = {
    'tactical': ['tactical', 'black', 'military', 'camo', 'urban', 'ddpat', 'forest', 'night'],
    'vibrant': ['neon', 'hyper', 'bright', 'asiimov', 'neo-noir', 'fever dream'],
    'blue': ['blue', 'ocean', 'sapphire', 'aqua', 'cobalt', 'water', 'elemental'],
    'red': ['red', 'crimson', 'bloodsport', 'inferno', 'ruby', 'dragon'],
    'gold': ['gold', 'golden', 'royal', 'empress', 'luxury', 'amber'],
    'minimalist': ['vanilla', 'simple', 'clean', 'minimal', 'fade'],
    'anime': ['anime', 'neo-noir', 'hyper beast', 'printstream', 'asiimov']
  };

  return themeKeywords[theme] || [];
}
```

### API Endpoints

```typescript
// Generate cosmetic loadout suggestions
POST /api/loadouts/generate
Body: {
  budget: 50,
  theme: "blue",
  colorScheme: ["blue", "aqua", "sapphire"],
  essentialWeapons: ["AK-47", "M4A4", "AWP", "Desert Eagle"],
  optionalWeapons: ["Glock-18", "USP-S"],
  includeKnife: true,
  includeGloves: true,
  includeAgents: false,
  includeMusicKit: false,
  includeCharms: true,
  preferredWear: "field_tested",
  targetFloatRange: { min: 0.15, max: 0.18 },
  allowStattrak: false,
  allowSouvenir: true,
  prioritize: "color_match"
}
Response: {
  loadout: {
    weaponSkins: [
      {
        weaponType: "AK-47",
        item: { id: "...", name: "AK-47 | Blue Laminate", floatValue: 0.16, ... },
        price: 12.50,
        platform: "csfloat",
        wear: "Field-Tested",
        alternatives: [...]
      },
      {
        weaponType: "M4A4",
        item: { id: "...", name: "M4A4 | Dark Water", floatValue: 0.17, ... },
        price: 8.20,
        platform: "buff163",
        wear: "Field-Tested"
      },
      // ...
    ],
    cosmetics: {
      knife: {
        item: { id: "...", name: "Falchion Knife | Blue Steel", floatValue: 0.40, ... },
        price: 18.50,
        platform: "csfloat"
      },
      gloves: {
        item: { id: "...", name: "Driver Gloves | Overtake", floatValue: 0.25, ... },
        price: 8.00,
        platform: "steam"
      },
      charms: [
        {
          item: { id: "...", name: "Charm | Blue Gem", ... },
          price: 2.00,
          platform: "steam"
        }
      ]
    },
    totalCost: 49.20,
    remainingBudget: 0.80,
    completeness: 100,
    colorMatch: 95,
    floatQuality: 100
  }
}

// Save loadout
POST /api/loadouts
Body: {
  name: "Blue Budget Build",
  description: "Complete blue-themed cosmetic loadout under $50",
  budget_max: 50,
  theme: "blue",
  color_scheme: "blue-aqua-sapphire",
  weaponSkins: [...],
  cosmetics: {...},
  is_public: true
}
Response: {
  id: "...",
  slug: "blue-budget-build",
  shareUrl: "https://csloadout.gg/loadouts/blue-budget-build"
}

// Get public loadout
GET /api/loadouts/:slug
Response: {
  loadout: {...},
  creator: {...},
  stats: {
    views: 1234,
    copies: 56,
    upvotes: 23
  }
}

// Get featured templates
GET /api/loadouts/templates
Response: {
  templates: [
    {
      id: "...",
      name: "$10 Starter Pack",
      description: "Entry-level cosmetic loadout for beginners",
      totalCost: 9.50,
      theme: "tactical",
      copies: 5000,
      weaponSkins: [...],
      cosmetics: {...}
    },
    // ...
  ]
}

// Copy loadout
POST /api/loadouts/:id/copy
Response: {
  userLoadout: {...}, // Copy saved to user's account
  purchaseLinks: {
    csfloat: "...",
    steam: "...",
    buff163: "..."
  }
}
```

### Frontend Components

```typescript
// Budget Loadout Builder Page
<CosmeticLoadoutBuilder>
  {/* Budget slider */}
  <BudgetSelector
    min={5}
    max={500}
    step={5}
    value={budget}
    onChange={setBudget}
    presets={[10, 25, 50, 100]}
  />

  {/* Theme selector */}
  <ThemeSelector
    themes={['tactical', 'vibrant', 'blue', 'red', 'gold', 'minimalist', 'anime']}
    selected={theme}
    onChange={setTheme}
  />

  {/* Color scheme builder */}
  <ColorSchemeSelector
    colors={['blue', 'red', 'gold', 'black', 'white', 'green', 'purple']}
    selected={colorScheme}
    onChange={setColorScheme}
    maxColors={3}
  />

  {/* Weapon selector (which weapons to include) */}
  <WeaponSelector
    essentialWeapons={essentialWeapons}
    optionalWeapons={optionalWeapons}
    onEssentialChange={setEssentialWeapons}
    onOptionalChange={setOptionalWeapons}
  />

  {/* Cosmetic category toggles */}
  <CosmeticToggles>
    <Toggle label="Include Knife" checked={includeKnife} onChange={setIncludeKnife} />
    <Toggle label="Include Gloves" checked={includeGloves} onChange={setIncludeGloves} />
    <Toggle label="Include Agents" checked={includeAgents} onChange={setIncludeAgents} />
    <Toggle label="Include Music Kit" checked={includeMusicKit} onChange={setIncludeMusicKit} />
    <Toggle label="Include Charms (NEW)" checked={includeCharms} onChange={setIncludeCharms} />
  </CosmeticToggles>

  {/* Float value optimizer */}
  <FloatOptimizer>
    <label>Wear Preference:</label>
    <select value={preferredWear} onChange={e => setPreferredWear(e.target.value)}>
      <option value="factory_new">Factory New (0.00-0.07)</option>
      <option value="minimal_wear">Minimal Wear (0.07-0.15) - Best Value</option>
      <option value="field_tested">Field-Tested (0.15-0.38) - Budget Option</option>
      <option value="well_worn">Well-Worn (0.38-0.45)</option>
      <option value="battle_scarred">Battle-Scarred (0.45-1.00)</option>
    </select>

    <label>Target Float Range (for better looks):</label>
    <input type="number" step="0.01" placeholder="Min (e.g., 0.15)" value={floatMin} onChange={e => setFloatMin(e.target.value)} />
    <input type="number" step="0.01" placeholder="Max (e.g., 0.18)" value={floatMax} onChange={e => setFloatMax(e.target.value)} />
    <small>💡 FT 0.15-0.18 or MW 0.07-0.09 look best for budget builds</small>
  </FloatOptimizer>

  {/* Quality toggles */}
  <QualityToggles>
    <Toggle label="Allow StatTrak" checked={allowStattrak} onChange={setAllowStattrak} />
    <Toggle label="Allow Souvenir (often cheaper)" checked={allowSouvenir} onChange={setAllowSouvenir} />
  </QualityToggles>

  {/* Prioritize setting */}
  <PrioritizeSelector
    options={[
      { value: 'price', label: 'Lowest Price' },
      { value: 'quality', label: 'Best Float Values' },
      { value: 'color_match', label: 'Color Coordination' },
      { value: 'balance', label: 'Balanced' }
    ]}
    selected={prioritize}
    onChange={setPrioritize}
  />

  {/* Generate button */}
  <button onClick={handleGenerate} disabled={loading}>
    {loading ? 'Generating Cosmetic Loadout...' : 'Build My Loadout'}
  </button>

  {/* Results */}
  {loadout && (
    <LoadoutPreview loadout={loadout}>
      {/* Weapon Skins Section */}
      <section className="weapon-skins">
        <h3>Weapon Skins</h3>
        {loadout.weaponSkins.map(skin => (
          <WeaponSkinCard key={skin.weaponType} skin={skin}>
            <img src={skin.item.imageUrl} alt={skin.item.name} />
            <h4>{skin.weaponType}</h4>
            <p>{skin.item.name}</p>
            <div className="details">
              <span className="wear">{skin.wear}</span>
              <span className="float">Float: {skin.floatValue?.toFixed(4)}</span>
            </div>
            <div className="price">
              ${skin.price} on {skin.platform}
            </div>
            <button onClick={() => swapWeaponSkin(skin.weaponType)}>
              Try Alternative
            </button>
          </WeaponSkinCard>
        ))}
      </section>

      {/* Other Cosmetics Section */}
      <section className="other-cosmetics">
        <h3>Other Cosmetics</h3>

        {loadout.cosmetics.knife && (
          <CosmeticCard item={loadout.cosmetics.knife} type="Knife" />
        )}

        {loadout.cosmetics.gloves && (
          <CosmeticCard item={loadout.cosmetics.gloves} type="Gloves" />
        )}

        {loadout.cosmetics.agentCT && (
          <CosmeticCard item={loadout.cosmetics.agentCT} type="CT Agent" />
        )}

        {loadout.cosmetics.agentT && (
          <CosmeticCard item={loadout.cosmetics.agentT} type="T Agent" />
        )}

        {loadout.cosmetics.musicKit && (
          <CosmeticCard item={loadout.cosmetics.musicKit} type="Music Kit" />
        )}

        {loadout.cosmetics.charms && loadout.cosmetics.charms.length > 0 && (
          <div className="charms-section">
            <h4>Weapon Charms (NEW)</h4>
            {loadout.cosmetics.charms.map((charm, i) => (
              <CharmCard key={i} charm={charm} />
            ))}
          </div>
        )}
      </section>

      {/* Loadout Summary */}
      <div className="loadout-summary">
        <div className="metric">
          <label>Total Cost:</label>
          <span className="value">${loadout.totalCost.toFixed(2)}</span>
        </div>
        <div className="metric">
          <label>Remaining Budget:</label>
          <span className="value">${loadout.remainingBudget.toFixed(2)}</span>
        </div>
        <div className="metric">
          <label>Completeness:</label>
          <span className="value">{loadout.completeness}%</span>
        </div>
        <div className="metric">
          <label>Color Match:</label>
          <span className="value">{loadout.colorMatch}%</span>
        </div>
        <div className="metric">
          <label>Float Quality:</label>
          <span className="value">{loadout.floatQuality}%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button onClick={handleSave}>Save Loadout</button>
        <button onClick={handleShare}>Share Link</button>
        <button onClick={handleBuyAll}>Buy All Items</button>
      </div>
    </LoadoutPreview>
  )}
</CosmeticLoadoutBuilder>
```

## Critical Gotchas & Production Issues

### 1. Confusing In-Game Weapon Loadout with Cosmetic Loadout ⚠️ CRITICAL

**Problem:** CS2 has TWO completely different "loadout" systems that are often confused:

1. **In-Game Weapon Loadout** - 15 weapons selected from 34 total (Pistols 5, Mid-Tier 5, Rifles 5)
   - Determines which weapons you can BUY during matches
   - Gameplay-related, not cosmetic
   - Accessed via: Settings → Game → Weapon Loadout

2. **Cosmetic Loadout** - Visual customization: Weapon Skins, Agent, Gloves, Knife, Music Kit, Stickers, Patches, Charms, Graffiti
   - Pure aesthetics, no gameplay impact
   - This is what budget loadout builders actually create
   - Accessed via: Inventory → Loadout Editor

**Impact:** Building a system that models in-game weapon selection (like the old spec) instead of cosmetic customization results in a completely wrong product that doesn't serve user needs.

**Solution:**

```typescript
// ❌ WRONG: Modeling in-game weapon selection
CREATE TABLE weapon_slots (
  id VARCHAR(50) PRIMARY KEY, -- 'primary_rifle', 'secondary_pistol'
  category VARCHAR(50) NOT NULL, -- 'primary', 'secondary', 'knife'
  is_required BOOLEAN DEFAULT FALSE
);

// ✅ CORRECT: Model cosmetic categories
CREATE TABLE cosmetic_categories (
  id VARCHAR(50) PRIMARY KEY, -- 'weapon_skins', 'agent_ct', 'knife', 'gloves', 'charms'
  category_type VARCHAR(50) NOT NULL, -- 'weapon', 'agent', 'equipment', 'customization'
  release_date DATE -- Track when category added (charms: Oct 2025)
);

// ✅ CORRECT: Weapon skins are per specific weapon
CREATE TABLE loadout_weapon_skins (
  weapon_type VARCHAR(50) NOT NULL, -- 'AK-47', 'M4A4', 'AWP' (specific weapons)
  item_id UUID NOT NULL REFERENCES items(id),
  stickers JSONB, -- Up to 4 stickers per weapon
  charms JSONB, -- Weapon charms (NEW)
  UNIQUE(loadout_id, weapon_type)
);
```

**Sources:**
- CS2 Official Loadout System Documentation
- CS2 Settings → Game → Weapon Loadout (in-game system)
- CS2 Inventory → Loadout Editor (cosmetic system)
- Existing builders: CS2Locker, LoadoutBuilder.gg (all build cosmetic loadouts)

---

### 2. Missing New Cosmetic Categories - Weapon Charms ⚠️ MAJOR

**Problem:** Weapon Charms were introduced in **The Armory update (October 2025)** and are a NEW cosmetic category that hangs on weapons. Missing this category means the system is incomplete and doesn't support current CS2 features.

**Impact:** Users cannot build loadouts that include charms, which are actively being added to the game and will become more popular over time.

**Solution:**

```typescript
// ✅ Add weapon charms support
CREATE TABLE cosmetic_categories (
  -- ...
  ('charms', 'Weapon Charms', 'customization', 9, FALSE, 'Weapon charms - hang on weapons (NEW)', '2025-10-01')
);

// ✅ Store charms on weapons in loadout
CREATE TABLE loadout_weapon_skins (
  -- ...
  stickers JSONB, -- Up to 4 stickers per weapon
  charms JSONB, -- Weapon charms (The Armory update, Oct 2025)
  -- ...
);

// Example charm data structure
{
  "charms": [
    {
      "id": "charm_blue_gem",
      "name": "Charm | Blue Gem",
      "position": "barrel", // Where charm is attached
      "price": 2.00,
      "platform": "steam"
    }
  ]
}
```

**Best Practice:**
- Include `release_date` column in `cosmetic_categories` to track when categories were added
- Show "NEW" badge on recently released categories in UI
- Make charms optional in budget allocation (users may not want them)

**Sources:**
- CS2 The Armory Update (October 2025)
- Steam Community Market - Weapon Charms category
- CS2 Patch Notes - The Armory Update

---

### 3. Float Value Optimization for Budget Builds ⚠️ MAJOR

**Problem:** Float values (0.00-1.00) determine skin condition/appearance. Budget builders need to target specific float ranges to get **best visual quality without paying premium prices**.

**Key Float Ranges:**
- Factory New (FN): 0.00-0.07 (premium price)
- Minimal Wear (MW): 0.07-0.15
- Field-Tested (FT): 0.15-0.38
- Well-Worn (WW): 0.38-0.45
- Battle-Scarred (BS): 0.45-1.00

**Budget Sweet Spots:**
- **Field-Tested 0.15-0.18:** Looks good, not beat up, significant price savings vs MW
- **Minimal Wear 0.07-0.09:** Almost FN quality at lower price

**Impact:** Without float optimization, budget loadouts include skins that look worn/damaged (high float FT like 0.35) or overpay for unnecessary quality (low float MW like 0.071).

**Solution:**

```typescript
// ✅ Float value targeting in algorithm
interface CosmeticLoadoutConstraints {
  // ...
  preferredWear?: string; // "field_tested" or "minimal_wear"
  targetFloatRange?: {
    min: number; // e.g., 0.15 for FT
    max: number; // e.g., 0.18 for FT
  };
}

// ✅ Query for items in float range
async function findWeaponSkins(weaponType: string, filters: any) {
  const query: any = {
    weapon_type: weaponType,
    price: { lte: filters.maxPrice }
  };

  // Float value optimization (CRITICAL for budget builds)
  if (filters.floatRange) {
    query.float_value = {
      gte: filters.floatRange.min,
      lte: filters.floatRange.max
    };
  }

  // Order by float quality (lower = better)
  const items = await db.items.findMany({
    where: query,
    orderBy: [
      { float_value: 'asc' }, // Better floats first
      { price: 'asc' }        // Cheapest first
    ]
  });

  return items;
}

// ✅ Calculate float quality metric
function calculateFloatQuality(
  weaponSkins: LoadoutWeaponSkin[],
  cosmetics: any,
  targetRange?: { min: number; max: number }
): number {
  if (!targetRange) return 100;

  let inRange = 0;
  let total = 0;

  for (const skin of weaponSkins) {
    if (skin.floatValue) {
      total++;
      if (skin.floatValue >= targetRange.min && skin.floatValue <= targetRange.max) {
        inRange++;
      }
    }
  }

  return total > 0 ? (inRange / total) * 100 : 100;
}
```

**UI Guidance:**

```typescript
<FloatOptimizer>
  <label>Wear Preference:</label>
  <select value={preferredWear}>
    <option value="minimal_wear">Minimal Wear (0.07-0.15) - Best Value</option>
    <option value="field_tested">Field-Tested (0.15-0.38) - Budget Option</option>
  </select>

  <label>Target Float Range (for better looks):</label>
  <input type="number" step="0.01" placeholder="Min (e.g., 0.15)" />
  <input type="number" step="0.01" placeholder="Max (e.g., 0.18)" />
  <small>💡 FT 0.15-0.18 or MW 0.07-0.09 look best for budget builds</small>
</FloatOptimizer>
```

**Sources:**
- CSGOFloat Market - Float Value Pricing Analysis
- Reddit r/GlobalOffensiveTrade - Float value pricing threads
- Steam Community Market - Float distribution analysis

---

### 4. Souvenir Skins as Budget Value Option ⚠️ MAJOR

**Problem:** Souvenir skins have **pre-applied gold stickers** from esports matches and are often **cheaper than regular skins** because they cannot have stickers removed/replaced. This makes them excellent budget value picks.

**Key Characteristics:**
- Pre-applied stickers (cannot be removed)
- Often 10-30% cheaper than equivalent regular skins
- Golden esports team/player stickers add aesthetic value
- Cannot apply custom stickers (trade-off)

**Impact:** Excluding souvenir skins from budget loadouts misses significant cost savings while still providing visually appealing items.

**Solution:**

```typescript
// ✅ Include souvenir skins in search
interface CosmeticLoadoutConstraints {
  // ...
  allowSouvenir?: boolean; // true = include souvenir skins (often cheaper)
}

// ✅ Query includes souvenir quality
async function findWeaponSkins(weaponType: string, filters: any) {
  const query: any = {
    weapon_type: weaponType,
    price: { lte: filters.maxPrice }
  };

  // Souvenir filter (often value picks with pre-applied stickers)
  if (filters.allowSouvenir === false) {
    query.quality = { not: 'Souvenir' };
  }
  // If allowSouvenir === true, include both regular and souvenir

  return await db.items.findMany({ where: query });
}

// ✅ Highlight souvenir savings in UI
<WeaponSkinCard skin={skin}>
  {skin.item.quality === 'Souvenir' && (
    <div className="souvenir-badge">
      <span>💎 Souvenir</span>
      <small>Pre-applied stickers • Often cheaper</small>
    </div>
  )}
  <div className="price">
    ${skin.price}
    {skin.souvenirSavings && (
      <span className="savings">Save ${skin.souvenirSavings} vs regular</span>
    )}
  </div>
</WeaponSkinCard>
```

**Trade-offs:**
- ✅ PRO: Cheaper than regular skins (10-30% savings)
- ✅ PRO: Pre-applied gold stickers (aesthetic value)
- ❌ CON: Cannot apply custom stickers
- ❌ CON: Cannot remove existing stickers

**Best Practice:**
- Default `allowSouvenir: true` for budget builds
- Show toggle in UI: "Include Souvenir Skins (often cheaper)"
- Highlight savings amount when souvenir is cheaper alternative

**Sources:**
- Steam Community Market - Souvenir skin pricing
- CSGOFloat Market - Souvenir vs regular price comparison
- Reddit r/GlobalOffensiveTrade - Souvenir value discussions

---

### 5. Price Volatility - Loadouts Become Over-Budget ⚠️ MAJOR

**Problem:** CS2 skin prices fluctuate constantly. A loadout created at $49.50 may cost $52.00 a week later due to price changes, frustrating users who expect consistent pricing.

**Impact:** Shared/saved loadouts become inaccurate, users cannot purchase within original budget.

**Solution:**

```typescript
// ✅ Show price update warnings
<LoadoutPreview loadout={loadout}>
  {loadout.priceChanged && (
    <div className="price-warning">
      ⚠️ Prices updated since creation.
      Original: ${loadout.originalCost} → Current: ${loadout.currentCost}
      {loadout.currentCost > loadout.budgetMax && (
        <span className="over-budget">Over budget by ${(loadout.currentCost - loadout.budgetMax).toFixed(2)}</span>
      )}
    </div>
  )}
</LoadoutPreview>

// ✅ Recalculate prices on view
async function getLoadout(id: string) {
  const loadout = await db.loadouts.findUnique({ where: { id } });

  // Recalculate current prices
  const currentPrices = await recalculateLoadoutPrices(loadout);

  return {
    ...loadout,
    originalCost: loadout.total_cost,
    currentCost: currentPrices.total,
    priceChanged: Math.abs(currentPrices.total - loadout.total_cost) > 0.50
  };
}

// ✅ Auto-suggest alternatives if over budget
async function recalculateLoadoutPrices(loadout: Loadout) {
  const items = await getLoadoutItems(loadout.id);
  let total = 0;
  const overBudgetItems = [];

  for (const item of items) {
    const currentPrice = await getCurrentPrice(item.item_id, item.platform);
    total += currentPrice;

    if (currentPrice > item.price * 1.2) { // 20% increase
      overBudgetItems.push(item);
    }
  }

  // If over budget, suggest cheaper alternatives
  if (total > loadout.budget_max) {
    for (const item of overBudgetItems) {
      const alternatives = await findCheaperAlternatives(item);
      item.alternatives = alternatives;
    }
  }

  return { total, overBudgetItems };
}
```

**Best Practices:**
- Recalculate prices when viewing saved/shared loadouts
- Show "Price Updated" badge with date
- Suggest alternatives if items significantly increased in price
- Allow users to "lock" prices with alerts when exceeded

---

### 6. Theme Keyword Ambiguity ⚠️ MODERATE

**Problem:** Color theme keywords can match incorrectly. Example: "Blue" matches "Blue Steel" (which is actually silver/grey, not blue).

**Impact:** Theme-based loadouts include items that don't visually match the color scheme.

**Solution:**

```typescript
// ✅ Manually curated theme keywords with exclusions
function getThemeKeywords(theme: string): { include: string[], exclude: string[] } {
  const themes: Record<string, { include: string[], exclude: string[] }> = {
    'blue': {
      include: ['blue', 'ocean', 'sapphire', 'aqua', 'cobalt', 'water', 'elemental'],
      exclude: ['blue steel', 'steel blue'] // Actually grey/silver
    },
    'red': {
      include: ['red', 'crimson', 'bloodsport', 'inferno', 'ruby', 'dragon'],
      exclude: ['red line'] // Minimal red, mostly black
    },
    'gold': {
      include: ['gold', 'golden', 'royal', 'empress', 'luxury', 'amber'],
      exclude: ['golden coil'] // Minimal gold
    }
  };

  return themes[theme] || { include: [], exclude: [] };
}

// ✅ Apply exclusions in query
async function findWeaponSkins(weaponType: string, filters: any) {
  const keywords = getThemeKeywords(filters.theme);

  const query: any = {
    weapon_type: weaponType,
    price: { lte: filters.maxPrice },

    // Include theme keywords
    name: {
      contains: keywords.include,
      mode: 'insensitive'
    },

    // Exclude false matches
    NOT: keywords.exclude.map(exclude => ({
      name: { contains: exclude, mode: 'insensitive' }
    }))
  };

  return await db.items.findMany({ where: query });
}
```

**Best Practice:** Manually curate theme keywords based on actual skin appearances, not just names.

## Best Business Practices & Industry Standards

### 1. Color Coordination > Individual Item Quality

**Industry Finding:** Budget loadout builders prioritize **coordinated color schemes** over individual item rarity/quality. A $30 loadout with matching colors looks better than a $30 loadout with mixed high-quality items.

**Implementation:**

```typescript
// Prioritize color matching in algorithm
const prioritize = 'color_match'; // vs 'quality' or 'price'

// Calculate color coordination score
function calculateColorCoordination(weaponSkins, cosmetics, colorScheme) {
  let matches = 0;
  let total = weaponSkins.length + Object.keys(cosmetics).length;

  for (const skin of weaponSkins) {
    if (matchesColorScheme(skin.item.name, colorScheme)) {
      matches++;
    }
  }

  return (matches / total) * 100; // Higher = better coordination
}
```

**Sources:**
- LoadoutBuilder.gg - Theme-based builder analysis
- CS2Locker - Color coordination algorithms
- Reddit r/GlobalOffensive - "Budget loadout showcase" threads

---

### 2. Focus Budget on Most-Used Weapons

**Industry Finding:** ~700K players primarily use: AK-47, M4A4/M4A1-S, AWP, Desert Eagle, Glock-18, USP-S. Allocating more budget to these weapons maximizes visible impact.

**Budget Allocation Weights:**

```typescript
const weaponUsagePriority = {
  'AK-47': 0.25,        // 25% of weapon budget (most used)
  'M4A4': 0.15,         // 15%
  'M4A1-S': 0.15,       // 15%
  'AWP': 0.20,          // 20%
  'Desert Eagle': 0.08, // 8%
  'Glock-18': 0.05,     // 5%
  'USP-S': 0.05,        // 5%
  'P250': 0.02,         // 2%
  'Tec-9': 0.02,        // 2%
  'Five-SeveN': 0.02    // 2%
};
```

**Sources:**
- Steam Player Statistics - Weapon usage data
- CS2 Competitive Match Data - Most purchased weapons
- YouTube "$50 loadout" videos - Community consensus

---

### 3. Float Value Sweet Spots for Budget Builds

**Industry Finding:** Target **Field-Tested 0.15-0.18** or **Minimal Wear 0.07-0.09** for best visual quality without premium prices.

**Float Ranges:**
- FT 0.15-0.18: Looks clean, not beat up, significant savings vs MW
- MW 0.07-0.09: Almost FN quality at 20-30% lower price

**Implementation:**

```typescript
const budgetFloatTargets = {
  'field_tested': { min: 0.15, max: 0.18 },
  'minimal_wear': { min: 0.07, max: 0.09 }
};

// Filter items by float range
query.float_value = {
  gte: budgetFloatTargets[preferredWear].min,
  lte: budgetFloatTargets[preferredWear].max
};
```

**Sources:**
- CSGOFloat Market - Float value pricing analysis
- Reddit r/GlobalOffensiveTrade - "Best float values for budget" threads

---

### 4. Souvenir Skins as Value Picks

**Industry Finding:** Souvenir skins with pre-applied gold stickers are often **10-30% cheaper** than regular skins, making them excellent budget value picks.

**Trade-offs:**
- ✅ Cheaper than regular skins
- ✅ Pre-applied gold stickers (aesthetic value)
- ❌ Cannot apply custom stickers

**Implementation:**

```typescript
const allowSouvenir = true; // Include souvenir skins for budget builds

// Highlight souvenir savings
if (item.quality === 'Souvenir') {
  const regularPrice = await getRegularSkinPrice(item.name, item.wear);
  const savings = regularPrice - item.price;

  return {
    ...item,
    isSouvenir: true,
    souvenirSavings: savings
  };
}
```

**Sources:**
- Steam Community Market - Souvenir pricing
- CSGOFloat - Souvenir vs regular comparison

---

### 5. Budget Allocation: 70% Weapons, 15% Knife, 10% Gloves, 5% Other

**Industry Standard:** Allocate budget across cosmetic categories based on visibility/impact.

**Recommended Allocation:**

```typescript
const budgetAllocation = {
  weaponSkins: 0.70,  // 70% on weapon skins (most visible)
  knife: 0.15,        // 15% on knife
  gloves: 0.10,       // 10% on gloves
  agents: 0.03,       // 3% on agents (both CT and T)
  musicKit: 0.02      // 2% on music kit
};
```

**Rationale:**
- Weapon skins are visible most often (gameplay)
- Knife is visible during movement/inspections
- Gloves visible in first-person view
- Agents less visible (third-person only)
- Music Kit auditory, not visual

**Sources:**
- CS2Locker - Default budget distribution
- LoadoutBuilder.gg - Recommended allocations
- Community surveys - "What's most important in a loadout?"

## Authoritative Documentation & Sources

### Official CS2 Documentation

1. **CS2 Cosmetic System Overview**
   - Source: Valve CS2 Official Website
   - URL: https://www.counter-strike.net/cosmetics
   - Coverage: Official documentation on cosmetic loadout system (weapon skins, agents, gloves, knife, music kits, charms)

2. **CS2 The Armory Update (Weapon Charms)**
   - Source: CS2 Patch Notes
   - Date: October 2025
   - Coverage: Introduction of weapon charms as new cosmetic category

3. **CS2 Loadout Editor**
   - Source: In-game CS2 → Inventory → Loadout Editor
   - Coverage: How cosmetic loadouts work in-game (NOT weapon selection)

### Industry Analysis & Pricing

4. **CSGOFloat Market - Float Value Pricing**
   - Source: CSGOFloat.com
   - URL: https://csgofloat.com/
   - Coverage: Float value impact on pricing, sweet spots for budget builds (FT 0.15-0.18, MW 0.07-0.09)

5. **Steam Community Market - Souvenir Pricing**
   - Source: Steam Community Market
   - URL: https://steamcommunity.com/market/
   - Coverage: Souvenir skin pricing vs regular skins (10-30% savings)

### Existing Loadout Builders (Competitive Analysis)

6. **CS2Locker**
   - URL: https://cs2locker.com/
   - Features: Full cosmetic builder, theme selection, no budget constraints
   - Learning: Budget allocation weights, theme keywords

7. **LoadoutBuilder.gg**
   - URL: https://loadoutbuilder.gg/
   - Features: Theme-based builder, color coordination focus
   - Learning: Color coordination > individual quality, theme matching algorithms

8. **CSLoadout.com**
   - URL: https://csloadout.com/
   - Features: Skin showcase, manual selection
   - Learning: User preferences for weapon selection (AK-47, M4, AWP most popular)

### Community Research

9. **Reddit r/GlobalOffensive - Budget Loadout Threads**
   - URL: https://www.reddit.com/r/GlobalOffensive/
   - Search: "budget loadout", "$50 loadout challenge"
   - Learning: User behavior patterns, budget ranges ($5, $10, $25, $50, $100)

10. **Reddit r/GlobalOffensiveTrade - Float Value Discussions**
    - URL: https://www.reddit.com/r/GlobalOffensiveTrade/
    - Coverage: Float value optimization, souvenir skin value, pricing strategies

11. **YouTube - Budget Loadout Content**
    - Search: "CS2 budget loadout $50"
    - Channels: 3kliksphilip, TDM_heyzeus, WarOwl
    - Learning: Viral potential (500K+ views), popular budget ranges, weapon prioritization

### Technical Documentation

12. **Steam Web API - Inventory Endpoints**
    - Source: Steamworks API Documentation
    - Coverage: Fetching user inventory, item data structure

13. **pgvector - Semantic Search for Themes**
    - Source: pgvector GitHub
    - URL: https://github.com/pgvector/pgvector
    - Coverage: Vector similarity for theme matching, color coordination

## Success Metrics

- ✅ 30%+ users engage with loadout builder
- ✅ 10%+ save/share loadouts
- ✅ 1,000 public loadouts created (month 1)
- ✅ Viral potential: 100K+ views on featured loadouts
- ✅ 20%+ affiliate conversion (users buy from generated loadouts)
- ✅ 90%+ color coordination score on themed loadouts
- ✅ 85%+ float quality score on budget builds (within target range)

## Dependencies

### Must Have Before Starting
- [01] Item Database (with float values, wear conditions)
- [03] Search & Filters (to find items matching criteria)
- [04] Price Aggregation (to price loadouts across platforms)
- [06] Steam Auth (to save loadouts)

### Blocks Other Features
None (self-contained feature)

## Effort Estimate

- **Development Time:** 3-4 weeks
- **Complexity:** High (complex algorithm, multiple cosmetic categories)
- **Team Size:** 1 developer

**Breakdown:**
- Week 1: Database schema rewrite, cosmetic categories, weapon charms support
- Week 2: Budget allocation algorithm, float value optimization, color coordination
- Week 3: Frontend builder UI, weapon selector, theme filters, float optimizer
- Week 4: Sharing, templates, SEO optimization, testing

## Implementation Notes

### Viral Growth Strategy

```typescript
// Auto-generate featured templates
const featuredTemplates = [
  {
    name: "$10 Starter Pack",
    budget: 10,
    theme: "tactical",
    essentialWeapons: ["AK-47", "M4A4"],
    includeKnife: false,
    target: "New players"
  },
  {
    name: "$50 Blue Dream",
    budget: 50,
    theme: "blue",
    colorScheme: ["blue", "aqua", "sapphire"],
    essentialWeapons: ["AK-47", "M4A4", "AWP", "Desert Eagle"],
    includeKnife: true,
    includeGloves: true,
    targetFloatRange: { min: 0.15, max: 0.18 },
    target: "Mid-tier players"
  },
  {
    name: "Streamer Shroud Build (Community Recreation)",
    budget: 100,
    theme: null,
    essentialWeapons: ["AK-47", "M4A1-S", "AWP", "Desert Eagle", "Glock-18"],
    includeKnife: true,
    includeGloves: true,
    includeAgents: true,
    creatorName: "Community Recreation",
    target: "Shroud fans"
  }
];

// Create content for SEO
// pages/loadouts/10-dollar-starter-pack
// → Indexed by Google, shareable on social
```

## Status

- [x] Research complete (CS2 loadout system, cosmetic categories, gotchas)
- [x] Gotchas documented (4 critical issues)
- [x] Best practices captured (5 industry standards)
- [x] Authoritative sources documented (13 sources)
- [ ] Database schema created
- [ ] Budget allocation algorithm implemented
- [ ] Float value optimization implemented
- [ ] API endpoints implemented
- [ ] Frontend builder UI built
- [ ] Template system deployed
- [ ] Sharing functionality complete
- [ ] SEO optimization done
- [ ] Testing complete
- [ ] Deployed to production

## Related Features

- **Depends On:**
  - [01] Item Database (with float values, wear conditions, cosmetic categories)
  - [03] Search & Filters (for finding items by theme, color, float range)
  - [04] Price Aggregation (for pricing loadouts across platforms)
  - [06] Steam Auth (for saving user loadouts)

- **Enables:**
  - [29] Loadout Sharing (social features, viral growth)
  - Affiliate revenue through "Buy All Items" conversions
  - User-generated content (public loadouts)

## References

- CS2 Official Cosmetic Documentation: https://www.counter-strike.net/cosmetics
- CS2 The Armory Update (Charms): October 2025 Patch Notes
- CSGOFloat Market (Float Pricing): https://csgofloat.com/
- CS2Locker (Competitive Analysis): https://cs2locker.com/
- LoadoutBuilder.gg (Theme Matching): https://loadoutbuilder.gg/
- Reddit r/GlobalOffensive - Budget Loadout Threads
- YouTube Budget Loadout Content: 3kliksphilip, TDM_heyzeus channels
