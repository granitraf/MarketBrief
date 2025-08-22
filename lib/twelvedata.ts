const TD_BASE = "https://api.twelvedata.com";

function mustKey() {
  const k = process.env.TWELVEDATA_API_KEY;
  if (!k) throw new Error("Missing TWELVEDATA_API_KEY");
  return k;
}

export async function td(path: string, params: Record<string, string|number> = {}, revalidate = 60) {
  const apikey = mustKey();
  const usp = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)])), apikey });
  const url = `${TD_BASE}${path}?${usp}`;
  const r = await fetch(url, { next: { revalidate }, headers: { "User-Agent":"StockHub/1.0" }});
  if (!r.ok) throw new Error(`TwelveData HTTP ${r.status}`);
  const j = await r.json();
  if ((j as any)?.status === "error") throw new Error((j as any)?.message || "TwelveData error");
  return j;
}

export function toBizFromISO(iso: string) {
  const d = new Date(iso);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth()+1, day: d.getUTCDate() };
}
export function toUnixFromISO(iso: string) {
  return Math.floor(new Date(iso).getTime()/1000);
}





