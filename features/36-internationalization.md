# Feature 36: Internationalization (i18n)

## Overview
Comprehensive internationalization system enabling csloadout.gg to serve global CS2 trading communities in multiple languages, currencies, and regional formats. Includes dynamic language switching, localized content, currency conversion, region-specific pricing, RTL (Right-to-Left) language support, and localized SEO. Expands platform reach to non-English markets (China, Russia, Brazil, Turkey, etc.).

## User Segments
- **Primary**: International Users (non-English speakers)
- **Secondary**: All User Segments (global reach)
- **Tertiary**: Regional Market Specialists

## User Stories

### As a Chinese User
- I want to browse the platform in Simplified Chinese
- I want to see prices in CNY (Chinese Yuan) with Buff163 market data
- I want region-specific content (Chinese trading platforms, payment methods)
- I want Chinese SEO optimization for Baidu search

### As a Russian User
- I want to browse in Russian (Cyrillic script)
- I want prices in RUB (Russian Ruble)
- I want to see popular Russian trading platforms (CSM, CSGOTrade)
- I want Yandex SEO optimization

### As a Brazilian User
- I want to browse in Portuguese (Brazil)
- I want prices in BRL (Brazilian Real)
- I want localized number formats (R$ 1.234,56)
- I want Brazilian payment methods (PIX, Boleto)

### As a Turkish User
- I want to browse in Turkish
- I want prices in TRY (Turkish Lira)
- I want to see regional trading communities
- I want localized date/time formats

### As an Arab User
- I want to browse in Arabic with RTL (Right-to-Left) layout
- I want prices in local currencies (SAR, AED)
- I want culturally appropriate UI/UX

### As the Platform
- I want to capture international markets (60%+ of CS2 players are non-English)
- I want to rank in regional search engines (Baidu, Yandex, Naver)
- I want to support regional payment providers
- I want to comply with regional data privacy laws (GDPR, LGPD, etc.)

## Research & Context

### Internationalization Architecture

1. **Translation Management**
   - **next-i18next**: i18n for Next.js (built on react-i18next)
   - **Translation Files**: JSON format per language (`/locales/{lang}/common.json`)
   - **Translation Keys**: Namespaced keys (`common:portfolio.title`, `alerts:threshold`)
   - **Pluralization**: Support for plural forms (0 items, 1 item, 2+ items)
   - **Interpolation**: Dynamic values in translations (Hello, {name}!)

2. **Supported Languages (Priority)**
   - **Tier 1**: English (en), Simplified Chinese (zh-CN), Russian (ru)
   - **Tier 2**: Portuguese Brazil (pt-BR), Turkish (tr), German (de), French (fr)
   - **Tier 3**: Spanish (es), Polish (pl), Korean (ko), Arabic (ar)

3. **Currency & Number Formatting**
   - **Intl.NumberFormat**: Native JavaScript internationalization
   - **Currency Conversion**: Real-time exchange rates (USD base)
   - **Regional Formats**: Decimal separators, thousands separators, currency symbols
   - **Examples**:
     - US: $1,234.56
     - EU: €1.234,56
     - CN: ¥1,234.56
     - BR: R$ 1.234,56

4. **Date & Time Formatting**
   - **Intl.DateTimeFormat**: Locale-aware date formatting
   - **Timezones**: User timezone detection and conversion
   - **Relative Time**: "2 hours ago" (localized)

5. **RTL (Right-to-Left) Support**
   - **Languages**: Arabic (ar), Hebrew (he), Farsi (fa)
   - **Layout**: Mirror UI components (menu on right, text alignment right)
   - **CSS**: `dir="rtl"` attribute, logical properties (margin-inline-start)

6. **SEO Localization**
   - **hreflang Tags**: Indicate language/region variants to search engines
   - **Regional Domains/Subdomains**: csloadout.gg/zh, csloadout.gg/ru
   - **Localized Meta Tags**: Title, description, keywords per language
   - **Regional Sitemap**: Separate sitemaps for each language

### Competitor Internationalization

- **Steam Community Market**: 28 languages, auto-detect, currency conversion
- **Buff163**: Chinese-only (massive success in China)
- **CSGOEmpire**: English + Russian (limited i18n)
- **Opportunity**: First comprehensive CS2 platform with full i18n for all major markets

## Technical Requirements

### Database Schema Extensions

```sql
-- User language preferences
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en'; -- 'en', 'zh-CN', 'ru', etc.
ALTER TABLE users ADD COLUMN preferred_currency VARCHAR(3) DEFAULT 'USD'; -- 'USD', 'CNY', 'RUB', etc.
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'; -- 'America/New_York', 'Asia/Shanghai'

-- Localized content (for dynamic content like articles, guides)
CREATE TABLE localized_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content reference
  content_type VARCHAR(50) NOT NULL, -- 'article', 'guide', 'faq'
  content_id UUID NOT NULL, -- ID of original content

  -- Localization
  language VARCHAR(10) NOT NULL, -- 'zh-CN', 'ru', etc.
  title VARCHAR(500),
  body TEXT,
  meta_description VARCHAR(500),
  meta_keywords VARCHAR(500)[],

  -- Status
  is_published BOOLEAN DEFAULT false,
  translated_by UUID REFERENCES users(id), -- Translator user ID
  reviewed_by UUID REFERENCES users(id), -- Reviewer user ID

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (content_id, language),
  INDEX idx_localized_content_language (language, is_published)
);

-- Exchange rates (for currency conversion)
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Currency pair
  from_currency VARCHAR(3) NOT NULL, -- 'USD'
  to_currency VARCHAR(3) NOT NULL, -- 'CNY', 'RUB', etc.

  -- Rate
  rate DECIMAL(18,8) NOT NULL, -- 1 USD = 7.24 CNY
  inverse_rate DECIMAL(18,8), -- 1 CNY = 0.138 USD

  -- Source
  source VARCHAR(50), -- 'openexchangerates.org', 'manual'

  -- Timestamps
  effective_date TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (from_currency, to_currency, effective_date),
  INDEX idx_exchange_rates_date (effective_date DESC)
);
```

### Next.js i18n Configuration

#### `next.config.js`

```javascript
const { i18n } = require('./next-i18next.config');

module.exports = {
  i18n,
  // ... other config
};
```

#### `next-i18next.config.js`

```javascript
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-CN', 'ru', 'pt-BR', 'tr', 'de', 'fr', 'es', 'pl', 'ko', 'ar'],
    localeDetection: true, // Auto-detect user language
  },
  localePath: './public/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
```

### Translation Files

#### `public/locales/en/common.json`

```json
{
  "nav": {
    "home": "Home",
    "portfolio": "Portfolio",
    "alerts": "Alerts",
    "market": "Market",
    "craft": "Craft",
    "profile": "Profile"
  },
  "portfolio": {
    "title": "My Portfolio",
    "totalValue": "Total Value",
    "change24h": "24h Change",
    "items": "{{count}} item",
    "items_plural": "{{count}} items"
  },
  "alerts": {
    "createAlert": "Create Alert",
    "threshold": "Price Threshold",
    "aboveBelow": "Above / Below"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  }
}
```

#### `public/locales/zh-CN/common.json`

```json
{
  "nav": {
    "home": "首页",
    "portfolio": "我的库存",
    "alerts": "价格提醒",
    "market": "市场",
    "craft": "印花合成",
    "profile": "个人资料"
  },
  "portfolio": {
    "title": "我的库存",
    "totalValue": "总价值",
    "change24h": "24小时涨跌",
    "items": "{{count}} 件物品"
  },
  "alerts": {
    "createAlert": "创建价格提醒",
    "threshold": "价格阈值",
    "aboveBelow": "高于 / 低于"
  },
  "common": {
    "loading": "加载中...",
    "error": "发生错误",
    "save": "保存",
    "cancel": "取消",
    "delete": "删除"
  }
}
```

#### `public/locales/ru/common.json`

```json
{
  "nav": {
    "home": "Главная",
    "portfolio": "Портфель",
    "alerts": "Уведомления",
    "market": "Рынок",
    "craft": "Крафт",
    "profile": "Профиль"
  },
  "portfolio": {
    "title": "Мой портфель",
    "totalValue": "Общая стоимость",
    "change24h": "Изменение за 24ч",
    "items": "{{count}} предмет",
    "items_plural": "{{count}} предметов"
  },
  "alerts": {
    "createAlert": "Создать уведомление",
    "threshold": "Порог цены",
    "aboveBelow": "Выше / Ниже"
  },
  "common": {
    "loading": "Загрузка...",
    "error": "Произошла ошибка",
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить"
  }
}
```

### Services

#### `src/services/InternationalizationService.ts`

```typescript
import { db } from '@/lib/db';

export class InternationalizationService {
  /**
   * Get user language preference
   */
  async getUserLanguage(userId: string): Promise<string> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { preferred_language: true },
    });

    return user?.preferred_language || 'en';
  }

  /**
   * Update user language preference
   */
  async updateUserLanguage(userId: string, language: string): Promise<void> {
    await db.users.update({
      where: { id: userId },
      data: { preferred_language: language },
    });
  }

  /**
   * Get user currency preference
   */
  async getUserCurrency(userId: string): Promise<string> {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { preferred_currency: true },
    });

    return user?.preferred_currency || 'USD';
  }

  /**
   * Update user currency preference
   */
  async updateUserCurrency(userId: string, currency: string): Promise<void> {
    await db.users.update({
      where: { id: userId },
      data: { preferred_currency: currency },
    });
  }

  /**
   * Convert price to user's preferred currency
   */
  async convertPrice(amountUSD: number, toCurrency: string): Promise<number> {
    if (toCurrency === 'USD') return amountUSD;

    // Get latest exchange rate
    const rate = await this.getExchangeRate('USD', toCurrency);

    if (!rate) {
      console.warn(`Exchange rate not found for USD -> ${toCurrency}`);
      return amountUSD;
    }

    return amountUSD * rate;
  }

  /**
   * Get exchange rate
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
    const rateRecord = await db.exchange_rates.findFirst({
      where: {
        from_currency: fromCurrency,
        to_currency: toCurrency,
      },
      orderBy: { effective_date: 'desc' },
    });

    return rateRecord?.rate || null;
  }

  /**
   * Fetch and update exchange rates from external API
   */
  async updateExchangeRates(): Promise<void> {
    // Use Open Exchange Rates API or similar
    const apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;
    const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
    const data = await response.json();

    const baseCurrency = data.base; // Usually 'USD'
    const rates = data.rates; // { CNY: 7.24, RUB: 92.5, EUR: 0.93, ... }

    // Store rates in database
    for (const [currency, rate] of Object.entries(rates)) {
      await db.exchange_rates.upsert({
        where: {
          from_currency_to_currency_effective_date: {
            from_currency: baseCurrency,
            to_currency: currency,
            effective_date: new Date(),
          },
        },
        update: {
          rate: rate as number,
          inverse_rate: 1 / (rate as number),
          fetched_at: new Date(),
        },
        create: {
          from_currency: baseCurrency,
          to_currency: currency,
          rate: rate as number,
          inverse_rate: 1 / (rate as number),
          source: 'openexchangerates.org',
          effective_date: new Date(),
        },
      });
    }
  }

  /**
   * Get localized content
   */
  async getLocalizedContent(contentId: string, language: string, contentType: string): Promise<any | null> {
    const localized = await db.localized_content.findFirst({
      where: {
        content_id: contentId,
        content_type: contentType,
        language,
        is_published: true,
      },
    });

    return localized;
  }
}

export const internationalizationService = new InternationalizationService();
```

#### `src/lib/i18n/formatters.ts`

```typescript
/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format date/time
 */
export function formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date, locale: string): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
}
```

### Frontend Components

#### `src/app/[locale]/layout.tsx`

```typescript
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'zh-CN' },
    { locale: 'ru' },
    { locale: 'pt-BR' },
    { locale: 'tr' },
    { locale: 'de' },
    { locale: 'fr' },
  ];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  // Determine text direction (RTL for Arabic, Hebrew)
  const dir = ['ar', 'he', 'fa'].includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="alternate" hrefLang="en" href="https://csloadout.gg/en" />
        <link rel="alternate" hrefLang="zh-CN" href="https://csloadout.gg/zh-CN" />
        <link rel="alternate" hrefLang="ru" href="https://csloadout.gg/ru" />
        {/* More hreflang tags */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### `src/components/LanguageSwitcher.tsx`

```typescript
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'next-i18next';

export const LanguageSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const changeLanguage = (langCode: string) => {
    // Update URL to new locale
    const newPath = pathname.replace(`/${i18n.language}`, `/${langCode}`);
    router.push(newPath);
  };

  return (
    <div className="relative">
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="border rounded px-3 py-2"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};
```

#### `src/components/PriceDisplay.tsx`

```typescript
'use client';

import { useTranslation } from 'next-i18next';
import { formatPrice } from '@/lib/i18n/formatters';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export const PriceDisplay = ({ amountUSD }: { amountUSD: number }) => {
  const { i18n } = useTranslation();
  const { currency, convertedAmount } = useUserPreferences(amountUSD);

  return (
    <span className="font-semibold">
      {formatPrice(convertedAmount, currency, i18n.language)}
    </span>
  );
};
```

## Success Metrics
1. **International User Growth**: 40%+ of users from non-English markets within 6 months
2. **Regional SEO**: Rank in top 10 for CS2 keywords in Baidu (China), Yandex (Russia)
3. **Translation Quality**: 95%+ user satisfaction with translations (survey)
4. **Regional Engagement**: 30%+ of Chinese users prefer CNY prices over USD
5. **Language Coverage**: 10+ languages supported with 100% translation coverage

## Dependencies
- **All Features**: i18n affects entire platform
- **Feature 03**: Price Tracking (currency conversion for prices)
- **Feature 31**: Public API (localized API responses)

## Effort Estimate
- **i18n Setup (next-i18next)**: 8 hours
- **Translation Files (10 languages × 500 strings)**: 40 hours (with professional translators)
- **Database Schema Extensions**: 4 hours
- **InternationalizationService**: 12 hours
- **Currency Conversion System**: 8 hours
- **Exchange Rate API Integration**: 6 hours
- **RTL Support (CSS)**: 12 hours
- **Localized SEO (hreflang, meta tags)**: 8 hours
- **Language Switcher Component**: 4 hours
- **Localized Content Management**: 8 hours
- **Testing (all languages)**: 16 hours
- **Documentation**: 8 hours
- **Total**: ~134 hours (3.35 weeks) + translation cost

## Implementation Notes
1. **Translation Management**: Use Crowdin or Lokalise for collaborative translation
2. **Professional Translators**: Hire native speakers for Tier 1 languages (zh-CN, ru)
3. **Currency Rates**: Update exchange rates daily (cron job)
4. **SEO**: Implement hreflang tags for all language variants
5. **RTL Testing**: Test Arabic layout thoroughly (CSS logical properties)
6. **Regional Pricing**: Consider regional pricing strategies (lower prices in developing markets)

## Gotchas
1. **Pluralization**: Different languages have different plural rules (Russian has 3 forms!)
2. **Text Expansion**: Translated text can be 30-50% longer (German, Russian) - design for it
3. **RTL Layout**: Icons, arrows, navigation must flip for RTL languages
4. **Currency Symbols**: Some currencies have symbols after amount (€ 100 vs 100 €)
5. **Date Formats**: US uses MM/DD/YYYY, EU uses DD/MM/YYYY, China uses YYYY-MM-DD
6. **Legal Compliance**: GDPR (EU), LGPD (Brazil), PIPL (China) - regional privacy laws

## Status Checklist
- [ ] next-i18next configured
- [ ] Database schema extended (user preferences, exchange rates)
- [ ] Translation files created for 10 languages
- [ ] InternationalizationService implemented
- [ ] Currency conversion system working
- [ ] Exchange rate API integrated (daily updates)
- [ ] RTL support implemented and tested
- [ ] Language switcher component built
- [ ] Localized SEO implemented (hreflang tags)
- [ ] All UI components support i18n
- [ ] Professional translations completed (Tier 1 languages)
- [ ] Regional pricing configured
- [ ] Unit tests written (90% coverage)
- [ ] Testing completed (all languages, RTL)
- [ ] Documentation completed (translation guide)

## Related Features
- **All Features**: i18n is cross-cutting concern
- **Feature 03**: Price Tracking (currency conversion)
- **Feature 31**: Public API (localized responses)

## References
- [next-i18next Documentation](https://github.com/i18next/next-i18next)
- [React i18next](https://react.i18next.com/)
- [Intl API (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [Open Exchange Rates API](https://openexchangerates.org/)
- [Crowdin (Translation Management)](https://crowdin.com/)
- [RTL Styling Best Practices](https://rtlstyling.com/)
- [hreflang Implementation Guide](https://developers.google.com/search/docs/advanced/crawling/localized-versions)
