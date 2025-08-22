export const revalidate = 60;

import { NextRequest, NextResponse } from 'next/server';
import { fetchFredSeries } from '@/lib/fredService';

export async function GET(req: NextRequest) {
  const updated = new Date().toISOString();
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);

    const [dgs10, dgs2] = await Promise.all([
      fetchFredSeries('DGS10', start),
      fetchFredSeries('DGS2', start)
    ]);

    return NextResponse.json({ updated, data: { dgs10, dgs2 } });
  } catch (error) {
    return NextResponse.json({ updated, error: 'Failed to fetch yields' }, { status: 500 });
  }
}


