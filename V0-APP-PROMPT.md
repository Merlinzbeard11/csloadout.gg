# v0.app Prompts - csloadout.gg (Implemented Features)

## 📋 Overview

This document contains copy-paste ready v0.app prompts for **actually implemented** pages in csloadout.gg Phase 1.

**What's Included:** Features 1-9 (Item Database, Browsing, Search, Price Comparison, Fees, Steam Auth, Inventory Import, Loadout Builder, Price Alerts Phase 1)

**What's Excluded:** Feature 10 (Deal Feed) - deferred to Phase 2

**Status:** Phase 1 is ~90% functionally complete. These prompts reflect the actual implementation.

---

## 🎨 Global Design System

**Use this design system across ALL prompts below:**

### Tech Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State:** React Query (TanStack Query) for server state
- **Forms:** React Hook Form + Zod validation

### Color Palette
```css
/* CS2 Theme Colors (Tailwind config) */
--cs2-orange: #FF6A00;     /* Primary CTAs, highlights */
--cs2-darker: #0A0E1A;     /* Page backgrounds */
--cs2-dark: #141B2E;       /* Card backgrounds */
--cs2-blue: #3B82F6;       /* Accents, borders */
--cs2-light: #E2E8F0;      /* Primary text */

/* Semantic Colors */
--success: #22C55E;        /* Price drops, good deals */
--danger: #EF4444;         /* Price increases, alerts */
--warning: #F59E0B;        /* Warnings, cautions */
```

### Typography
- **Headings:** System font stack (Inter fallback)
- **Body:** System font stack for performance
- **Monospace:** For prices and numbers

### Component Patterns
- **Cards:** `bg-cs2-dark border border-cs2-blue/20 rounded-lg`
- **Buttons:** `bg-cs2-blue hover:bg-cs2-blue/80 px-4 py-2 rounded-lg`
- **Inputs:** `bg-cs2-dark border border-cs2-blue/20 focus:border-cs2-blue`
- **Hover States:** `hover:border-cs2-blue/50 transition-colors`

### Rarity Colors
```typescript
const RARITY_COLORS = {
  consumer: 'text-gray-400',
  industrial: 'text-blue-400',
  milspec: 'text-blue-500',
  restricted: 'text-purple-500',
  classified: 'text-pink-500',
  covert: 'text-red-500',
  contraband: 'text-yellow-500',
};
```

---

## 📄 Page-by-Page v0.app Prompts

### **Prompt 1: Home Page (Landing)**

```
Build the landing/home page for csloadout.gg - a CS2 marketplace aggregator platform.

PAGE REQUIREMENTS:
- Hero section with value proposition
- Feature cards showcasing key capabilities
- CTA buttons to browse items and sign in
- Responsive mobile-first design

HERO SECTION:
- Large heading: "csloadout.gg"
- Subheading: "Find the best CS2 skin deals across 26+ marketplaces"
- Primary CTA: "Browse Items" button (links to /items)
- Secondary CTA: "Sign in with Steam" button
- Background: Dark theme with subtle CS2 orange accents

FEATURE CARDS (3 cards in grid):
Card 1:
  - Icon: Search (Lucide Search icon)
  - Title: "26+ Marketplaces"
  - Description: "Compare prices from CSFloat, Buff163, Steam Market, Skinport, and more"

Card 2:
  - Icon: DollarSign (Lucide DollarSign icon)
  - Title: "True Cost Transparency"
  - Description: "See total costs including all fees and charges"

Card 3:
  - Icon: Zap (Lucide Zap icon)
  - Title: "Price Alerts"
  - Description: "Get notified when items drop to your target price"

LAYOUT:
- Container: max-width 1200px, centered
- Padding: py-16 (top/bottom), px-4 (sides)
- Grid: 3 columns on desktop, 1 column on mobile
- Gap: 24px between cards

DESIGN:
- Background: bg-cs2-darker (very dark blue-gray)
- Text: text-cs2-light (light gray)
- Cards: bg-cs2-dark with border-cs2-blue/20
- Hover: Cards lift with shadow increase
- Buttons: CS2 orange primary, blue secondary

TECH STACK:
- Next.js 14 with TypeScript
- Tailwind CSS
- Lucide React icons
- Link components from Next.js

Generate the complete landing page with hero, features, and responsive layout.
```

---

### **Prompt 2: Items Browse Page (/items)**

```
Build the item catalog browse page for csloadout.gg - the main interface for browsing CS2 items.

PAGE REQUIREMENTS:
- Search bar at top for fuzzy search
- Item grid with pagination (50 items per page)
- Responsive grid layout (2-5 columns)
- URL-based pagination and search
- Loading and error states

HEADER SECTION:
- Page title: "Browse CS2 Items" or "Search CS2 Items" (if searching)
- Result count: "Showing 1-50 of 10,234 items" (dynamic based on pagination)
- If search: "Search results for 'ak-47' - 42 items found" (dynamic query and count)

SEARCH BOX:
- Input field: "Search items..." placeholder
- Magnifying glass icon (Lucide Search)
- Real-time search as user types (debounced 300ms)
- Clear button (X) when text entered
- Updates URL with ?q=query parameter
- Client component (use client)

ITEM GRID:
- Responsive grid:
  - Mobile: 2 columns (grid-cols-2)
  - Tablet: 4 columns (md:grid-cols-4)
  - Desktop: 5 columns (lg:grid-cols-5)
- Gap: 16px between cards
- Each item card includes:
  - Item image (lazy loaded, aspect-square)
  - Item name (truncated if long)
  - Rarity badge (color-coded)
  - Links to /items/[id]
  - Hover: border color change to cs2-blue/50

PAGINATION CONTROLS:
- Previous button (disabled if page 1)
- Page numbers (show up to 7 pages, smart ellipsis)
- Next button (disabled if last page)
- Buttons: bg-cs2-dark with border
- Current page: bg-cs2-blue highlight
- URL-based: ?page=X&pageSize=50

ERROR STATE:
- Red alert box: "Failed to load items. Please try again."
- "Try Again" button
- Links back to /items (clears params)

EMPTY STATE:
- Message: "No items found."
- Suggestion to try different search

LOADING STATE (Optional):
- Skeleton cards with pulse animation
- 10 skeleton placeholders

DATA STRUCTURE:
interface Item {
  id: string;
  name: string;
  display_name: string;
  rarity: string | null;
  type: string;
  image_url: string;
  image_url_fallback?: string | null;
}

interface ItemsResponse {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

TECH STACK:
- Next.js 14 App Router with TypeScript
- React Server Component for page
- Client component for SearchBox
- Tailwind CSS
- Lucide icons

API ENDPOINT:
- GET /api/items?page=1&pageSize=50&q=search
- Returns ItemsResponse JSON

Generate the complete items browse page with search, grid, and pagination.
```

---

### **Prompt 3: Item Card Component**

```
Build a reusable ItemCard component for csloadout.gg - displays individual CS2 items in grid layouts.

COMPONENT REQUIREMENTS:
- Displays item image, name, and rarity
- Lazy loads images for performance
- Multi-source image fallback (Steam CDN reliability)
- Rarity-based color coding
- Links to item detail page
- Hover effects

CARD STRUCTURE:
- Container: bg-cs2-dark with border-cs2-blue/20 rounded-lg
- Hover: border-cs2-blue/50 transition
- Link wrapper: Links to /items/[item.id]
- Accessibility: Keyboard navigable

IMAGE SECTION:
- Aspect ratio: Square (aspect-square)
- Background: bg-cs2-dark/50
- Image: lazy loaded, object-contain
- Fallback strategy:
  1. Try image_url (primary Steam CDN)
  2. On error, try image_url_fallback
  3. On error, use /placeholder-item.png
- onError handler to switch sources

CONTENT SECTION:
- Padding: p-4
- Item name: text-sm font-medium, truncated
- Rarity badge: text-xs font-semibold uppercase, color-coded
- Rarity colors:
  - consumer: text-gray-400
  - industrial: text-blue-400
  - milspec: text-blue-500
  - restricted: text-purple-500
  - classified: text-pink-500
  - covert: text-red-500
  - contraband: text-yellow-500

PROPS INTERFACE:
interface ItemCardProps {
  item: {
    id: string;
    name: string;
    display_name: string;
    rarity: string | null;
    type: string;
    image_url: string;
    image_url_fallback?: string | null;
  };
}

STATE MANAGEMENT:
- useState for imgSrc (current image source)
- useState for imgError (track if fallback attempted)
- Handle onError event to cycle through sources

CRITICAL GOTCHA:
- Steam CDN URLs expire after 24 hours
- MUST implement multi-source fallback
- Don't crash on broken images

TECH STACK:
- React with TypeScript
- 'use client' directive (client component)
- next/link for navigation
- next/image OR <img> tag with lazy loading
- Tailwind CSS

Generate the complete ItemCard component with fallback logic and rarity colors.
```

---

### **Prompt 4: Collections Page (/collections)**

```
Build the collections browse page for csloadout.gg - displays CS2 item collections (e.g., "The Huntsman Collection").

PAGE REQUIREMENTS:
- Grid of collection cards
- Each collection shows preview items
- Links to collection detail page
- Responsive layout
- Loading and error states

HEADER:
- Page title: "Browse CS2 Collections"
- Subtitle: "Explore item collections from CS2 cases and operations"

COLLECTIONS GRID:
- Responsive grid:
  - Mobile: 1 column (grid-cols-1)
  - Tablet: 2 columns (md:grid-cols-2)
  - Desktop: 3 columns (lg:grid-cols-3)
- Gap: 24px between cards

COLLECTION CARD:
- Container: bg-cs2-dark border border-cs2-blue/20 rounded-lg
- Hover: border-cs2-blue/50 transition
- Link to: /collections/[slug]
- Sections:
  1. Image preview section (if available)
  2. Collection name (text-lg font-bold)
  3. Item count: "X items" (text-sm text-cs2-light/60)
  4. Preview items (grid of 4 small item thumbnails)

PREVIEW ITEMS:
- Small grid: grid-cols-4 gap-1
- Each thumbnail: 60x60px
- Show first 4 items from collection
- If fewer items, show what's available

DATA STRUCTURE:
interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  item_count?: number;
  preview_items?: Array<{
    id: string;
    image_url: string;
    name: string;
  }>;
}

ERROR STATE:
- "Failed to load collections. Please try again."
- "Try Again" button

EMPTY STATE:
- "No collections found."

TECH STACK:
- Next.js 14 with TypeScript
- Server Component
- Tailwind CSS
- Links from next/link

API ENDPOINT:
- GET /api/collections
- Returns { collections: Collection[] }

Generate the complete collections browse page with grid layout and cards.
```

---

### **Prompt 5: Collection Detail Page (/collections/[slug])**

```
Build the collection detail page for csloadout.gg - shows all items within a specific CS2 collection.

PAGE REQUIREMENTS:
- Collection header with name and description
- Grid of all items in collection
- Breadcrumb navigation
- Responsive layout

BREADCRUMB:
- Home > Collections > [Collection Name]
- Clickable links for navigation
- Text: text-cs2-light/60, links hover to cs2-blue

HEADER SECTION:
- Collection name: text-3xl font-bold
- Description (if available): text-cs2-light/60
- Item count: "X items in this collection"

ITEMS GRID:
- Reuse ItemCard component (same as browse page)
- Responsive grid:
  - Mobile: 2 columns
  - Tablet: 4 columns
  - Desktop: 5 columns
- Gap: 16px

LOADING STATE:
- Skeleton loader with pulse animation
- Show collection name placeholder + skeleton cards

ERROR STATE:
- "Collection not found" if 404
- "Failed to load collection" for other errors
- "Back to Collections" button

EMPTY STATE:
- "This collection has no items yet."

DATA STRUCTURE:
interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  items: Item[]; // Array of Item objects
}

TECH STACK:
- Next.js 14 with TypeScript
- Server Component
- Dynamic route: [slug]
- Tailwind CSS
- Reuse ItemCard component

API ENDPOINT:
- GET /api/collections/[slug]
- Returns CollectionDetail JSON

Generate the complete collection detail page with header, breadcrumb, and item grid.
```

---

### **Prompt 6: Price Comparison Table Component**

```
Build a PriceComparisonTable component for csloadout.gg - displays prices from multiple marketplaces for a single item.

COMPONENT REQUIREMENTS:
- Table layout with marketplace prices
- Sortable columns
- Best deal highlighted
- Fee breakdown expandable tooltips
- Mobile-responsive card view

TABLE STRUCTURE:
Columns:
1. Marketplace (logo + name)
2. Base Price
3. Fees (with tooltip)
4. Total Cost (bold, primary focus)
5. Stock Availability
6. Action (Buy Now button)

ROW DESIGN:
- Best deal: Green background highlight (bg-green-500/10)
- Out of stock: Grayed out (opacity-50)
- Hover: Subtle background highlight
- Alternating rows: Optional zebra striping

MARKETPLACE COLUMN:
- Marketplace logo (20x20px icon)
- Marketplace name (text-sm)
- Horizontal flex layout (items-center gap-2)

PRICE COLUMNS:
- Monospace font for numbers
- Currency symbol: $
- Decimal precision: 2 places
- Right-aligned

FEES COLUMN:
- Show fee amount
- Info icon (Lucide Info)
- Tooltip on hover:
  - Platform fee: 5% ($2.50)
  - Payment processing: 2.9% + $0.30 ($1.79)
  - Total fees: $4.29

TOTAL COST COLUMN:
- Bold font weight
- Larger text: text-lg
- Color: text-cs2-light
- Highlight if best deal: text-green-500

ACTION COLUMN:
- "Buy Now" button
- External link to marketplace listing
- Opens in new tab (target="_blank")
- Small button: px-3 py-1 text-sm

SORTABLE HEADERS:
- Click to sort by column
- Show sort indicator (↑ ↓ icons)
- Default sort: Total Cost ascending

MOBILE VIEW:
- Switch to card layout (not table)
- Each marketplace as card
- Stacked vertically
- Best deal has green border

DATA STRUCTURE:
interface MarketplacePrice {
  marketplace: string;
  marketplaceLogo?: string;
  basePrice: number;
  fees: number;
  totalCost: number;
  stock: number;
  listingUrl: string;
  feeBreakdown?: {
    platformFee: number;
    paymentFee: number;
  };
}

PROPS:
interface PriceComparisonTableProps {
  prices: MarketplacePrice[];
  itemName: string;
}

TECH STACK:
- React with TypeScript
- TanStack Table for sorting (or simple useState)
- Tailwind CSS
- Lucide icons for sort/info
- shadcn/ui Tooltip component

Generate the complete PriceComparisonTable with sorting and responsive design.
```

---

### **Prompt 7: Fee Breakdown Component**

```
Build a FeeBreakdown component for csloadout.gg - displays transparent fee breakdown for marketplace purchases.

COMPONENT REQUIREMENTS:
- Shows base price, platform fees, payment fees, total
- Visual breakdown chart
- Expandable/collapsible sections per marketplace
- Color-coded segments

LAYOUT:
- Card container: bg-cs2-dark border rounded-lg p-4
- Title: "Fee Breakdown"
- Expandable per marketplace (accordion)

BREAKDOWN SECTIONS:
1. Base Price
   - Label: "Base Price"
   - Value: $42.50 (right-aligned)
   - Color: text-cs2-light

2. Platform Fee
   - Label: "Platform Fee (5%)"
   - Value: $2.12
   - Color: text-orange-400

3. Payment Processing Fee
   - Label: "Payment Fee (2.9% + $0.30)"
   - Value: $1.53
   - Color: text-blue-400

4. Total Cost
   - Label: "Total Cost" (bold)
   - Value: $46.15 (bold, text-lg)
   - Color: text-cs2-light
   - Border-top separator

VISUAL BREAKDOWN:
- Horizontal stacked bar chart
- Segments:
  - Base price: gray segment (60%)
  - Platform fee: orange segment (20%)
  - Payment fee: blue segment (20%)
- Tooltip on hover showing exact amounts

ACCORDION BEHAVIOR:
- Click marketplace name to expand
- Chevron icon rotates when expanded
- Smooth transition (transition-all)
- Only one expanded at a time

PROPS INTERFACE:
interface FeeBreakdownProps {
  basePrice: number;
  platformFeePercent: number;
  paymentFeePercent: number;
  paymentFeeFixed: number;
  marketplace: string;
}

TECH STACK:
- React with TypeScript
- 'use client' (client component)
- shadcn/ui Accordion component
- Tailwind CSS for bar chart
- Lucide ChevronDown icon

Generate the complete FeeBreakdown component with visual breakdown and accordion.
```

---

### **Prompt 8: Inventory Page (/inventory)**

```
Build the inventory import page for csloadout.gg - allows users to import and view their Steam CS2 inventory.

PAGE REQUIREMENTS:
- Import button to sync with Steam
- Inventory item grid (reusing ItemCard)
- Total inventory value display
- Privacy check and error handling
- GDPR-compliant

HEADER SECTION:
- Page title: "My CS2 Inventory"
- Last updated: "Last synced 2 hours ago"
- "Refresh Inventory" button (with cooldown)

STATS CARDS (Top Row):
- Total Value: $1,247.50 (large, prominent)
- Item Count: 156 items
- Most Valuable: Item name + $850
- Layout: Grid 2x2 on mobile, 4 cols on desktop

IMPORT BUTTON:
- Primary button: "Import from Steam"
- Icon: Download (Lucide Download)
- Shows loading state during import
- Cooldown: "You can refresh in 45 minutes" (if < 1 hour)

INVENTORY GRID:
- Reuse ItemCard component
- Same responsive grid as browse page
- Each card shows:
  - Item image
  - Item name
  - Current market value (below name)
  - Value change indicator: ↑ +$2.50 (green) or ↓ -$1.20 (red)

FILTERS/CONTROLS:
- Search: "Search your inventory..."
- Sort: Value High→Low | Value Low→High | Name
- Filter: Tradable only, Marketable only

EMPTY STATE:
- Before import: "Import your Steam inventory to get started"
- After import with no items: "Your inventory is empty"

PRIVACY ERROR STATE:
- Alert: "Your inventory is private"
- Instructions: "Please set your Steam inventory to public"
- Link to Steam settings
- "Try Again" button

LOADING STATE:
- Progress bar: "Importing... (34 of 156 items)"
- ETA: "About 30 seconds remaining"
- Animated spinner

DATA STRUCTURE:
interface InventoryItem {
  assetId: string;
  item: Item; // Regular item object
  marketValue: number;
  valueChange?: {
    amount: number;
    percent: number;
  };
  tradable: boolean;
  marketable: boolean;
}

interface InventoryStats {
  totalValue: number;
  itemCount: number;
  mostValuable: InventoryItem;
}

TECH STACK:
- Next.js 14 with TypeScript
- Server Component for page
- Client component for InventoryImportButton
- Tailwind CSS
- shadcn/ui Progress component

API ENDPOINTS:
- POST /api/inventory/import (trigger import)
- GET /api/inventory (fetch inventory)

Generate the complete inventory page with import, grid, and stats dashboard.
```

---

### **Prompt 9: Loadout Builder Page (/loadouts/new)**

```
Build the budget loadout builder page for csloadout.gg - lets users create price-constrained weapon loadouts.

PAGE REQUIREMENTS:
- Budget tracker (sticky header)
- Weapon slot selection (Primary, Secondary, Knife, Gloves)
- Item browser/search for each slot
- Total cost calculation
- Save and share functionality

BUDGET TRACKER (Sticky Top):
- Total Budget: $100.00 (editable input)
- Spent: $87.50 (auto-calculated)
- Remaining: $12.50 (green if positive, red if negative)
- Progress bar: 87% filled
- "Save Loadout" button (right side)

WEAPON SLOTS:
Grid of 4 slot cards:
1. Primary Weapon (Rifle/SMG/Shotgun)
2. Secondary Weapon (Pistol)
3. Knife
4. Gloves

SLOT CARD (Empty State):
- Dashed border: border-dashed border-cs2-blue/40
- Center content:
  - Slot icon (Lucide icon appropriate to slot)
  - "+ Add [Weapon]" text
  - Click to open item picker modal

SLOT CARD (Filled State):
- Solid border: border-cs2-blue/20
- Item image (150x150px)
- Item name
- Marketplace logo (small)
- Price: $42.50
- Actions: "Change" button, "Remove" icon (Trash2)

ITEM PICKER MODAL:
- Title: "Select Primary Weapon"
- Search bar
- Filter by weapon type
- Grid of items (only show items ≤ remaining budget)
- Each item: Mini ItemCard with "+ Add" button
- Grayed out if over budget

BUDGET FORM (Top Section):
- Label: "Total Budget"
- Input: Numeric, $ prefix
- Validation: Must be positive
- Default: $100.00
- Updates immediately on change

PRESET BUTTONS (Optional):
- "Budget Starter ($50)"
- "Competitive Pro ($500)"
- "Collector's Dream ($5000)"
- Click to set budget

SUMMARY (Bottom):
- Total Cost: $87.50 (large, bold)
- Slots Filled: "4 of 5"
- Remaining: $12.50 or Over Budget: -$5.00 (red)

SAVE LOADOUT:
- Opens modal: "Save Loadout"
- Input: Loadout name
- Checkbox: "Make public" (share in gallery)
- "Save" button
- After save: Redirect to /loadouts/[id]

DATA STRUCTURE:
interface Loadout {
  id?: string;
  name: string;
  budget: number;
  items: Array<{
    slot: 'primary' | 'secondary' | 'knife' | 'gloves';
    item: Item;
    marketplace: string;
    price: number;
  }>;
  totalCost: number;
  isPublic: boolean;
}

TECH STACK:
- Next.js 14 with TypeScript
- Client components (use client)
- react-hook-form for budget input
- shadcn/ui Dialog for modals
- Tailwind CSS
- Lucide icons

API ENDPOINTS:
- POST /api/loadouts (save loadout)
- GET /api/items?slot=primary&maxPrice=12.50 (filtered items)

Generate the complete loadout builder with budget tracker, slots, and item picker.
```

---

### **Prompt 10: Loadouts Gallery Page (/loadouts)**

```
Build the public loadouts gallery for csloadout.gg - showcases community-created weapon loadouts.

PAGE REQUIREMENTS:
- Grid of public loadout cards
- Filter by budget range
- Sort by newest, most popular, upvotes
- Upvote functionality
- Link to detail pages

HEADER:
- Page title: "Community Loadouts"
- Subtitle: "Discover budget-optimized weapon loadouts"
- "Create Loadout" button (top-right)

FILTERS/CONTROLS:
- Budget filter: Dropdown with ranges
  - Under $50
  - $50 - $200
  - $200 - $500
  - $500+
  - All Budgets (default)
- Sort: Newest | Most Popular | Most Upvotes
- View count: "Showing X loadouts"

LOADOUT CARD:
- Container: bg-cs2-dark border rounded-lg
- Header:
  - Loadout name (text-lg font-bold)
  - Budget: "$100" (text-cs2-orange)
  - Author: "by username" (text-sm text-cs2-light/60)
- Preview section:
  - Grid of 4 item thumbnails (slots)
  - If slot empty: gray placeholder
- Footer:
  - Total cost: "$87.50"
  - Upvote button: Heart icon + count
  - View count: Eye icon + count
  - "View Details" button

UPVOTE BUTTON:
- Icon: Heart (Lucide Heart)
- Count: number of upvotes
- Filled heart if user upvoted
- Click to toggle upvote
- Requires authentication

GRID LAYOUT:
- Responsive:
  - Mobile: 1 column
  - Tablet: 2 columns
  - Desktop: 3 columns
- Gap: 24px
- Infinite scroll or pagination

EMPTY STATE:
- "No loadouts found"
- "Be the first to create one!" + Create button

LOADING STATE:
- Skeleton cards (6 visible)
- Pulse animation

DATA STRUCTURE:
interface PublicLoadout {
  id: string;
  name: string;
  slug: string;
  budget: number;
  totalCost: number;
  items: Array<{
    slot: string;
    item: Item;
    price: number;
  }>;
  upvotes: number;
  views: number;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
}

TECH STACK:
- Next.js 14 with TypeScript
- Server Component for page
- Client component for upvote button
- Tailwind CSS
- Lucide icons
- shadcn/ui Select for filters

API ENDPOINT:
- GET /api/loadouts?public=true&budget=100-500&sort=popular

Generate the complete loadouts gallery with filters, cards, and upvote functionality.
```

---

### **Prompt 11: Loadout Detail Page (/loadouts/[id])**

```
Build the loadout detail page for csloadout.gg - shows comprehensive view of a single weapon loadout.

PAGE REQUIREMENTS:
- Loadout header with name and budget
- Full slot breakdown with items
- Price comparison per item
- Share functionality
- Upvote and view tracking

HEADER SECTION:
- Loadout name: text-3xl font-bold
- Author: "Created by username" (if public)
- Budget badge: "$100 Budget" (cs2-orange pill)
- Total cost: "$87.50" (text-2xl)
- Under/over budget indicator: "Under Budget: $12.50" (green)

ACTION BUTTONS (Top-right):
- Share button: Opens share modal
- Upvote button: Heart icon + count
- Edit button: (only if owner) "Edit Loadout"

SLOTS BREAKDOWN:
For each weapon slot (Primary, Secondary, Knife, Gloves):
- Slot card with:
  - Slot label: "Primary Weapon"
  - Item image (200x200px)
  - Item name (text-lg)
  - Marketplace: "Available on CSFloat"
  - Price: $42.50
  - "View Markets" button (links to item detail)

TOTAL COST SUMMARY:
- Table format:
  - Row per item: Item name | Price
  - Total row: "Total Cost" | "$87.50"
  - Budget row: "Budget" | "$100.00"
  - Remaining: "Remaining" | "$12.50" (green/red)

SHARE MODAL:
- Title: "Share Loadout"
- Generated URL: https://csloadout.gg/loadouts/[slug]
- "Copy Link" button
- Social share buttons: Twitter, Discord, Reddit
- QR code (optional)

STATS (If public):
- Total views: 1,247
- Total upvotes: 34
- Created: "2 days ago"

BREADCRUMB:
- Home > Loadouts > [Loadout Name]

EMPTY SLOT STATE:
- If slot not filled: "No item selected" + dashed border

DATA STRUCTURE:
interface LoadoutDetail {
  id: string;
  name: string;
  slug: string;
  budget: number;
  totalCost: number;
  items: Array<{
    slot: string;
    item: Item;
    marketplace: string;
    price: number;
  }>;
  isPublic: boolean;
  upvotes: number;
  views: number;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
}

TECH STACK:
- Next.js 14 with TypeScript
- Server Component for page
- Client components for upvote/share
- shadcn/ui Dialog for share modal
- Tailwind CSS
- Lucide icons

API ENDPOINT:
- GET /api/loadouts/[id]
- POST /api/loadouts/[id]/upvote (toggle upvote)

Generate the complete loadout detail page with slots, stats, and sharing.
```

---

### **Prompt 12: Steam Sign In Page (/auth/signin)**

```
Build the Steam authentication sign-in page for csloadout.gg.

PAGE REQUIREMENTS:
- Centered card layout
- "Sign in with Steam" button
- Benefits list
- Guest browsing option
- Terms/privacy links

LAYOUT:
- Centered vertically and horizontally
- Max-width: 500px
- Padding: 48px top/bottom, 16px sides
- Background: bg-cs2-darker

SIGN-IN CARD:
- Container: bg-cs2-dark border rounded-lg p-8
- Title: "Sign in to csloadout.gg" (text-2xl font-bold)
- Subtitle: "Access price alerts, inventory import, and loadout builder"

STEAM BUTTON:
- Full width button
- Height: 56px (large)
- Background: #171a21 (Steam dark)
- Hover: Slightly lighter
- Content:
  - Steam logo icon (left, 24x24px)
  - Text: "Sign in with Steam" (center)
  - Color: white
- onClick: Redirects to /api/auth/steam

BENEFITS LIST:
- Heading: "Why sign in?"
- Unordered list with checkmarks:
  - ✓ Import your Steam inventory
  - ✓ Set unlimited price alerts
  - ✓ Save and share loadouts
  - ✓ Track market trends
- Icon: Lucide Check icon (green)
- Text: text-cs2-light/80

GUEST OPTION:
- Link: "Continue as Guest"
- Text: text-sm text-cs2-light/60
- Hover: text-cs2-blue
- Links to /items (browse without auth)

FOOTER TEXT:
- Small text: text-xs text-cs2-light/40
- "By signing in, you agree to our Terms & Privacy Policy"
- Links to /terms and /privacy (underline on hover)

ERROR STATE (Optional):
- If ?error=auth_failed in URL
- Red alert above card:
  - "Authentication failed. Please try again."
  - Dismiss button

TECH STACK:
- Next.js 14 with TypeScript
- Simple page component
- Tailwind CSS
- Lucide icons
- Link from next/link

Generate the complete Steam sign-in page with benefits and guest option.
```

---

## 🎯 Recommended Build Order

Use these prompts in sequence for best results:

### Week 1: Core Pages
1. ✅ Prompt 1: Home Page
2. ✅ Prompt 2: Items Browse Page
3. ✅ Prompt 3: Item Card Component
4. ✅ Prompt 4: Collections Page
5. ✅ Prompt 5: Collection Detail Page

### Week 2: Features
6. ✅ Prompt 6: Price Comparison Table
7. ✅ Prompt 7: Fee Breakdown Component
8. ✅ Prompt 12: Steam Sign In Page
9. ✅ Prompt 8: Inventory Page

### Week 3: Advanced Features
10. ✅ Prompt 9: Loadout Builder
11. ✅ Prompt 10: Loadouts Gallery
12. ✅ Prompt 11: Loadout Detail Page

---

## 💡 Tips for Using These Prompts with v0.app

1. **Copy-paste exactly** - Prompts are optimized for v0.app's parser
2. **Generate one at a time** - Refine each before moving to next
3. **Ask for refinements:**
   - "Make cards more compact"
   - "Add loading skeletons"
   - "Improve mobile responsive breakpoints"
4. **Request shadcn components** - v0 has all shadcn/ui built-in
5. **Iterate on details** - Start with layout, then interactions, then polish
6. **Export and integrate** - After each prompt, export code into your Next.js project

### Example Follow-up Prompts
- "Add loading skeletons for all data-dependent components"
- "Make this fully responsive with mobile-first approach"
- "Add error states for API failures with retry buttons"
- "Improve accessibility with ARIA labels and keyboard navigation"
- "Add smooth transitions using Tailwind"

---

## 📝 Component Checklist

Mark off components as you build them:

### Core Components
- [ ] Home Page (landing)
- [ ] Items Browse Page with pagination
- [ ] Item Card with image fallback
- [ ] Search Box with debounce
- [ ] Collections Page
- [ ] Collection Detail Page
- [ ] Price Comparison Table with sorting
- [ ] Fee Breakdown with visual chart
- [ ] Inventory Page with import
- [ ] Inventory Import Button
- [ ] Loadout Builder with budget tracker
- [ ] Loadouts Gallery with filters
- [ ] Loadout Detail with sharing
- [ ] Steam Sign In Page

### Optional Enhancements (Phase 2)
- [ ] Global header/navigation
- [ ] Footer
- [ ] Dark mode toggle
- [ ] User profile dropdown
- [ ] Price alerts UI (Phase 1 backend done)
- [ ] Deal feed page (deferred)

---

## 🎨 Design Consistency Checklist

Ensure all components follow these patterns:

- [ ] Dark theme: bg-cs2-darker for pages, bg-cs2-dark for cards
- [ ] Borders: border-cs2-blue/20 default, /50 on hover
- [ ] Text: text-cs2-light for primary, /60 for secondary
- [ ] Buttons: rounded-lg with transition-colors
- [ ] Spacing: Consistent padding (p-4, p-8) and gaps (gap-4, gap-6)
- [ ] Icons: Lucide React, consistent sizing (h-5 w-5)
- [ ] Responsive: Mobile-first, proper breakpoints (md:, lg:)
- [ ] Loading: Skeleton loaders with pulse animation
- [ ] Errors: Red alert boxes with retry options
- [ ] Empty states: Helpful messages with CTAs

---

## 🚀 Summary

**Total Components:** 13 pages/components defined
**Estimated Build Time:** 2-3 weeks with v0.app iteration
**Tech Stack:** Next.js 14, TypeScript, shadcn/ui, Tailwind
**Status:** Based on ~90% complete Phase 1 implementation

These prompts cover all **implemented** features (Features 1-9). Feature 10 (Deal Feed) is intentionally excluded as it's deferred to Phase 2.

**Key Principles:**
✅ Dark CS2 theme with orange accents
✅ Mobile-first responsive design
✅ Performance-first (lazy loading, caching)
✅ Accessibility (keyboard navigation, ARIA)
✅ TypeScript for type safety
✅ Reusable components
✅ Consistent design system
