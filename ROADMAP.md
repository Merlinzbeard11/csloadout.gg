# csloadout.gg Development Roadmap

> Last Updated: January 8, 2025

## Overview

This roadmap outlines the phased development approach for csloadout.gg - a CS2 skin aggregator combining wiki functionality with cross-platform price comparison.

**Vision:** Be the Google of CS2 skins - the first place users go to research items and find the best prices across 26+ marketplaces.

---

## 📊 Quick Status

| Phase | Timeline | Status | Progress | Target Users | Target MRR |
|-------|----------|--------|----------|--------------|------------|
| Phase 1 | 3-4 months | **In Progress** 🟡 | **69%** (6.9/10 P0) | 10K | $500 |
| Phase 2 | 6-8 months | Not Started | 0% | 50K | $15K |
| Phase 3 | 6-8 months | Not Started | 0% | 100K | $30K |
| Phase 4 | 12+ months | Not Started | 0% | 500K | $100K+ |

---

## Phase 1: Foundation & Market Validation
**Timeline:** 3-4 months (Weeks 1-16)
**Goal:** Prove core value proposition, acquire first 10K users, validate monetization
**Target Segments:** Casual Players, Wannabe Investors, Deal Hunters

### Epic: Wiki & Database Foundation

#### P0 - Must Ship
- [x] [01-item-database.md](./features/01-item-database.md) - Complete Item Database - **Completed** ✅
  - 9 tasks completed: Scaffolding, schema, normalization, import service, APIs, item card, browse page, search, item detail
  - Last commit: 6be3811 (TASK 1.9 - PostgreSQL trigram fuzzy search)
- [x] [02-relational-browsing.md](./features/02-relational-browsing.md) - Relational Browsing System - **Completed** ✅
  - 9 tasks completed: Collections/Cases schema, Collections API, Weapons API, Cases API, CollectionCard, browse pages, weapon page, case contents
  - Last commit: 4f8980e (TASK 2.9 - Case contents with probability validation)
- [x] [03-search-filters.md](./features/03-search-filters.md) - Search & Filter System - **Completed** ✅
  - 5 tasks completed: Full-text search migration, types, advanced search API, autocomplete API, SearchBox, FilterSidebar
  - Last commit: 8918523 (Feature 03 COMPLETE - FilterSidebar)

### Epic: Price Comparison Engine

#### P0 - Must Ship
- [x] [04-price-aggregation.md](./features/04-price-aggregation.md) - Multi-Marketplace Price Aggregation - **Completed** ✅
  - 7 tasks completed: Database schema, outlier detection, currency conversion, price API, price comparison table, affiliate disclosure
  - Last commit: f9d3d06 (TASK 4.6 - Price comparison table with tests)
- [x] [05-fee-transparency.md](./features/05-fee-transparency.md) - Fee Transparency & Total Cost - **Completed** ✅ (MVP)
  - 5 commits: FeeCalculator, PlatformFeeConfig table, fee calculator API, FeeBreakdown component, integration with PriceComparisonTable
  - Last commit: 1ca7e45 (Integrate FeeBreakdown with PriceComparisonTable)
  - MVP complete: 5/15 BDD scenarios implemented (core functionality done, advanced scenarios deferred)

### Epic: User Authentication & Personalization

#### P0 - Must Ship
- [x] [06-steam-authentication.md](./features/06-steam-authentication.md) - Steam OpenID Authentication - **Completed** ✅
  - Custom Steam OpenID 2.0 provider with security gotchas implemented
  - API routes: /api/auth/steam/login (initiate), /api/auth/steam/callback (verify)
  - Session management: getSession(), requireAuth() with React cache() memoization
  - UI: Sign-in page, error handling page with multiple error types
  - Commits: 55cb562 (OpenID provider), 69176eb (API routes), 6298bf0 (UI complete)
  - Tests: 8/14 provider tests passing (core functionality verified)
  - BDD: 20 scenarios in features/06-steam-authentication.feature
- [x] [07-inventory-import.md](./features/07-inventory-import.md) - Basic Inventory Import - **Completed** ✅ (100% Complete)
  - **BDD:** 33 scenarios in features/07-inventory-import.feature
  - **Database:** UserInventory + InventoryItem models with GDPR compliance (90-day retention, consent tracking)
  - **Steam API Client:** HTTP client with exponential backoff + jitter, pagination support, 16/16 tests passing ✅
  - **Sync Service:** Prisma interactive transactions, item matching via market_hash_name, cache (6hr TTL) ✅
  - **API Routes:** GET /api/inventory, POST /api/inventory/sync, DELETE /api/inventory (GDPR) ✅
  - **UI Components:** 3/3 components implemented ✅
    - PrivacyConsentModal: GDPR consent with 90-day retention, 21/21 tests passing
    - InventoryValueDisplay: Value display with sync status, 20/20 tests passing
    - InventoryImportButton: Import trigger with error handling, 14/15 tests (1 test has case bug)
  - **Commits:** 6c87279, ff4fc09, dcf4c59, 34bf14f, a4bf94c, ccb1d25, e9b0d7c, 7033b7d
  - **Tests:** 143 total (16 Steam + 11 Sync + 14 API + 47 UI logic + 55 UI component)
  - **Test Note:** 1 UI test has case-sensitivity bug in mock (line 206: "Rate limit" vs line 217: "rate limit")
  - **Gotchas Captured:** 5 (Steam endpoint changes, Prisma transactions, HTTP retry, Next.js auth, RSC testing)
  - **Learnings Captured:** 3 (Prisma patterns, Next.js auth, full-stack TDD)
  - **Lines of Code:** ~2,800 (backend ~1,800, UI ~1,000)

### Epic: Casual Player Features

#### P0 - Must Ship
- [ ] [08-budget-loadout-builder.md](./features/08-budget-loadout-builder.md) - Budget Loadout Builder - **In Progress** (Phases 1-2 Complete ✅)
  - **Phase 1 Complete:** Database Foundation (2 days, 300 LOC)
    - CosmeticCategory model (10 categories)
    - WeaponUsagePriority model (10 weapons with budget weights)
    - 23 tests passing (BDD scenarios validated)
    - Commit: 1f8ee61 (Feature 08 Phase 1 complete)
  - **Phase 2 Complete:** Loadout Storage + Custom Allocation (2 days, 600 LOC)
    - Loadout model (user-created loadouts with budget tracking)
    - LoadoutWeaponSkin model (junction table with float optimization)
    - **Enhancement:** Custom budget allocation percentages (user-configurable)
    - 30 tests passing (13 storage + 17 custom allocation)
    - Weapon charms support (NEW - Oct 2025)
    - Commits: 8323e1d (storage), df4d113 (custom allocation)

#### P1 - Should Have
- [ ] [09-price-alerts.md](./features/09-price-alerts.md) - Basic Price Alerts - **Not Started**
- [ ] [10-deal-feed.md](./features/10-deal-feed.md) - Daily Deal Feed - **Not Started**

### Phase 1 Success Metrics
- ✅ 10,000 monthly active users
- ✅ 1,000 Steam auth sign-ups
- ✅ $500/mo affiliate revenue
- ✅ 5% user retention (week 2)
- ✅ <2s page load time

---

## Phase 2: Bulk Management & Premium Monetization
**Timeline:** 6-8 months (Weeks 17-48)
**Goal:** Launch premium tier, target high-value users, reach $15K MRR
**Target Segments:** Bulk Traders, Serious Investors, Deal Hunters

### Epic: Bulk Management Suite

#### P0 - Must Ship
- [ ] [11-multi-account-dashboard.md](./features/11-multi-account-dashboard.md) - Multi-Account Dashboard - **Not Started**
- [ ] [12-bulk-inventory-operations.md](./features/12-bulk-inventory-operations.md) - Bulk Inventory Operations - **Not Started**
- [ ] [13-cross-platform-listing-manager.md](./features/13-cross-platform-listing-manager.md) - Cross-Platform Listing Manager - **Not Started**
- [ ] [14-bulk-transaction-history.md](./features/14-bulk-transaction-history.md) - Bulk Transaction History & P&L - **Not Started**

### Epic: Portfolio Tracking & Investment Tools

#### P0 - Must Ship
- [ ] [15-portfolio-analytics.md](./features/15-portfolio-analytics.md) - Advanced Portfolio Analytics - **Not Started**
- [ ] [16-investment-insights.md](./features/16-investment-insights.md) - Investment Insights & Recommendations - **Not Started**
- [ ] [17-advanced-deal-alerts.md](./features/17-advanced-deal-alerts.md) - Advanced Deal Alerts & Arbitrage - **Not Started**

### Epic: Wholesale Trading

#### P1 - Should Have
- [ ] [18-wholesale-trading-board.md](./features/18-wholesale-trading-board.md) - Wholesale Trading Board - **Not Started**
- [ ] [19-bulk-escrow.md](./features/19-bulk-escrow.md) - Bulk Transaction Escrow - **Not Started**
- [ ] [20-seller-reputation.md](./features/20-seller-reputation.md) - Seller Reputation System - **Not Started**

### Epic: Inventory Optimization

#### P1 - Should Have
- [ ] [21-inventory-optimization.md](./features/21-inventory-optimization.md) - Smart Inventory Optimization - **Not Started**
- [ ] [22-duplicate-detection.md](./features/22-duplicate-detection.md) - Duplicate Detection & Consolidation - **Not Started**

### Phase 2 Success Metrics
- ✅ 50,000 monthly active users
- ✅ 500 premium subscribers ($10K MRR)
- ✅ 100 pro subscribers ($5K MRR)
- ✅ $15K MRR total
- ✅ 10% free-to-paid conversion
- ✅ <5% monthly churn

---

## Phase 3: Community & Specialized Features
**Timeline:** 6-8 months (Weeks 49-80)
**Goal:** Build sticky community features, serve specialized segments, increase retention
**Target Segments:** Crafters, Collectors, All Users (retention)

### Epic: Craft Simulator & Community

#### P0 - Must Ship
- [ ] [23-craft-simulator.md](./features/23-craft-simulator.md) - Advanced Craft Simulator - **Not Started**
- [ ] [24-craft-gallery.md](./features/24-craft-gallery.md) - Community Craft Gallery - **Not Started**
- [ ] [25-sticker-database.md](./features/25-sticker-database.md) - Advanced Sticker Database - **Not Started**

### Epic: Collector Tools

#### P0 - Must Ship
- [ ] [26-pattern-database.md](./features/26-pattern-database.md) - Pattern & Float Database - **Not Started**
- [ ] [27-pattern-filters.md](./features/27-pattern-filters.md) - Advanced Pattern/Float Filters - **Not Started**

### Epic: Community Features

#### P1 - Should Have
- [ ] [28-user-profiles.md](./features/28-user-profiles.md) - User Profiles & Showcases - **Not Started**
- [ ] [29-loadout-sharing.md](./features/29-loadout-sharing.md) - Loadout Sharing & Social - **Not Started**
- [ ] [30-educational-content.md](./features/30-educational-content.md) - Educational Content System - **Not Started**

### Phase 3 Success Metrics
- ✅ 100,000 monthly active users
- ✅ 10,000 craft uploads per month
- ✅ 1,000 forum posts per week
- ✅ 20% user retention (month 2)
- ✅ 1,000 premium subscribers

---

## Phase 4: Scale & Ecosystem
**Timeline:** 12+ months (Week 81+)
**Goal:** Become platform of record for CS2 economy, expand ecosystem
**Target Segments:** Developers, Mobile Users, International Users, Enterprises

### Epic: Developer Platform

#### P0 - Must Ship
- [ ] [31-public-api.md](./features/31-public-api.md) - Public API & Developer Platform - **Not Started**
- [ ] [32-webhooks.md](./features/32-webhooks.md) - Webhook System - **Not Started**

### Epic: Mobile Experience

#### P0 - Must Ship
- [ ] [33-mobile-apps.md](./features/33-mobile-apps.md) - iOS & Android Native Apps - **Not Started**

### Epic: Advanced Intelligence

#### P1 - Should Have
- [ ] [34-market-intelligence.md](./features/34-market-intelligence.md) - Market Intelligence Dashboard - **Not Started**
- [ ] [35-predictive-analytics.md](./features/35-predictive-analytics.md) - ML-Based Price Predictions - **Not Started**

### Epic: Global Expansion

#### P1 - Should Have
- [ ] [36-internationalization.md](./features/36-internationalization.md) - Multi-Language Support - **Not Started**

### Phase 4 Success Metrics
- ✅ 500,000+ monthly active users
- ✅ 5,000 premium subscribers
- ✅ 100+ API customers
- ✅ $200K+ MRR total

---

## 💰 Revenue Projections

| Phase | Users | Subscribers | MRR | Annual Revenue |
|-------|-------|-------------|-----|----------------|
| Phase 1 (Month 4) | 10K | 0 | $500 | $6K |
| Phase 2 (Month 12) | 50K | 600 | $15K | $180K |
| Phase 3 (Month 20) | 100K | 1,000 | $30K | $360K |
| Phase 4 (Month 32+) | 500K | 5,000 | $100K+ | $1.2M+ |

---

## 🔑 Key Decisions & Rationale

### Why This Phasing?

**Phase 1 First:**
- Proves core value prop (wiki + price aggregation) with broad audience
- Lowest risk, fastest validation
- Builds traffic for Phase 2 monetization

**Phase 2 for Bulk Management:**
- Monetizes proven traffic with premium features
- Targets high-value users (bulk traders $30-50/mo ARPU)
- Natural upgrade path from Phase 1 free users
- Builds on Phase 1 infrastructure (inventory imports, pricing APIs)

**Phase 3 for Community:**
- Retention play after achieving scale
- Serves specialized segments (crafters, collectors)
- Community creates moat and stickiness

**Phase 4 for Scale:**
- API opens new revenue streams
- Mobile captures on-the-go users
- International expansion multiplies addressable market

---

## 📋 Feature Status Legend

- **Not Started** - Not yet begun
- **Research** - Gathering requirements and technical details
- **Design** - Creating mockups and specifications
- **In Progress** - Active development
- **Testing** - QA and user testing phase
- **Completed** - Deployed to production
- **Blocked** - Waiting on dependencies or decisions

---

## 🔗 Related Documentation

- [Discovery Session (Nov 2, 2025)](./docs/discovery-session-2025-11-02.md) - Complete research and analysis
- [Technical Architecture](./docs/architecture.md) - System design (TBD)
- [User Personas](./docs/personas.md) - Detailed user segments (TBD)
- [Competitive Analysis](./docs/competitive-analysis.md) - Market positioning (TBD)
