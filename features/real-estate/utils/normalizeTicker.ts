export function normalizeTicker(input?: string) {
  if (!input) return "";
  const raw = String(input).trim();
  const cleaned = raw.replace(/^\s*\$/,"" ).trim();
  const symbol = cleaned.toUpperCase();
  if (process.env.NODE_ENV !== "production" && raw !== symbol && raw.startsWith("$")) {
    // eslint-disable-next-line no-console
    console.warn("[RealEstate] Stripped leading $ from ticker:", raw, "→", symbol);
  }
  return symbol;
}





