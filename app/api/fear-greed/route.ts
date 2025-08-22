export const revalidate = 1800;

import { NextResponse } from 'next/server';

function parseNumber(n: any): number | null {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : null;
}

function pick<T = unknown>(obj: any, paths: string[]): T | undefined {
  for (const p of paths) {
    const parts = p.split('.');
    let cur: any = obj;
    for (const k of parts) {
      if (cur && typeof cur === 'object' && k in cur) cur = cur[k];
      else { cur = undefined; break; }
    }
    if (cur !== undefined && cur !== null) return cur as T;
  }
  return undefined;
}

export async function GET() {
  const host = process.env.RAPIDAPI_HOST;
  const path = process.env.RAPIDAPI_PATH;
  const key = process.env.RAPIDAPI_KEY;
  const updated = new Date().toISOString();

  if (!host || !path || !key) {
    return NextResponse.json({ error: 'fgi_failed' }, { status: 502 });
  }

  try {
    const url = `https://${host}${path}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': host
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'fgi_failed' }, { status: 502 });
    }

    const j = await res.json();

    // Provider-normalization – try several common shapes
    const value = parseNumber(
      pick(j, ['fgi.now.value', 'now.value', 'data.now.value', 'value'])
    );
    const label = (pick<string>(j, ['fgi.now.valueText', 'now.valueText', 'data.now.valueText', 'label']) ?? '').toString();
    const wk = parseNumber(
      pick(j, ['fgi.oneWeekAgo.value', 'oneWeekAgo.value', 'data.oneWeekAgo.value'])
    );
    const mo = parseNumber(
      pick(j, ['fgi.oneMonthAgo.value', 'oneMonthAgo.value', 'data.oneMonthAgo.value'])
    );

    if (value === null) {
      return NextResponse.json({ error: 'fgi_failed' }, { status: 502 });
    }

    const payload = { updated, value, label, wk: wk ?? null, mo: mo ?? null };
    const resp = NextResponse.json(payload);
    resp.headers.set('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return resp;
  } catch (e) {
    return NextResponse.json({ error: 'fgi_failed' }, { status: 502 });
  }
}





