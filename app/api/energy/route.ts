export const revalidate = 60;

import { NextResponse } from 'next/server';
import { resolveQuote } from '@/lib/quotes';

type Item = { code: string; label: string; price: number | null; changePct: number | null };

export async function GET() {
  const updated = new Date().toISOString();
  try {
    const defs: { code: string; label: string; fh: string[]; yh: string[] }[] = [
      { code: 'WTI', label: 'WTI Crude Oil', fh: ['OANDA:WTICO_USD', 'ICE:WTI1!'], yh: ['CL=F'] },
      { code: 'BRENT', label: 'Brent Crude Oil', fh: ['OANDA:BCO_USD', 'ICE:BRN1!'], yh: ['BZ=F'] },
      { code: 'NG', label: 'US Natural Gas', fh: ['OANDA:NATGAS_USD'], yh: ['NG=F'] },
      { code: 'TTF', label: 'EU Natural Gas', fh: ['ICE:TTF1!', 'ICE:TTE1!'], yh: ['TTF=F'] },
    ];

    const items: Item[] = [];
    for (const d of defs) {
      const r = await resolveQuote({ yh: d.yh, fh: d.fh });
      items.push({ code: d.code, label: d.label, price: r.price, changePct: r.changePct });
    }

    const res = NextResponse.json({ updated, items });
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });
  }
}


