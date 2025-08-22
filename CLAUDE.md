# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **MacroBrief**, a Next.js 15 financial market dashboard built on a Next.js admin template. It's a one-page dark-themed application that provides real-time market data visualization at `/dashboard`.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with dark theme (`className="dark"`)
- **Components**: Radix UI + Shadcn UI components
- **Database**: Neon Postgres with Drizzle ORM (optional for MacroBrief features)
- **Authentication**: NextAuth v5 with GitHub provider
- **State Management**: Zustand for stock data store
- **Data Fetching**: TanStack Query (React Query) with 60s caching
- **Charts**: Lightweight Charts + Recharts
- **APIs**: Finnhub, Yahoo Finance, TwelveData

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (uses Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Code Architecture

### Path Aliases
- `@/components/*` → `components/*`
- `@/lib/*` → `lib/*`
- `@/features/*` → `features/*`

### Core Structure

**App Router Structure:**
- `app/layout.tsx` - Root layout with dark theme and React Query provider
- `app/dashboard/page.tsx` - Main MacroBrief dashboard (`force-dynamic`)
- `app/api/*` - Server-side API routes with 60s caching

**State Management:**
- `components/store/stockStore.ts` - Zustand store for stock ticker selection, time ranges, watchlist, and live prices

**Data Layer:**
- `lib/db.ts` - Drizzle ORM setup (database optional for MacroBrief)
- `lib/auth.ts` - NextAuth configuration
- API services in `lib/`: `fredService.ts`, `twelvedata.ts`, `quotes.ts`, `marketcap.ts`

**Components:**
- `components/cards/*` - Market data cards (IndicesCard, Mag7Card, etc.)
- `components/ui/*` - Shadcn UI components
- `components/providers/ReactQueryProvider.tsx` - Query client setup

### API Routes Pattern

All market data APIs follow this pattern:
- Located in `app/api/*`
- Return `{ updated: timestamp, data: [...] }`
- Use `unstable_cache` with 60s TTL
- Handle external API errors gracefully

Key endpoints:
- `/api/index-movements` - S&P 500, NASDAQ, DOW
- `/api/mag7` - AAPL, MSFT, AMZN, GOOGL, META, TSLA, NVDA
- `/api/currencies` - DXY, EUR/USD, USD/JPY, GBP/USD
- `/api/crypto` - BTC, ETH spot prices
- `/api/news` - General or symbol-specific news

### Stock Intelligence Hub

Advanced feature with:
- Real-time price tracking via Zustand store
- TwelveData integration for candle charts
- Watchlist functionality
- Multiple time range support (1D, 5D, 1M, etc.)

## Environment Setup

Required for full functionality:
```bash
DATABASE_URL=postgresql://... # Optional for MacroBrief-only
NEXTAUTH_SECRET=changeme
NEXTAUTH_URL=http://localhost:3000
FINNHUB_API_KEY=pk_...
```

## Code Style

- Uses Prettier with single quotes, 2-space tabs
- Dark theme throughout (`bg-zinc-950`, `text-zinc-100`)
- Tailwind utility classes
- TypeScript strict mode enabled
- Server components by default, "use client" when needed

## Database Schema (Optional)

The products table exists for the original admin template but is optional for MacroBrief functionality.