export const revalidate = 60;

import { NextResponse } from 'next/server';
import { fetchFredSeries } from '@/lib/fredService';

export async function GET() {
  const updated = new Date().toISOString();
  const start = '2023-01-01';
  try {
    const series = await fetchFredSeries('MOVE', start);
    const valid = series.filter((o) => o.value !== null);
    const last = valid.length > 0 ? (valid[valid.length - 1].value as number) : null;
    return NextResponse.json({ updated, data: { value: last } });
  } catch (error) {
    // Be resilient: return null value instead of 500 so UI doesn't break
    return NextResponse.json({ updated, data: { value: null } });
  }
}


