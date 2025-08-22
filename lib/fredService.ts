export type FredObservation = {
  date: string;
  value: number | null;
};

export async function fetchFredSeries(seriesId: string, observationStart: string): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('Missing FRED_API_KEY');
  }

  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('observation_start', observationStart);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`FRED error ${res.status}`);
  }
  const json = await res.json();
  const observations = Array.isArray(json?.observations) ? json.observations : [];

  return observations.map((o: any) => ({
    date: o.date,
    value: parseFredNumber(o.value)
  }));
}

function parseFredNumber(v: string): number | null {
  if (v === '.' || v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}


