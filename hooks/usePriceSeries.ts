import { useMemo } from 'react';
import { getRangeConfig, getOptimalTickCount, computeNiceTicks, type RangeKey, getDataInterval } from '../lib/ranges';
import { formatTime, formatPrice, preventLabelCollisions } from '../lib/formatters';

// Re-export RangeKey for convenience
export type { RangeKey };

export interface PricePoint {
  t: number; // unix timestamp in ms
  c: number; // close price
}

export interface ChartDataPoint {
  time: number; // can be timestamp or index
  value: number; // price value
  timeLabel?: string; // formatted time label
  ts?: number; // original timestamp (for 5D tooltip/labels)
}

export interface TransformedSeries {
  data: ChartDataPoint[];
  timeLabels: string[];
  priceLabels: string[];
  yDomain: [number, number];
  tickStep: number;
  range: RangeKey;
  isIntraday: boolean;
  dataInterval: string; // Add data interval to the series
  timestampLookup?: Map<number, number>; // For 5D: index -> timestamp mapping
}

export interface UsePriceSeriesOptions {
  data: PricePoint[];
  range: RangeKey;
  livePrice?: number | null;
  dataInterval?: string; // Optional override for data interval
}

// Check if a date is a trading day (Monday-Friday) and within market hours
function isTradingDay(timestamp: number): boolean {
  const date = new Date(timestamp);
  const day = date.getDay();
  
  // Only Monday (1) through Friday (5)
  if (day < 1 || day > 5) return false;
  
  // Convert to America/New_York timezone
  const nyTime = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  
  return totalMinutes >= marketOpen && totalMinutes <= marketClose;
}

// Get the last N trading days from a given date (including today if it's a trading day)
function getLastNTradingDays(fromDate: Date, n: number): Date[] {
  const tradingDays: Date[] = [];
  let currentDate = new Date(fromDate);
  
  // First, check if today is a trading day and include it
  const today = new Date(fromDate);
  const todayDayOfWeek = today.getDay();
  if (todayDayOfWeek >= 1 && todayDayOfWeek <= 5) {
    tradingDays.push(new Date(today));
  }
  
  // Then work backwards to get the remaining trading days
  let daysBack = 1;
  while (tradingDays.length < n) {
    const previousDate = new Date(today);
    previousDate.setDate(today.getDate() - daysBack);
    
    const dayOfWeek = previousDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      tradingDays.push(previousDate);
    }
    
    daysBack++;
  }
  
  // Return in chronological order (oldest first)
  return tradingDays.sort((a, b) => a.getTime() - b.getTime());
}

// Filter and process 5D data to get exactly the last 5 trading days
function process5DData(data: PricePoint[]): { processedData: PricePoint[], timestampLookup: Map<number, number> } {
  if (!data || data.length === 0) {
    return { processedData: data, timestampLookup: new Map() };
  }
  
  // Get the last 5 trading days from today
  const today = new Date();
  const last5TradingDays = getLastNTradingDays(today, 5);
  
  // Convert to date strings for comparison (YYYY-MM-DD format)
  const targetDates = last5TradingDays.map(date => 
    date.toLocaleDateString("en-US", {timeZone: "America/New_York"}).split(',')[0]
  );
  
  console.log('Current date (NY timezone):', today.toLocaleDateString("en-US", {timeZone: "America/New_York"}));
  console.log('Target trading days for 5D:', targetDates);
  console.log('Target trading days count:', targetDates.length);
  
  // Filter data to only include points from the last 5 trading days
  const filteredData = data.filter(point => {
    const pointDate = new Date(point.t);
    const pointDateString = pointDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}).split(',')[0];
    return targetDates.includes(pointDateString);
  });
  
  console.log('Filtered data points for 5D:', filteredData.length);
  
  // If we don't have enough data, include more recent data to ensure we have today
  if (filteredData.length < 10) {
    console.log('Not enough filtered data, including more recent data points');
    // Sort all data by timestamp and take the most recent points
    const sortedData = [...data].sort((a, b) => b.t - a.t);
    const recentData = sortedData.slice(0, Math.max(50, filteredData.length + 20));
    
    // Re-filter with more inclusive date range
    const extendedFilteredData = recentData.filter(point => {
      const pointDate = new Date(point.t);
      const pointDateString = pointDate.toLocaleDateString("en-US", {timeZone: "America/New_York"}).split(',')[0];
      return targetDates.includes(pointDateString);
    });
    
    if (extendedFilteredData.length > filteredData.length) {
      console.log('Extended filtering found more data:', extendedFilteredData.length);
      filteredData.length = 0;
      filteredData.push(...extendedFilteredData);
    }
  }
  
  // Sort by timestamp
  filteredData.sort((a, b) => a.t - b.t);
  
  // Create ordinal mapping with continuous indices
  const processedData: PricePoint[] = [];
  const timestampLookup = new Map<number, number>();
  
  filteredData.forEach((point, index) => {
    processedData.push({
      t: index, // Use ordinal index for X-axis positioning
      c: point.c
    });
    timestampLookup.set(index, point.t); // Store original timestamp
  });
  
  return { processedData, timestampLookup };
}

export function usePriceSeries({ data, range, livePrice, dataInterval }: UsePriceSeriesOptions): TransformedSeries {
  // Get the appropriate data interval for this range
  const effectiveInterval = dataInterval || getDataInterval(range);
  
  return useMemo(() => {
    if (!data || data.length === 0) {
      return {
        data: [],
        timeLabels: [],
        priceLabels: [],
        yDomain: [0, 0],
        tickStep: 0,
        range,
        isIntraday: false,
        dataInterval: effectiveInterval
      };
    }

    const config = getRangeConfig(range);
    const isIntraday = config?.isIntraday ?? false;

    // Special processing for 5D range to remove non-trading days
    let processedData = data;
    let timestampLookup: Map<number, number> | undefined;
    
    if (range === "5D") {
      const result = process5DData(data);
      processedData = result.processedData;
      timestampLookup = result.timestampLookup;
    }

    // Transform data to chart format for all ranges (including 5D)
    const transformedData: ChartDataPoint[] = processedData.map(point => ({
      time: point.t,
      value: point.c,
      ts: timestampLookup?.get(point.t) // Include original timestamp for 5D
    }));
    
    const timeLabels = processedData.map(point => {
      if (range === "5D" && timestampLookup) {
        // For 5D, use the original timestamp for formatting
        return formatTime(range, timestampLookup.get(point.t) || point.t);
      }
      return formatTime(range, point.t);
    });

    // Calculate price range and generate ticks
    const prices = transformedData.map(point => point.value);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Handle flat line case
    if (minPrice === maxPrice) {
      const buffer = Math.abs(minPrice) * 0.1 || 1;
      const yDomain: [number, number] = [minPrice - buffer, maxPrice + buffer];
      const tickStep = buffer / 2;
      
      return {
        data: transformedData,
        timeLabels,
        priceLabels: [minPrice.toString()],
        yDomain,
        tickStep,
        range,
        isIntraday,
        dataInterval: effectiveInterval,
        timestampLookup
      };
    }

    // Generate nice ticks
    const optimalTickCount = getOptimalTickCount(range, transformedData.length);
    const { ticks, step, domain } = computeNiceTicks(minPrice, maxPrice, optimalTickCount);

    // Prevent label collisions
    const { labels: priceLabels } = preventLabelCollisions(
      ticks,
      (value, step) => formatPrice(value, step),
      step
    );

    return {
      data: transformedData,
      timeLabels,
      priceLabels,
      yDomain: domain,
      tickStep: step,
      range,
      isIntraday,
      dataInterval: effectiveInterval,
      timestampLookup
    };
  }, [data, range, livePrice, effectiveInterval]); // Add effectiveInterval to dependencies
}

// Hook for getting chart data with live price updates
export function useChartData(
  data: PricePoint[],
  range: RangeKey,
  livePrice?: number | null
) {
  const series = usePriceSeries({ data, range, livePrice });

  // Add live price point if available and different from last data point
  const chartData = useMemo(() => {
    if (!livePrice || !series.data.length) {
      return series.data;
    }

    const lastPoint = series.data[series.data.length - 1];
    const lastTimestamp = series.timestampLookup?.get(lastPoint.time) || lastPoint.time;
    const lastDate = new Date(lastTimestamp);
    const today = new Date();
    
    // Check if the last data point is from today
    const isLastPointFromToday = lastDate.toDateString() === today.toDateString();
    
    // Always add live price if it's significantly different, regardless of range
    if (Math.abs(lastPoint.value - livePrice) > 0.001) {
      const livePoint = { 
        time: series.data.length, // Use next ordinal index
        value: livePrice,
        ts: Date.now() // Current timestamp for live data
      };
      
      // If this is a live update for today, log it
      if (isLastPointFromToday) {
        console.log(`Adding live price update for ${range}: $${livePrice} at ${new Date().toLocaleString("en-US", {timeZone: "America/New_York"})}`);
      }
      
      return [
        ...series.data,
        livePoint
      ];
    }

    return series.data;
  }, [series.data, livePrice, range, series.timestampLookup]);

  return {
    ...series,
    data: chartData
  };
}

// Utility function to filter data by market hours for intraday ranges
export function filterMarketHours(data: PricePoint[], range: RangeKey): PricePoint[] {
  const config = getRangeConfig(range);
  if (!config?.isIntraday) {
    return data;
  }

  return data.filter(point => {
    const date = new Date(point.t);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return totalMinutes >= marketOpen && totalMinutes <= marketClose;
  });
}
