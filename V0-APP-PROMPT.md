# v0.app Prompt - csloadout.gg Phase 1 Frontend

## Project Overview

Build a comprehensive CS2 (Counter-Strike 2) marketplace aggregator platform that helps players find the best deals across multiple marketplaces (CSFloat, Buff163, Steam Market, Skinport, etc.). The platform aggregates prices, shows true costs with fees, and provides deal discovery tools.

**Target Users:** CS2 players, skin traders, investors, budget-conscious buyers

**Design Style:** Modern, clean, game-inspired aesthetic with dark mode support. Professional trading platform feel similar to TradingView or CoinGecko, but for CS2 skins.

---

## Tech Stack Requirements

- **Framework:** Next.js 14+ with App Router
- **UI Library:** React 18+ with TypeScript
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Management:** React Query (TanStack Query) for server state
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts or Chart.js for price history
- **Tables:** TanStack Table for data grids

---

## Design System

### Color Palette
- **Primary:** CS2 orange (#FF6A00) - main CTAs, highlights
- **Secondary:** Dark blue (#1E293B) - backgrounds, cards
- **Accent:** Gold (#FFD700) - premium features, deals
- **Success:** Green (#22C55E) - positive price changes, good deals
- **Danger:** Red (#EF4444) - negative changes, alerts
- **Neutral:** Slate grays for text and borders

### Typography
- **Headings:** Inter or similar geometric sans-serif
- **Body:** System font stack for performance
- **Monospace:** JetBrains Mono for prices and numbers

### Component Style
- **Cards:** Subtle shadows, rounded corners (8px), border on hover
- **Buttons:** Solid fills, clear hover states, disabled states
- **Inputs:** Clean borders, focus rings, validation states
- **Tables:** Zebra striping optional, hover highlights, sortable headers

---

## Phase 1 Features - Detailed Component Specifications

### Feature 01: Item Database - Comprehensive Catalog Browsing

#### Components Needed:

**1. ItemCatalogPage**
- **Layout:** Grid view (default) or list view toggle
- **Grid:** Responsive 2-4-6 columns (mobile-tablet-desktop)
- **Each Item Card:**
  - Item image (150x150px, lazy loaded)
  - Item name with wear/StatTrak badge
  - Rarity indicator (color-coded border or badge)
  - Lowest price displayed prominently
  - Marketplace logo showing lowest price source
  - Quick "View Details" button
  - Hover: Show price from all marketplaces in tooltip

**2. ItemDetailPage**
- **Hero Section:**
  - Large item image (400x400px)
  - Item name, collection, rarity
  - Wear rating, float value, StatTrak/Souvenir badges
  - 3D inspect preview (if available from Steam API)

- **Price Comparison Table:**
  - Columns: Marketplace, Price, Fees, Total Cost, Stock, Link
  - Sortable by total cost (default), price, marketplace
  - Color-code best deal (green highlight)
  - "Buy Now" buttons per marketplace

- **Price History Chart:**
  - Line chart showing 30-day price trends
  - Multiple lines for different marketplaces
  - Interactive tooltips on hover
  - Date range selector (7d, 30d, 90d, 1y)

- **Related Items Section:**
  - "Similar items" carousel
  - Same weapon, different skin
  - Same collection, different weapon
  - Similar price range

**Data Structure:**
```typescript
interface Item {
  id: string;
  name: string;
  weapon: string;
  skin: string;
  rarity: 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'contraband';
  collection: string;
  wear?: 'factory-new' | 'minimal-wear' | 'field-tested' | 'well-worn' | 'battle-scarred';
  isStatTrak: boolean;
  isSouvenir: boolean;
  iconUrl: string;
  inspectUrl?: string;
  prices: MarketplacePrice[];
  priceHistory: PriceHistoryPoint[];
}

interface MarketplacePrice {
  marketplace: string;
  price: number;
  totalCost: number; // price + fees
  fees: number;
  stock: number;
  listingUrl: string;
  lastUpdated: string;
}
```

---

### Feature 02: Relational Browsing - Contextual Navigation

#### Components Needed:

**1. NavigationSidebar**
- **Browse by Weapon:**
  - Collapsible weapon categories (Rifles, Pistols, Knives, etc.)
  - Each category expands to show individual weapons
  - Active weapon highlighted
  - Item count badges per weapon

- **Browse by Collection:**
  - Collection cards with preview images
  - Collection completion progress bar
  - Click to filter catalog by collection

- **Browse by Rarity:**
  - Color-coded rarity filters
  - Item count per rarity
  - Multi-select capability

**2. BreadcrumbNavigation**
- Shows current path: Home > Rifles > AK-47 > Redline
- Clickable segments to navigate back
- Accessible keyboard navigation

**3. ItemRelationshipsPanel** (on Item Detail Page)
- **Tabs:**
  - "Same Weapon" - all skins for this weapon
  - "Same Collection" - all items in this collection
  - "Same Rarity" - similar rarity items
- Compact card grid within panel
- Quick-switch without page reload

---

### Feature 03: Search & Filters - Advanced Discovery

#### Components Needed:

**1. SearchBar** (Global Header)
- **Autocomplete Dropdown:**
  - Real-time suggestions as user types
  - Grouped results: Weapons, Skins, Collections
  - Recent searches saved locally
  - Keyboard navigation (arrow keys, enter)
  - Debounced API calls (300ms delay)

- **Visual Design:**
  - Icon: Magnifying glass (Lucide Search icon)
  - Placeholder: "Search 10,000+ CS2 items..."
  - Focus state: Expand width, show autocomplete
  - Clear button (X) when text entered

**2. FilterPanel** (Catalog Page Sidebar)
- **Price Range Slider:**
  - Min/Max inputs (numeric)
  - Dual-handle slider component
  - Preset ranges: <$10, $10-50, $50-100, $100+

- **Rarity Checkboxes:**
  - Color-coded checkboxes
  - Item count per rarity (e.g., "Covert (245)")

- **Weapon Type Multi-Select:**
  - Dropdown with checkboxes
  - "Select All" / "Clear All" options

- **Marketplace Filter:**
  - Toggle switches per marketplace
  - "Available on..." filters items with stock

- **Wear Condition:**
  - Checkbox group for each wear level

- **Special Attributes:**
  - StatTrak checkbox
  - Souvenir checkbox
  - "On Sale" - items with recent price drops

**3. ActiveFiltersBar**
- Shows applied filters as removable chips
- "Clear All Filters" button
- Result count: "Showing 234 items"

**4. SortDropdown**
- Options:
  - Price: Low to High (default)
  - Price: High to Low
  - Name: A to Z
  - Rarity: Common to Rare
  - Popularity (most viewed)
  - Recently Added
  - Best Deals (biggest discount)

**Data Structure:**
```typescript
interface SearchFilters {
  query: string;
  priceMin?: number;
  priceMax?: number;
  rarities: string[];
  weapons: string[];
  marketplaces: string[];
  wearConditions: string[];
  isStatTrak?: boolean;
  isSouvenir?: boolean;
  onSale?: boolean;
  sortBy: 'price-asc' | 'price-desc' | 'name' | 'rarity' | 'popularity' | 'recent' | 'deals';
}
```

---

### Feature 04: Price Aggregation - Multi-Marketplace Comparison

#### Components Needed:

**1. PriceComparisonTable** (Item Detail Page)
- **Columns:**
  - Marketplace (logo + name)
  - Base Price
  - Fees (tooltip shows breakdown)
  - **Total Cost** (bold, primary focus)
  - Stock Availability
  - "Buy Now" action button

- **Features:**
  - Sortable columns (click header)
  - Best deal highlighted (green row background)
  - Out of stock grayed out
  - Last updated timestamp per row
  - "Refresh Prices" button (with loading state)

**2. PriceComparisonCard** (Catalog Grid View)
- **Compact Version:**
  - Shows lowest price prominently
  - "+3 other marketplaces" indicator
  - Hover/click expands to show all prices
  - Popover with mini comparison table

**3. LivePriceIndicator**
- **Real-time Updates:**
  - Price change indicators (↑ +$2.50 / ↓ -$1.20)
  - Green for price drops, red for increases
  - "Updated 2 minutes ago" timestamp
  - Auto-refresh every 5 minutes (configurable)

**4. MarketplaceLegend**
- Shows all supported marketplaces with logos
- Toggle visibility in comparison table
- Link to marketplace terms/fees

**Performance Consideration (from Research):**
- Implement aggressive caching (5-minute cache for price data)
- Show stale data with "Refresh" option rather than blank state
- Use optimistic updates when user refreshes

---

### Feature 05: Fee Transparency - True Cost Calculator

#### Components Needed:

**1. FeeBreakdownCard**
- **Expandable Section per Marketplace:**
  - Click marketplace name to expand fee details
  - Shows:
    - Base Price: $10.00
    - Platform Fee (5%): $0.50
    - Payment Processing (2.9% + $0.30): $0.59
    - **Total Cost: $11.09**

- **Visual Breakdown:**
  - Stacked bar chart showing fee components
  - Percentage of total for each fee
  - Color-coded segments

**2. FeeComparisonChart**
- **Horizontal Bar Chart:**
  - X-axis: Total cost
  - Y-axis: Marketplaces
  - Bars color-coded by marketplace
  - Fee portion darker shade within bar
  - Annotations showing exact fee amounts

**3. TrueCostBadge** (on Item Cards)
- **Display:**
  - Strikethrough original price: ~~$10.00~~
  - Bold true cost: **$11.09**
  - Small "incl. fees" text
  - Tooltip explains calculation

**4. FeeCalculatorWidget**
- **Interactive Calculator:**
  - Input: Item price
  - Dropdown: Select marketplace
  - Auto-calculate total cost
  - "Compare All Marketplaces" button
  - Shareable link to calculation

**Data Structure:**
```typescript
interface FeeBreakdown {
  marketplace: string;
  basePrice: number;
  fees: {
    platformFee: { amount: number; rate: number; description: string };
    paymentProcessing?: { amount: number; rate: number; description: string };
    withdrawalFee?: { amount: number; description: string };
    other?: { amount: number; description: string };
  };
  totalCost: number;
  savingsVsHighest?: number;
}
```

---

### Feature 06: Steam Authentication - OAuth Integration

#### Components Needed:

**1. LoginButton**
- **Design:**
  - Steam logo + "Sign in with Steam"
  - Primary button styling
  - Loading state during OAuth flow
  - Disabled state with tooltip if unavailable

**2. UserProfileDropdown** (Header)
- **Trigger:**
  - User avatar (Steam profile pic)
  - Username
  - Dropdown arrow icon

- **Dropdown Menu:**
  - Profile (link to user page)
  - Inventory (link to imported inventory)
  - Alerts (link to price alerts)
  - Settings
  - Logout

- **Online Status:**
  - Green dot if Steam online
  - Gray if offline

**3. AuthCallbackPage**
- **Loading State:**
  - Spinner with "Signing in with Steam..."
  - Progress indicator

- **Error State:**
  - Error message if auth fails
  - "Try Again" button
  - Link to support/FAQ

**4. ProtectedRouteWrapper**
- **Middleware Component:**
  - Shows login prompt if not authenticated
  - Redirects to intended page after login
  - Loading skeleton while checking auth

**UI Flow:**
```
1. User clicks "Sign in with Steam"
2. Redirect to Steam OAuth (external)
3. Steam redirects back to /auth/callback
4. Show loading state while verifying token
5. On success: Redirect to original page with user session
6. On error: Show error message with retry option
```

---

### Feature 07: Inventory Import - Steam API Integration

#### Components Needed:

**1. ImportInventoryButton**
- **Action:**
  - "Import from Steam" button
  - Icon: Download or Refresh icon
  - Shows last import timestamp
  - Loading state during import (progress bar)

**2. InventoryImportModal**
- **Steps:**
  - Step 1: Confirm Steam profile
  - Step 2: Select inventory privacy (public required)
  - Step 3: Importing... (progress bar)
  - Step 4: Success summary (X items imported)

- **Error Handling:**
  - Private inventory warning
  - Steam API rate limit message
  - Retry button

**3. InventoryGrid**
- **Display:**
  - Grid of inventory items (similar to Item Catalog)
  - Each item shows:
    - Item image
    - Item name
    - Current market value
    - "View on Marketplaces" link

- **Filters:**
  - Sort by value (high to low)
  - Filter by item type
  - Search within inventory

- **Summary Stats:**
  - Total inventory value
  - Most valuable item
  - Item count by rarity

**4. InventoryValueChart**
- **Pie Chart:**
  - Segments by item type (knives, rifles, etc.)
  - Value distribution
  - Click segment to filter inventory

**5. CompareInventoryButton**
- **Action:**
  - Shows which marketplace gives best total payout
  - Bulk listing recommendation
  - "List All on [Marketplace]" CTA

**Data Structure:**
```typescript
interface InventoryItem {
  assetId: string; // Steam asset ID
  item: Item; // Links to Item Database
  marketValue: number; // Current lowest price
  acquiredDate?: string;
  tradable: boolean;
  marketable: boolean;
}

interface InventoryStats {
  totalValue: number;
  itemCount: number;
  mostValuable: InventoryItem;
  valueByType: { type: string; value: number }[];
}
```

---

### Feature 08: Budget Loadout Builder - Price-Constrained Creation

#### Components Needed:

**1. LoadoutBuilderPage**
- **Layout:** Split view (Search Panel | Loadout Preview)

**2. BudgetTracker** (Sticky Header)
- **Display:**
  - Total Budget: $100.00 (user input)
  - Spent: $87.50
  - Remaining: $12.50
  - Progress bar (87% filled)
  - Color: Green if under budget, red if over

**3. WeaponSlotPanel**
- **Weapon Slots:**
  - Primary: (AK-47, M4A4, AWP, etc.)
  - Secondary: (Desert Eagle, Glock, etc.)
  - Knife
  - Gloves
  - (Optional: Zeus, C4, Grenades)

- **Each Slot:**
  - Empty state: "+ Add Weapon" placeholder
  - Filled state: Item card with price
  - "Change" or "Remove" action
  - Lock icon to prevent accidental removal

**4. ItemPickerModal**
- **Triggered when clicking "+ Add Weapon"**
- **Content:**
  - Weapon type selector dropdown
  - Filtered item catalog (only items within remaining budget)
  - Sort by price, popularity, rarity
  - "Add to Loadout" button

**5. LoadoutPreview**
- **Visual Display:**
  - 3D-style weapon layout (if possible)
  - Or: Grid of all selected items
  - Item names and prices
  - Total cost at bottom

**6. LoadoutShareButton**
- **Actions:**
  - Generate shareable link
  - Copy to clipboard
  - Share on Twitter/Discord
  - Download as image

**7. LoadoutTemplates**
- **Pre-made Loadouts:**
  - "Budget Starter ($50)"
  - "Competitive Pro ($500)"
  - "Collector's Dream ($5000)"
  - Click to load template and customize

**8. OptimizeSuggestionsPanel**
- **AI-Powered Suggestions:**
  - "Swap AK Redline for Phantom Disruptor to save $3.50"
  - "Upgrade knife for $8 more to get better value"
  - Based on price-to-rarity ratio

**Data Structure:**
```typescript
interface Loadout {
  id: string;
  name: string;
  budget: number;
  items: {
    slot: 'primary' | 'secondary' | 'knife' | 'gloves';
    item: Item;
    selectedMarketplace: string;
    price: number;
  }[];
  totalCost: number;
  createdBy: string; // user ID
  isPublic: boolean;
  shareableUrl?: string;
}
```

---

### Feature 09: Price Alerts - Notification System

#### Components Needed:

**1. CreateAlertButton** (on Item Detail Page)
- **Action:**
  - "Set Price Alert" button
  - Icon: Bell icon
  - Opens CreateAlertModal

**2. CreateAlertModal**
- **Form Fields:**
  - Item: (pre-filled if from item page)
  - Target Price: (numeric input with $ prefix)
  - Alert Type: Dropdown
    - "Price drops below $X"
    - "Price increases above $X"
    - "Any price change"

  - Notification Method: Checkboxes
    - Email (requires verified email)
    - Push Notification (requires permission)
    - In-App Notification

  - Frequency: Dropdown
    - Instant (real-time)
    - Daily Digest
    - Weekly Digest

- **Validation:**
  - Target price must be positive
  - At least one notification method required
  - Show fee-inclusive price warning

**3. AlertsListPage**
- **Table View:**
  - Columns: Item, Target Price, Current Price, Status, Actions
  - Status: Active (green), Triggered (yellow), Paused (gray)
  - Actions: Edit, Pause/Resume, Delete

- **Summary Stats:**
  - Active Alerts: 12
  - Triggered Today: 3
  - Saved by Alerts: $45.67 (if they bought at alert price)

**4. AlertTriggeredNotification**
- **Toast Notification:**
  - "🔔 Price Alert! AK-47 Redline is now $8.50 (was $12.00)"
  - "View Deal" button
  - "Dismiss" button
  - Auto-dismiss after 10 seconds

**5. NotificationPreferencesPanel** (Settings)
- **Global Settings:**
  - Email notifications enabled/disabled
  - Push notifications enabled/disabled
  - Quiet hours (e.g., 10 PM - 8 AM)
  - Alert frequency limits (max 5 per day)

- **GDPR Compliance:**
  - "Unsubscribe from all emails" button
  - Clear explanation of data usage
  - One-click unsubscribe in emails

**6. AlertHistoryPanel**
- **Timeline View:**
  - Shows all triggered alerts
  - When price dropped
  - What marketplace had best price
  - Whether user acted on alert
  - Price change graph

**Data Structure:**
```typescript
interface PriceAlert {
  id: string;
  userId: string;
  itemId: string;
  targetPrice: number;
  alertType: 'below' | 'above' | 'any';
  notificationMethods: ('email' | 'push' | 'in-app')[];
  frequency: 'instant' | 'daily' | 'weekly';
  isActive: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
  triggeredMarketplace?: string;
  createdAt: string;
}
```

**Critical Gotcha (from Research):**
- Include 15-minute cooldown between alerts for same item to prevent spam
- Daily alert limit (5 max) to prevent user fatigue
- Clear unsubscribe mechanism (GDPR compliance)

---

### Feature 10: Daily Deal Feed - Curated Bargains

#### Components Needed:

**1. DealFeedPage**
- **Hero Section:**
  - Page title: "Today's Best Deals"
  - Subtitle: "87 items priced 10-30% below market average"
  - Next update countdown: "Updates in 6 hours 23 minutes"

**2. FeaturedDealCard** (Deal of the Day)
- **Layout:** Large hero card
- **Content:**
  - 🔥 "Deal of the Day" badge
  - Large item image (400x400px)
  - Item name and details
  - Price comparison:
    - Original price (strikethrough): ~~$12.00~~
    - Deal price (large, green): **$8.50**
    - Savings: "Save $3.50 (29% off)"

  - Social proof:
    - 👁️ 234 views today
    - 🛒 12 purchased today

  - "Buy Now on CSFloat" primary button
  - Countdown: "Deal ends in 5 hours"

**3. DealControls**
- **Sort Dropdown:**
  - Best Deals (by deal score)
  - Highest Discount %
  - Biggest Savings $
  - Lowest Price

- **Filter:**
  - Weapon type
  - Price range
  - Minimum discount %

**4. DealCard** (Grid Item)
- **Layout:** Card in responsive grid (3-4 columns)
- **Content:**
  - Deal badge: "25% OFF"
  - Item image
  - Item name
  - Price display:
    - Current: $8.50 (green, bold)
    - Average: ~~$12.00~~ (strikethrough)
  - Savings: "Save $3.50"
  - Deal Score: 87/100 (progress bar or badge)
  - Marketplace logo
  - "View Deal" button

**5. DealsGrid**
- **Responsive Grid:**
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3-4 columns
- **Infinite Scroll or Pagination:**
  - Load more deals as user scrolls
  - Or: "Load More" button
  - Show "X of Y deals loaded"

**6. DealStatsPanel** (Optional Sidebar)
- **Statistics:**
  - Average Discount: 18%
  - Total Savings Available: $1,247
  - Most Popular Category: Knives
  - Biggest Deal: AK-47 Neon Revolution (45% off)

**7. DealHistoryWidget** (Item Detail Page)
- **Shows:**
  - "This item was a featured deal 3 days ago at $7.50"
  - "Deals on this item occur every 12 days on average"
  - Price history with deal markers

**8. DealNotificationToggle**
- **Action:**
  - "Notify me of daily deals" toggle
  - Subscribe to deal feed email/push
  - Preference for specific categories

**Data Structure:**
```typescript
interface Deal {
  id: string;
  item: Item;
  currentPrice: number;
  averagePrice30d: number;
  discountPercent: number;
  savingsAmount: number;
  dealScore: number; // 0-100 composite score
  marketplace: string;
  listingUrl: string;
  rank: number; // position in feed
  isFeatured: boolean; // Deal of the Day
  stats: {
    viewsToday: number;
    clicksToday: number;
    purchasesToday: number;
  };
  feedDate: string; // which day's feed
  expiresAt?: string; // if time-limited
}
```

**Critical Gotchas (from Research):**
- Implement event-driven cache invalidation when prices change (5-min TTL + immediate invalidation)
- Validate deals are legitimate (price stable for 30+ days before drop)
- Exclude low-volume items (<10 sales/month) to prevent manipulation
- Use BRIN indexing on price_history table for performance

---

## API Integration Patterns

All components should follow these patterns for data fetching:

### React Query Setup

```typescript
// Example: Fetch item catalog
const { data, isLoading, error } = useQuery({
  queryKey: ['items', filters],
  queryFn: () => fetchItems(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
});

// Example: Create price alert (mutation)
const createAlertMutation = useMutation({
  mutationFn: (alert: CreateAlertInput) => createAlert(alert),
  onSuccess: () => {
    queryClient.invalidateQueries(['alerts']);
    toast.success('Alert created successfully!');
  },
  onError: (error) => {
    toast.error(`Failed to create alert: ${error.message}`);
  },
});
```

### API Response Types

```typescript
// Successful response
interface ApiSuccess<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    perPage: number;
  };
}

// Error response
interface ApiError {
  error: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
}
```

---

## Performance & Optimization Requirements

Based on research-backed best practices:

1. **Image Optimization:**
   - Use Next.js Image component with lazy loading
   - Serve WebP format with fallback
   - Responsive images (srcset)
   - Placeholder blur while loading

2. **Code Splitting:**
   - Dynamic imports for heavy components (charts, modals)
   - Route-based code splitting (automatic with App Router)
   - Lazy load below-the-fold content

3. **Caching Strategy:**
   - API responses: 5-minute cache (React Query)
   - Static assets: CDN caching
   - Stale-while-revalidate for price data

4. **Performance Targets:**
   - First Contentful Paint: <1.5s
   - Time to Interactive: <3s
   - Lighthouse Score: >90

5. **Accessibility:**
   - WCAG 2.1 Level AA compliance
   - Keyboard navigation for all interactive elements
   - ARIA labels and roles
   - Focus management in modals/dropdowns
   - Screen reader testing

---

## Responsive Breakpoints

```css
/* Mobile-first approach */
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md, lg)
- Desktop: > 1024px (xl, 2xl)
```

### Layout Adaptations:
- **Mobile:** Single column, bottom sheet modals, hamburger menu
- **Tablet:** 2-column grids, slide-over panels
- **Desktop:** 3-4 column grids, sidebar navigation, inline modals

---

## Additional UI Components Needed

### Global Components:

**1. Header/Navigation:**
- Logo (csloadout.gg)
- Search bar (prominent)
- Navigation links: Browse, Deals, Loadouts, Alerts
- User profile dropdown (if authenticated)
- Shopping cart icon (future feature)

**2. Footer:**
- Links: About, FAQ, Terms, Privacy, Contact
- Social media icons
- Marketplace partners logos
- "Made by traders, for traders" tagline

**3. Toast Notifications:**
- Success, error, info, warning variants
- Auto-dismiss with countdown
- Stack multiple toasts
- Action buttons (undo, view, dismiss)

**4. LoadingStates:**
- Skeleton loaders for content
- Spinner for actions
- Progress bars for imports/operations
- "Empty state" illustrations when no data

**5. ErrorBoundary:**
- Catch React errors gracefully
- "Something went wrong" message
- "Reload page" button
- Error reporting to monitoring service

---

## Authentication Flow Components

**1. LoginPage:**
- "Sign in with Steam" button (large, centered)
- Benefits of signing in (price alerts, inventory, loadouts)
- FAQ accordion
- Guest browsing option

**2. AuthGuard:**
- Wrapper component for protected routes
- Shows login prompt if not authenticated
- Remembers intended destination
- Smooth redirect after login

---

## Dark Mode Support

All components must support dark mode:

```typescript
// Tailwind dark mode classes
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  {/* Content */}
</div>
```

**Dark Mode Toggle:**
- Sun/Moon icon in header
- Persists preference to localStorage
- System preference detection

---

## Form Validation Examples

Using React Hook Form + Zod:

```typescript
const createAlertSchema = z.object({
  itemId: z.string().uuid(),
  targetPrice: z.number().positive('Price must be positive'),
  alertType: z.enum(['below', 'above', 'any']),
  notificationMethods: z.array(z.enum(['email', 'push', 'in-app'])).min(1),
});

type CreateAlertInput = z.infer<typeof createAlertSchema>;
```

**Validation States:**
- Show inline errors below fields
- Highlight invalid fields (red border)
- Disable submit until valid
- Success state (green checkmark)

---

## Animation & Micro-interactions

**Subtle animations for:**
- Card hover states (slight lift, shadow increase)
- Button press (scale down 98%)
- Loading spinners
- Toast slide-in from top-right
- Modal fade-in backdrop
- Skeleton pulse while loading
- Number counters (budget remaining, savings)

**Use Framer Motion or CSS transitions:**
- Keep animations <300ms
- Respect `prefers-reduced-motion`
- Disable on low-end devices

---

## Testing Requirements

**Component Testing:**
- Unit tests for utility functions
- Component tests with React Testing Library
- Accessibility tests with jest-axe
- Snapshot tests for complex components

**E2E Testing:**
- Critical user flows (search → view item → create alert)
- Playwright or Cypress for E2E
- Test on multiple browsers/devices

---

## Build Instructions for v0.app

**Initial Prompt:**
Start with the global layout and navigation, then build features in this order:

1. **First:** Header + Footer + Navigation
2. **Second:** Item Catalog Page + Item Card components
3. **Third:** Item Detail Page + Price Comparison Table
4. **Fourth:** Search Bar + Filters Panel
5. **Fifth:** Budget Loadout Builder
6. **Sixth:** Deal Feed Page
7. **Seventh:** Price Alerts UI
8. **Eighth:** Authentication UI
9. **Ninth:** Inventory Import UI

**Iterative Approach:**
Ask v0.app to generate one feature at a time, refine, then move to next.

---

## Progressive Prompting Strategy for v0.app

v0.app works best with **focused, single-page prompts**. Here's the recommended sequence with copy-paste-ready prompts for each feature:

---

### **Prompt 1: Global Layout (Header + Footer)**

```
Build the header and footer layout for csloadout.gg, a CS2 (Counter-Strike 2) marketplace aggregator platform.

HEADER REQUIREMENTS:
- Logo (left): "csloadout.gg" text logo in CS2 orange (#FF6A00), bold font
- Center: Global search bar with magnifying glass icon
  - Placeholder: "Search 10,000+ CS2 items..."
  - Autocomplete dropdown on focus (show recent searches)
  - Width expands on focus (600px → 800px)
- Navigation (center-right): Browse | Deals | Loadouts | Alerts
- Right side: Dark mode toggle (sun/moon icon) + User menu
  - If logged in: Avatar dropdown with Profile/Inventory/Settings/Logout
  - If not logged in: "Sign in with Steam" button with Steam logo
- Sticky header on scroll (shrinks height from 80px to 60px)
- Mobile: Hamburger menu, search icon that expands to full-width bar

FOOTER REQUIREMENTS:
- 4 columns: Product (Browse, Deals, Loadouts) | Company (About, Blog, Careers) | Support (FAQ, Contact, Terms) | Social (Twitter, Discord, Reddit)
- Bottom: "© 2025 csloadout.gg - Made by traders, for traders" + Marketplace partner logos
- Dark theme: slate-900 background, slate-400 text

TECH STACK:
- Next.js 14 App Router with TypeScript
- shadcn/ui components (NavigationMenu, DropdownMenu, Sheet for mobile)
- Tailwind CSS with dark mode support
- Lucide React icons

DESIGN:
- Dark mode default: bg-slate-950, text-white
- Hover states: subtle scale + brightness increase
- Smooth transitions (200ms ease-in-out)
- Responsive: mobile-first approach

Generate complete header and footer components with all interactive states.
```

---

### **Prompt 2: Item Catalog Page (Browse/Search)**

```
Build the item catalog page for csloadout.gg - the main browsing/search interface for CS2 skins.

PAGE LAYOUT:
- Left sidebar (300px): Filter panel
- Main content area: Item grid + controls
- Right sidebar (optional, 250px): Quick stats

FILTER PANEL (Sidebar):
- Price Range: Dual-handle slider ($0 - $5000+) with min/max inputs
- Rarity: Color-coded checkboxes
  - Consumer (white), Industrial (light blue), Mil-Spec (blue), Restricted (purple), Classified (pink), Covert (red), Contraband (gold)
  - Show item count per rarity: "Covert (234)"
- Weapon Type: Multi-select dropdown (Rifles, Pistols, SMGs, Knives, Gloves)
- Marketplace: Toggle switches (CSFloat, Buff163, Steam Market, Skinport)
- Wear: Checkboxes (Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred)
- Special: StatTrak toggle, Souvenir toggle, "On Sale" toggle
- Active Filters Bar: Show applied filters as removable chips with "Clear All"

TOP CONTROLS:
- Sort dropdown: Price Low→High | Price High→Low | Name A→Z | Rarity | Popularity | Best Deals
- View toggle: Grid view (default) | List view
- Results count: "Showing 1,234 of 10,000 items"

ITEM CARD (Grid View):
- Item image (200x200px, lazy loaded)
- Rarity border (color-coded, 3px)
- Item name + wear badge
- StatTrak/Souvenir badge if applicable
- Price section:
  - Lowest price (large, bold): $42.50
  - Marketplace logo (small)
  - "+3 other marketplaces" text
- Hover: Shadow increase, slight lift, "View Details" button appears

GRID LAYOUT:
- Responsive: 2 cols (mobile) | 3 cols (tablet) | 4 cols (desktop)
- Gap: 24px
- Infinite scroll OR "Load More" button (show 50 per page)

LOADING STATE:
- Skeleton cards (8 visible)
- Pulse animation

EMPTY STATE:
- Illustration + "No items found matching your filters"
- "Clear filters" button

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Slider, Checkbox, DropdownMenu, Skeleton
- TanStack Query for data fetching
- Framer Motion for card hover animations

DATA STRUCTURE (TypeScript):
interface Item {
  id: string;
  name: string;
  iconUrl: string;
  rarity: 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'contraband';
  wear?: string;
  isStatTrak: boolean;
  isSouvenir: boolean;
  lowestPrice: number;
  marketplaceCount: number;
}

Generate the complete catalog page with filters, grid, and all interactive states.
```

---

### **Prompt 3: Item Detail Page**

```
Build the item detail page for csloadout.gg - shows comprehensive info and pricing for a single CS2 skin.

PAGE LAYOUT:
- Hero section: Item image + key details
- Price comparison table
- Price history chart
- Related items carousel

HERO SECTION:
- Left: Large item image (500x500px) with zoom on hover
- Right:
  - Item name (h1): "AK-47 | Redline"
  - Collection badge: "The Huntsman Collection"
  - Rarity badge: Color-coded chip (e.g., "Classified" in pink)
  - Wear: "Field-Tested (0.24 float)"
  - Tags: StatTrak badge, Souvenir badge if applicable
  - Quick actions: "Set Price Alert" button, "Add to Loadout" button, Share button

PRICE COMPARISON TABLE:
- Columns: Marketplace (logo + name) | Price | Fees | Total Cost | Stock | Action
- Sortable by column click (default: Total Cost ascending)
- Best deal row: Green background highlight
- Out of stock: Grayed out row
- "Buy Now" button per row (external link)
- Footer: "Last updated 2 minutes ago" + "Refresh" button
- Expandable fee breakdown: Click fee amount to see (Platform 5%, Payment 2.9%)

PRICE HISTORY CHART:
- Line chart (Recharts or Chart.js)
- X-axis: Date (last 30 days)
- Y-axis: Price
- Multiple lines for each marketplace (different colors)
- Legend: Toggle marketplace visibility
- Time range selector: 7D | 30D | 90D | 1Y (buttons)
- Tooltips: Show exact price + date on hover
- Deal markers: Show when item appeared in Daily Deal feed

RELATED ITEMS:
- Section title: "You might also like"
- Horizontal carousel with arrow navigation
- 4 visible cards (desktop), 2 (tablet), 1 (mobile)
- Logic: Same weapon different skin, Same collection, Similar price range
- Card: Mini version of catalog item card

FLOATING ACTION BAR (Mobile):
- Sticky bottom bar
- "Best Price: $42.50 on CSFloat"
- "Buy Now" button

BREADCRUMB:
- Home > Rifles > AK-47 > Redline (Field-Tested)
- Clickable navigation

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Table, Tabs, Button, Badge
- Recharts for price history
- react-medium-image-zoom for image zoom
- TanStack Table for sortable table

DATA STRUCTURE:
interface ItemDetail extends Item {
  description: string;
  collection: string;
  floatValue: number;
  inspectUrl?: string;
  prices: Array<{
    marketplace: string;
    price: number;
    fees: number;
    totalCost: number;
    stock: number;
    listingUrl: string;
  }>;
  priceHistory: Array<{
    date: string;
    marketplace: string;
    price: number;
  }>;
}

Generate the complete item detail page with all sections and interactions.
```

---

### **Prompt 4: Daily Deal Feed Page**

```
Build the daily deal feed page for csloadout.gg - showcases curated deals 10-30% below market average.

PAGE LAYOUT:
- Hero banner with "Deal of the Day"
- Filters/sort controls
- Deal cards grid
- Stats sidebar

HERO BANNER:
- Large featured card (full width, 300px height)
- 🔥 "Deal of the Day" badge (top-left)
- Split layout:
  - Left: Item image (300x300px)
  - Right: Deal details
    - Item name (h2)
    - Original price (strikethrough): ~~$120.00~~
    - Deal price (large, green, bold): $87.50
    - Savings badge: "Save $32.50 (27% OFF)" in green pill
    - Social proof: "👁️ 1,247 views | 🛒 34 purchased today"
    - Marketplace: "Available on CSFloat"
    - Deal score: "92/100" with progress bar
    - Countdown: "Deal ends in 5h 32m" (live countdown)
- "Claim Deal" primary button (large)
- Gradient background: Orange to red

PAGE HEADER:
- Title: "Today's Best Deals"
- Subtitle: "87 items priced 10-30% below market average"
- Next update: "Updates in 6h 23m" (countdown)

CONTROLS:
- Sort dropdown: Best Deals (score) | Highest % Off | Biggest $ Savings | Lowest Price
- Filters: Weapon Type, Min Discount %, Price Range
- View toggle: Grid | List

DEAL CARD (Grid):
- Deal badge (top-right): "25% OFF" in orange
- Item image (180x180px)
- Item name
- Price comparison:
  - Current: $42.50 (green, bold)
  - Was: ~~$56.00~~ (gray, strikethrough)
- Savings: "Save $13.50" (green text)
- Deal score: 87/100 (mini progress bar)
- Marketplace logo (small)
- "View Deal" button
- Hover: Card lifts, shadow increases

GRID LAYOUT:
- 3 cards per row (desktop), 2 (tablet), 1 (mobile)
- Gap: 20px
- Infinite scroll (load 30 per batch)

STATS SIDEBAR (Desktop):
- "Today's Stats" heading
- Average Discount: 18%
- Total Savings: $12,450 (if all deals claimed)
- Most Popular: Knives (42 deals)
- Biggest Deal: Item name + discount
- Deal history: "3 days since last update"

EMPTY STATE:
- "🎉 All deals claimed for today!"
- "Check back tomorrow for new deals"
- "Set price alerts to never miss a deal" button

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Card, Badge, Select, Progress
- date-fns for countdown timers
- Framer Motion for card animations

DATA STRUCTURE:
interface Deal {
  id: string;
  item: Item;
  currentPrice: number;
  averagePrice: number;
  discountPercent: number;
  savingsAmount: number;
  dealScore: number; // 0-100
  marketplace: string;
  listingUrl: string;
  isFeatured: boolean;
  stats: {
    views: number;
    purchases: number;
  };
  expiresAt?: string;
}

Generate the complete deal feed page with featured deal, grid, and all interactive elements.
```

---

### **Prompt 5: Budget Loadout Builder**

```
Build the budget loadout builder for csloadout.gg - lets users create price-constrained weapon loadouts.

PAGE LAYOUT:
- Split view: Loadout panel (left 60%) | Search panel (right 40%)
- Sticky budget tracker (top)

BUDGET TRACKER (Sticky Header):
- Total Budget: $100.00 (editable input)
- Spent: $87.50 (auto-calculated)
- Remaining: $12.50 (color: green if >$0, red if negative)
- Progress bar: 87% filled (green if under, red if over)
- "Save Loadout" button (right)

LOADOUT PANEL (Left):
- Weapon Slots (vertical list):
  1. Primary Weapon (Rifle/AWP/SMG)
  2. Secondary Weapon (Pistol)
  3. Knife
  4. Gloves
  5. (Optional: C4, Zeus)

- Each Slot Card:
  - Empty state: Dashed border, "+ Add Weapon" button, slot icon
  - Filled state:
    - Item image (150x150px)
    - Item name
    - Marketplace logo
    - Price: $42.50
    - Actions: "Change" button, "Remove" icon (trash)
    - Lock icon (optional, prevents accidental removal)

- Summary Section (bottom):
  - Total Cost: $87.50 (large, bold)
  - Item count: "4 of 5 slots filled"
  - "Clear All" button

SEARCH PANEL (Right):
- Search bar: "Search items within budget..."
- Weapon type tabs: All | Rifles | Pistols | Knives | Gloves
- Filter: "Show only items ≤ $12.50" (remaining budget)
- Sort: Price Low→High | Popularity | Rarity

- Search Results:
  - Mini item cards (compact, 2 cols)
  - Item image (80x80px)
  - Item name
  - Price
  - "+ Add" button
  - Disabled if over remaining budget (grayed out + tooltip)

ITEM PICKER MODAL:
- Triggered when clicking "+ Add Weapon" in empty slot
- Modal content:
  - Title: "Select Primary Weapon"
  - Weapon type filter (if applicable)
  - Search results grid
  - "Add to Loadout" button per item
  - Budget warning if item too expensive

LOADOUT TEMPLATES (Top Banner):
- Pre-made loadouts carousel
- Cards: "Budget Starter ($50)" | "Competitive Pro ($500)" | "Collector ($5K)"
- Click to load template (warns if overwrites current)

SHARE MODAL:
- Triggered by "Save & Share" button
- Generated shareable URL
- Preview card of loadout
- Copy link button
- Social share buttons (Twitter, Discord)
- "Download as Image" option

OPTIMIZATION SUGGESTIONS (Bottom Panel):
- AI-powered suggestions
- "💡 Swap AK Redline → Phantom Disruptor to save $3.50"
- "⬆️ Upgrade knife for $8 more for better value"
- Based on price-to-rarity ratio

MOBILE LAYOUT:
- Tabs: "Loadout" | "Search"
- Bottom sheet for item picker
- Sticky budget tracker

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Card, Dialog, Tabs, Input
- dnd-kit for drag-and-drop (Phase 2)
- react-hook-form for budget input

DATA STRUCTURE:
interface Loadout {
  id: string;
  name: string;
  budget: number;
  items: Array<{
    slot: 'primary' | 'secondary' | 'knife' | 'gloves';
    item: Item;
    marketplace: string;
    price: number;
  }>;
  totalCost: number;
  shareableUrl?: string;
}

Generate the complete loadout builder with split view, budget tracker, and item selection.
```

---

### **Prompt 6: Price Alerts Page**

```
Build the price alerts management page for csloadout.gg - create and manage price drop notifications.

PAGE LAYOUT:
- Header with "Create Alert" button
- Alerts table/list
- Stats cards
- Notification preferences panel

STATS CARDS (Top Row):
- Card 1: Active Alerts (12) - green icon
- Card 2: Triggered Today (3) - yellow bell icon
- Card 3: Total Saved ($145.67) - dollar icon, "if bought at alert price"
- Card 4: This Week (8 triggered) - chart icon

CREATE ALERT BUTTON:
- Primary button: "+ Create Price Alert"
- Opens CreateAlertModal

CREATE ALERT MODAL:
- Title: "Set Price Alert"
- Form fields:
  1. Item Search: Autocomplete input with item suggestions
  2. Target Price: $ input (numeric, validation)
  3. Alert Type: Radio group
     - "When price drops below $X" (default)
     - "When price increases above $X"
     - "Any price change"
  4. Notification Method: Checkboxes
     - Email (disabled if email not verified + tooltip)
     - Push Notification (requests permission if not granted)
     - In-App Notification
  5. Frequency: Dropdown
     - Instant (real-time)
     - Daily Digest (9 AM)
     - Weekly Digest (Monday 9 AM)

- Fee warning: "Note: Target price is fee-inclusive (total cost)"
- "Create Alert" button (disabled until valid)
- Validation: Price must be positive, at least one notification method

ALERTS TABLE:
- Columns: Item (image + name) | Target Price | Current Price | Status | Created | Actions
- Status badges:
  - Active: Green badge
  - Triggered: Yellow badge with timestamp
  - Paused: Gray badge
- Price comparison: Show % difference (current vs target)
  - Green if current < target ("23% below target")
  - Red if current > target ("15% above target")
- Actions dropdown: Edit | Pause/Resume | Delete
- Bulk actions: Select multiple (checkboxes) → Pause All, Delete All
- Sort: Status | Created Date | Item Name | Price Difference

ALERT HISTORY TAB:
- Switch to view triggered alerts history
- Timeline view with timestamps
- Shows: When triggered, marketplace, price, whether user acted
- Filter: Last 7 days | Last 30 days | All time

NOTIFICATION PREFERENCES PANEL:
- Section: "Email Notifications"
  - Toggle: Enable/disable email alerts
  - Input: Email address (with verification status)
  - "Verify Email" button if unverified
- Section: "Push Notifications"
  - Toggle: Enable/disable push
  - "Request Permission" if not granted
  - Supported browsers notice
- Section: "Quiet Hours"
  - Time range picker: 10 PM - 8 AM (no notifications)
- Section: "Alert Limits"
  - Max alerts per day: 5 (prevents spam)
  - Info: "Prevents alert fatigue based on research"
- GDPR Compliance:
  - "Unsubscribe from all notifications" button (red, prominent)
  - Clear explanation of data usage
  - Link to privacy policy

TRIGGERED ALERT TOAST:
- Toast notification when alert triggers
- Content: "🔔 Price Alert! AK-47 Redline is now $8.50 (was $12.00)"
- Actions: "View Deal" button | "Dismiss" button
- Auto-dismiss: 10 seconds
- Stacks: Shows up to 3 toasts, older ones dismissed

EMPTY STATE:
- Illustration + "No active alerts"
- "Create your first alert" button
- Benefits: "Never miss a deal on your favorite items"

MOBILE VIEW:
- Cards instead of table
- Each alert as card with swipe actions (delete, pause)
- Bottom sheet for create modal

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Table, Dialog, Form, Switch, Toast
- react-hook-form + zod for validation
- TanStack Table for sortable table
- date-fns for date formatting

DATA STRUCTURE:
interface PriceAlert {
  id: string;
  itemId: string;
  item: Item;
  targetPrice: number;
  currentPrice: number;
  alertType: 'below' | 'above' | 'any';
  notificationMethods: ('email' | 'push' | 'in-app')[];
  frequency: 'instant' | 'daily' | 'weekly';
  status: 'active' | 'triggered' | 'paused';
  triggeredAt?: string;
  createdAt: string;
}

Generate the complete price alerts page with table, create modal, and notification preferences.
```

---

### **Prompt 7: Steam Authentication UI**

```
Build the Steam authentication flow UI for csloadout.gg.

COMPONENTS NEEDED:

1. LOGIN PAGE (/login):
- Centered card (max-width 500px)
- Title: "Sign in to csloadout.gg"
- Subtitle: "Access price alerts, inventory import, and loadout builder"
- "Sign in with Steam" button:
  - Steam logo icon (left)
  - Text: "Sign in with Steam"
  - Full width, large (56px height)
  - Primary button style (CS2 orange)
  - Hover: Slight darken, scale 102%
- Benefits list (icons + text):
  - ✓ Import your Steam inventory
  - ✓ Set unlimited price alerts
  - ✓ Save and share loadouts
  - ✓ Track market trends
- "Continue as Guest" link (bottom)
- Footer: "By signing in, you agree to our Terms & Privacy Policy"

2. AUTH CALLBACK PAGE (/auth/callback):
- Loading state (shown while verifying):
  - Spinner animation
  - Text: "Signing in with Steam..."
  - Progress bar (indeterminate)
- Error state:
  - Red alert icon
  - Title: "Authentication Failed"
  - Error message: {error.message}
  - "Try Again" button → redirects to /login
  - "Contact Support" link
- Success state:
  - Green checkmark animation
  - Text: "Welcome back, {username}!"
  - Auto-redirect to intended page (or /dashboard) after 2 seconds

3. USER PROFILE DROPDOWN (Header):
- Trigger:
  - User avatar (Steam profile picture, 40x40px, rounded)
  - Username (truncated if >15 chars)
  - Dropdown chevron icon
- Dropdown menu:
  - Header: Username + Steam ID
  - Menu items:
    - Profile (link to /profile)
    - Inventory (link to /inventory)
    - Alerts (link to /alerts)
    - Loadouts (link to /loadouts)
    - Settings (link to /settings)
    - Separator
    - Logout (red text, icon)
- Online status indicator: Green dot if Steam online, gray if offline
- Hover states: Slight background highlight

4. PROTECTED ROUTE GUARD:
- Shows login prompt if not authenticated
- Design:
  - Lock icon
  - Title: "Authentication Required"
  - Message: "Please sign in to access this feature"
  - "Sign in with Steam" button
  - "Go Back" link
- Remembers intended destination (redirect after login)

5. SESSION EXPIRY MODAL:
- Shows when session expires
- Title: "Session Expired"
- Message: "Please sign in again to continue"
- "Sign in Again" button
- Auto-shows after API returns 401

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Button, DropdownMenu, Dialog, Avatar
- next-auth for session management
- Lucide icons

FLOW:
1. User clicks "Sign in with Steam" → Redirect to Steam OAuth
2. Steam redirects to /auth/callback?code=...
3. Frontend sends code to backend /api/auth/steam
4. Backend verifies, creates session, returns user data
5. Frontend stores session, redirects to intended page
6. User menu shows authenticated state

Generate all authentication UI components with loading/error states.
```

---

### **Prompt 8: Inventory Import Page**

```
Build the Steam inventory import page for csloadout.gg - import and analyze user's CS2 inventory.

PAGE LAYOUT:
- Import wizard (if first time)
- Inventory grid
- Stats dashboard
- Action buttons

IMPORT WIZARD (First Time):
- Step indicator: 1 → 2 → 3 → 4
- Step 1: Welcome
  - Title: "Import Your Steam Inventory"
  - Subtitle: "See total value, find best selling prices, and track changes"
  - "Get Started" button
- Step 2: Privacy Check
  - Title: "Check Inventory Privacy"
  - Instructions: "Your Steam inventory must be public to import"
  - Current status: Public ✓ or Private ✗
  - Link to Steam privacy settings
  - "My inventory is public" button
- Step 3: Importing
  - Title: "Importing Your Inventory"
  - Progress bar (0-100%)
  - Status text: "Fetching items... (34 of 156)"
  - ETA: "About 30 seconds remaining"
  - Animated loading spinner
- Step 4: Success
  - Checkmark animation
  - Title: "Import Complete!"
  - Summary:
    - 156 items imported
    - Total value: $1,247.50
    - Most valuable: Butterfly Knife | Fade ($850)
  - "View Inventory" button

INVENTORY STATS DASHBOARD:
- 4 stat cards (top row):
  - Total Value: $1,247.50 (large, prominent)
  - Item Count: 156 items
  - Most Valuable: Item name + $850
  - Avg Item Value: $7.99
- Value Distribution Chart:
  - Pie chart showing value by item type
  - Segments: Knives (45%), Rifles (30%), Pistols (15%), Other (10%)
  - Click segment to filter grid

INVENTORY GRID:
- Layout: Similar to item catalog grid
- Each inventory item card:
  - Item image
  - Item name + wear
  - Acquired date (if available via Steam API)
  - Current market value (bold, green if increased, red if decreased)
  - Change indicator: ↑ +$2.50 (15%) since import
  - Tradable/Marketable status badges
  - Actions dropdown: View Markets | Set Alert | Add to Loadout

FILTERS/CONTROLS:
- Search: "Search your inventory..."
- Sort: Value High→Low | Value Low→High | Name | Acquired Date
- Filter: Item Type, Tradable/Marketable only, Min Value
- View: Grid | List | Compare (side-by-side marketplace prices)

COMPARE VIEW:
- Select multiple items (checkboxes)
- "Compare Prices" button
- Table showing each item with marketplace prices
- Total value row (sum across all marketplaces)
- Best marketplace highlighted
- "List All on [Marketplace]" action button

ACTION BUTTONS (Bottom):
- "Refresh Inventory" - re-sync with Steam (cooldown: 1 hour)
- "Export to CSV" - download inventory data
- "Share Inventory" - generate public link

RE-IMPORT BUTTON:
- Shows if inventory already imported
- Displays: "Last updated 2 hours ago"
- "Refresh" button with loading state
- Cooldown message if < 1 hour: "You can refresh in 45 minutes"

EMPTY STATE:
- No items in inventory
- Illustration + "Your inventory is empty"
- "Browse items to start collecting"

ERROR STATES:
- Private Inventory Error:
  - Alert: "Your inventory is private"
  - Instructions with screenshots
  - Link to Steam settings
- Steam API Error:
  - Alert: "Could not connect to Steam"
  - "Try again" button
  - "Steam may be experiencing issues"
- Rate Limited:
  - Alert: "Too many requests"
  - "Please try again in 15 minutes"

MOBILE VIEW:
- Compact stat cards (2 per row)
- List view default (better on mobile)
- Bottom sheet for item details

TECH STACK:
- Next.js 14 with TypeScript
- shadcn/ui: Card, Progress, Tabs, Select
- Recharts for pie chart
- TanStack Query for data fetching

DATA STRUCTURE:
interface InventoryItem {
  assetId: string; // Steam asset ID
  item: Item;
  marketValue: number;
  valueChange?: { amount: number; percent: number };
  acquiredDate?: string;
  tradable: boolean;
  marketable: boolean;
}

interface InventoryStats {
  totalValue: number;
  itemCount: number;
  mostValuable: InventoryItem;
  valueByType: { type: string; value: number; count: number }[];
}

Generate the complete inventory import page with wizard, grid, and stats dashboard.
```

---

## Recommended Build Order

**Week 1:**
1. ✅ Prompt 1: Global Layout (Header + Footer)
2. ✅ Prompt 2: Item Catalog Page
3. ✅ Prompt 3: Item Detail Page

**Week 2:**
4. ✅ Prompt 7: Steam Authentication UI
5. ✅ Prompt 4: Daily Deal Feed
6. ✅ Prompt 5: Budget Loadout Builder

**Week 3:**
7. ✅ Prompt 6: Price Alerts Page
8. ✅ Prompt 8: Inventory Import Page
9. Polish, testing, responsive adjustments

---

## Tips for Using These Prompts with v0.app

1. **Copy-paste each prompt exactly** - they're optimized for v0.app's parser
2. **Generate one page at a time** - refine each before moving to next
3. **Ask for refinements** - "Make the cards more compact" or "Add loading skeletons"
4. **Request specific shadcn components** - v0.app has all shadcn/ui components built-in
5. **Iterate on details** - Start with layout, then add interactions, then polish
6. **Export code** - After each prompt, export the code and integrate into your Next.js project

---

## Example Follow-up Prompts

After generating a page, use these to refine:

- "Add loading skeletons for all data-dependent components"
- "Make this fully responsive with mobile breakpoints"
- "Add error states for API failures with retry buttons"
- "Improve accessibility with ARIA labels and keyboard navigation"
- "Add smooth transitions and hover states using Tailwind"
- "Make the color scheme match CS2 aesthetic (orange, dark blues)"

---

## Summary

This comprehensive prompt covers all 10 Phase 1 features with detailed component specifications, data structures, UI/UX requirements, and implementation guidance. Use this as a reference to progressively build the frontend with v0.app, focusing on one feature at a time for best results.

**Key Principles:**
✅ Modern, clean design inspired by trading platforms
✅ Performance-first (lazy loading, caching, code splitting)
✅ Accessibility (WCAG 2.1 AA)
✅ Mobile-responsive (mobile-first approach)
✅ Dark mode support throughout
✅ Research-backed gotcha prevention (cache invalidation, GDPR compliance, alert fatigue)
✅ TypeScript for type safety
✅ shadcn/ui for consistent, accessible components

**Total Components:** ~50+ components across 10 features
**Estimated Development Time (with v0.app):** 2-3 weeks iterative generation + refinement
