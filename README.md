<div align="center"><strong>Next.js 15 Admin Dashboard Template</strong></div>
<div align="center">Built with the Next.js App Router</div>
<br />
<div align="center">
<a href="https://next-admin-dash.vercel.app/">Demo</a>
<span> · </span>
<a href="https://vercel.com/templates/next.js/admin-dashboard-tailwind-postgres-react-nextjs">Clone & Deploy</a>
<span>
</div>

## Overview

This is a starter template using the following stack:

- Framework - [Next.js (App Router)](https://nextjs.org)
- Language - [TypeScript](https://www.typescriptlang.org)
- Auth - [Auth.js](https://authjs.dev)
- Database - [Postgres](https://vercel.com/postgres)
- Deployment - [Vercel](https://vercel.com/docs/concepts/next.js/overview)
- Styling - [Tailwind CSS](https://tailwindcss.com)
- Components - [Shadcn UI](https://ui.shadcn.com/)
- Analytics - [Vercel Analytics](https://vercel.com/analytics)
- Formatting - [Prettier](https://prettier.io)

This template uses the new Next.js App Router. This includes support for enhanced layouts, colocation of components, tests, and styles, component-level data fetching, and more.

## Getting Started

During the deployment, Vercel will prompt you to create a new Postgres database. This will add the necessary environment variables to your project.

Inside the Vercel Postgres dashboard, create a table based on the schema defined in this repository.

```
CREATE TYPE status AS ENUM ('active', 'inactive', 'archived');

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  name TEXT NOT NULL,
  status status NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER NOT NULL,
  available_at TIMESTAMP NOT NULL
);
```

Then, uncomment `app/api/seed.ts` and hit `http://localhost:3000/api/seed` to seed the database with products.

Next, copy the `.env.example` file to `.env` and update the values. Follow the instructions in the `.env.example` file to set up your GitHub OAuth application.

```bash
npm i -g vercel
vercel link
vercel env pull
```

Finally, run the following commands to start the development server:

```
pnpm install
pnpm dev
```

You should now be able to access the application at http://localhost:3000.

## MacroBrief Additions

This template is extended with a one-page, dark-themed market dashboard (MacroBrief) available at `/dashboard`.

### Run locally

1. Create `.env.local` in the project root with:

```
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
NEXTAUTH_SECRET=changeme
NEXTAUTH_URL=http://localhost:3000

FINNHUB_API_KEY=pk_...your_finnhub_key...
```

2. Install deps and start dev server:

```
pnpm install
pnpm dev
```

Then open `http://localhost:3000/dashboard`.

### API routes

All routes are server-side, cache for 60s, and respond with `{ updated, data }`:

- `GET /api/index-movements` – S&P 500, NASDAQ, DOW (Yahoo Finance)
- `GET /api/mag7` – AAPL, MSFT, AMZN, GOOGL, META, TSLA, NVDA (Yahoo Finance)
- `GET /api/currencies` – DXY, EUR/USD, USD/JPY, GBP/USD (Yahoo Finance)
- `GET /api/commodities` – Gold, WTI Oil, Nat Gas, Corn (Yahoo Finance)
- `GET /api/crypto` – BTC, ETH spot (Yahoo Finance)
- `GET /api/news` – General news (Finnhub) or `?symbol=XYZ` for company news

### Extend

- Cards live in `components/cards/*` and fetch from `app/api/*` via React Query.
- Add more cards by creating a client component and a route under `app/api/*`.
# MarketBrief

hello