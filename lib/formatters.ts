export function formatTwoDecimals(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return Number(value).toFixed(2);
}


