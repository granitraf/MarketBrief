export type RangeKey = "1D" | "5D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";

export interface RangeConfig {
  key: RangeKey;
  label: string;
  tickCount: number;
  isIntraday: boolean;
  timeFormat: string;
  interval: string;
  startDays: number;
  dataInterval: string; // New field for API data resolution
}

// Range-specific configurations
export const RANGE_CONFIGS: Record<RangeKey, RangeConfig> = {
  "1D": {
    key: "1D",
    label: "1D",
    tickCount: 7,
    isIntraday: true,
    timeFormat: "HH:mm",
    interval: "5min",
    startDays: 1,
    dataInterval: "1m" // 1-minute intervals for 1D
  },
  "5D": {
    key: "5D",
    label: "5D",
    tickCount: 6,
    isIntraday: true,
    timeFormat: "MMM d HH:mm",
    interval: "15min",
    startDays: 14,
    dataInterval: "15m" // 15-minute intervals for 5D
  },
  "1M": {
    key: "1M",
    label: "1M",
    tickCount: 8,
    isIntraday: false,
    timeFormat: "MMM d",
    interval: "1day",
    startDays: 45,
    dataInterval: "1day" // Daily intervals for 1M
  },
  "3M": {
    key: "3M",
    label: "3M",
    tickCount: 8,
    isIntraday: false,
    timeFormat: "MMM d",
    interval: "1day",
    startDays: 110,
    dataInterval: "1day" // Daily intervals for 3M
  },
  "6M": {
    key: "6M",
    label: "6M",
    tickCount: 6,
    isIntraday: false,
    timeFormat: "MMM",
    interval: "1day",
    startDays: 220,
    dataInterval: "1day" // Daily intervals for 6M
  },
  "YTD": {
    key: "YTD",
    label: "YTD",
    tickCount: 6,
    isIntraday: false,
    timeFormat: "MMM",
    interval: "1day",
    startDays: 0, // Special case, calculated from year start
    dataInterval: "1day" // Daily intervals for YTD
  },
  "1Y": {
    key: "1Y",
    label: "1Y",
    tickCount: 6,
    isIntraday: false,
    timeFormat: "MMM",
    interval: "1day",
    startDays: 400,
    dataInterval: "1day" // Daily intervals for 1Y
  },
  "5Y": {
    key: "5Y",
    label: "5Y",
    tickCount: 6,
    isIntraday: false,
    timeFormat: "MMM",
    interval: "1week",
    startDays: 5 * 365 + 30,
    dataInterval: "1week" // Weekly intervals for 5Y
  },
  "MAX": {
    key: "MAX",
    label: "MAX",
    tickCount: 6,
    isIntraday: false,
    timeFormat: "MMM",
    interval: "1month",
    startDays: 20 * 365,
    dataInterval: "1month" // Monthly intervals for MAX
  }
};

// Get range configuration by key
export function getRangeConfig(range: RangeKey): RangeConfig {
  return RANGE_CONFIGS[range];
}

// Check if range is intraday
export function isIntradayRange(range: RangeKey): boolean {
  return RANGE_CONFIGS[range]?.isIntraday ?? false;
}

// Get data interval for a range (for API calls)
export function getDataInterval(range: RangeKey): string {
  return RANGE_CONFIGS[range]?.dataInterval ?? "1day";
}

// Check if two ranges have the same data interval (for memoization)
export function hasSameDataInterval(range1: RangeKey, range2: RangeKey): boolean {
  return getDataInterval(range1) === getDataInterval(range2);
}

// Generate "nice" ticks for Y-axis with consistent step
export function computeNiceTicks(
  min: number, 
  max: number, 
  target: number = 6
): { ticks: number[], step: number, domain: [number, number] } {
  if (min === max) {
    // Handle flat line case - create symmetric buffer
    const buffer = Math.abs(min) * 0.1 || 1;
    min = min - buffer;
    max = max + buffer;
  }
  
  // Add padding (1-2%)
  const range = max - min;
  const padding = range * 0.02;
  const paddedMin = min - padding;
  const paddedMax = max + padding;
  
  // Calculate nice step
  const step = calculateNiceStep(range, target);
  
  // Generate ticks
  const startTick = Math.ceil(paddedMin / step) * step;
  const endTick = Math.floor(paddedMax / step) * step;
  const ticks: number[] = [];
  
  for (let tick = startTick; tick <= endTick; tick += step) {
    if (tick >= paddedMin && tick <= paddedMax) {
      ticks.push(tick);
    }
  }
  
  // Ensure we have at least 2 ticks
  if (ticks.length < 2) {
    ticks.push(paddedMin, paddedMax);
  }
  
  return {
    ticks,
    step,
    domain: [paddedMin, paddedMax]
  };
}

// Calculate nice step size for given range and target tick count
function calculateNiceStep(range: number, target: number): number {
  const roughStep = range / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  
  // Nice step values: 1, 2, 5, 10
  let niceStep = 1;
  if (normalizedStep <= 1) niceStep = 1;
  else if (normalizedStep <= 2) niceStep = 2;
  else if (normalizedStep <= 5) niceStep = 5;
  else niceStep = 10;
  
  return niceStep * magnitude;
}

// Get appropriate tick count for range to prevent overlap
export function getOptimalTickCount(range: RangeKey, dataLength: number): number {
  const config = RANGE_CONFIGS[range];
  const baseCount = config?.tickCount ?? 6;
  
  // Reduce tick count if data is sparse
  if (dataLength < baseCount * 2) {
    return Math.max(3, Math.floor(dataLength / 2));
  }
  
  return baseCount;
}

// Calculate start date for range
export function getStartDate(range: RangeKey): Date {
  const config = RANGE_CONFIGS[range];
  
  if (range === "YTD") {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  }
  
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (config?.startDays ?? 30));
  return startDate;
}

// Validate range key
export function isValidRange(range: string): range is RangeKey {
  return range in RANGE_CONFIGS;
}

// Get current time in America/New_York timezone as epoch ms
export function getNowET(): number {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  return nyTime.getTime();
}

// Get interval duration in milliseconds
export function getIntervalMs(interval: string): number {
  switch (interval) {
    case "1min": return 60 * 1000;
    case "15min": return 15 * 60 * 1000;
    case "1day": return 24 * 60 * 60 * 1000;
    case "1week": return 7 * 24 * 60 * 60 * 1000;
    case "1month": return 30 * 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

// Build time window for a range that extends to present day
export function buildTimeWindow(range: RangeKey): { start: number; end: number; isIntraday: boolean } {
  const nowET = getNowET();
  const today = new Date(nowET);
  const currentYear = today.getFullYear();
  
  switch (range) {
    case "1D": {
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      return { start: startOfDay.getTime(), end: nowET, isIntraday: true };
    }
    case "5D": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7); // 7 days back to ensure we get 5 trading days
      return { start: startDate.getTime(), end: nowET, isIntraday: true };
    }
    case "1M": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 35);
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    case "3M": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 100);
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    case "6M": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 200);
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    case "YTD": {
      const startDate = new Date(Date.UTC(currentYear, 0, 1));
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    case "1Y": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 380);
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    case "5Y": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (5 * 365 + 30));
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    case "MAX": {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (20 * 365));
      return { start: startDate.getTime(), end: nowET, isIntraday: false };
    }
    default:
      return { start: nowET - (24 * 60 * 60 * 1000), end: nowET, isIntraday: false };
  }
}
