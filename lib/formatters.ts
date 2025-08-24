export function formatTwoDecimals(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return Number(value).toFixed(2);
}

// Time formatting by range
export function formatTime(range: string, timestamp: number): string {
  const date = new Date(timestamp);
  const currentYear = 2025; // Current year is 2025
  const isPastCurrentYear = date.getFullYear() > currentYear;
  const isHistoricalData = date.getFullYear() < currentYear;
  
  switch (range) {
    case "1D":
      // HH:mm format for intraday (market hours only)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    
    case "5D":
      // MMM d HH:mm format for 5-day view (used in tooltips)
      let baseFormat = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }) + ' ' + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      // Add year if date is past current year OR historical data
      if (isPastCurrentYear || isHistoricalData) {
        baseFormat += ` ${date.getFullYear()}`;
      }
      
      return baseFormat;
    
    case "1M":
    case "3M":
      // MMM d format for monthly views
      let monthFormat = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Add year if date is past current year OR historical data
      if (isPastCurrentYear || isHistoricalData) {
        monthFormat += ` ${date.getFullYear()}`;
      }
      
      return monthFormat;
    
    case "6M":
      // MMM d format for 6-month view (show day, not just month)
      let sixMonthFormat = date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      });
      
      // Add year if date is past current year OR historical data
      if (isPastCurrentYear || isHistoricalData) {
        sixMonthFormat += ` ${date.getFullYear()}`;
      }
      
      return sixMonthFormat;
    
    case "YTD":
      // MMM d format for YTD (show day, not just month)
      let ytdFormat = date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      });
      
      // Add year if date is past current year OR historical data
      if (isPastCurrentYear || isHistoricalData) {
        ytdFormat += ` ${date.getFullYear()}`;
      }
      
      return ytdFormat;
    
    case "1Y":
    case "5Y":
    case "MAX":
      // Always show MMM d YYYY for these ranges (historical data)
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    
    default:
      let defaultFormat = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Add year if date is past current year OR historical data
      if (isPastCurrentYear || isHistoricalData) {
        defaultFormat += ` ${date.getFullYear()}`;
      }
      
      return defaultFormat;
  }
}

// Format date only (no time) for 5D X-axis labels
export function formatDateOnly(timestamp: number): string {
  const date = new Date(timestamp);
  const currentYear = 2025;
  const isHistoricalData = date.getFullYear() < currentYear;
  
  let dateFormat = date.toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric'
  });
  
  // Add year if historical data
  if (isHistoricalData) {
    dateFormat += ` ${date.getFullYear()}`;
  }
  
  return dateFormat;
}

// Price formatting with dynamic precision to prevent collisions
export function formatPrice(value: number, step: number): string {
  if (!Number.isFinite(value)) return "–";
  
  // Determine base precision based on value magnitude
  let precision = 2;
  
  if (Math.abs(value) >= 1_000_000) {
    // Millions: show M with at least 2 decimals
    precision = Math.max(2, getPrecisionForStep(step / 1_000_000));
    return (value / 1_000_000).toFixed(precision) + 'M';
  } else if (Math.abs(value) >= 1_000) {
    // Thousands: show k with at least 2 decimals
    precision = Math.max(2, getPrecisionForStep(step / 1_000));
    return (value / 1_000).toFixed(precision) + 'k';
  } else {
    // Regular values: use 2 decimals if < 100, otherwise based on step
    if (Math.abs(value) < 100) {
      precision = 2;
    } else {
      precision = getPrecisionForStep(step);
    }
    return value.toFixed(precision);
  }
}

// Helper function to determine precision based on step size
function getPrecisionForStep(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  if (step >= 0.001) return 3;
  return 4;
}

// Prevent label collisions by increasing precision until all labels are unique
export function preventLabelCollisions(
  values: number[], 
  formatter: (value: number, step: number) => string,
  initialStep: number
): { labels: string[], step: number, precision: number } {
  let step = initialStep;
  let precision = 2;
  let labels: string[];
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    labels = values.map(value => formatter(value, step));
    const uniqueLabels = new Set(labels);
    
    if (uniqueLabels.size === labels.length) {
      break; // No collisions found
    }
    
    // Increase precision and try again
    precision = Math.min(precision + 1, 6);
    step = step / 10;
    attempts++;
  } while (attempts < maxAttempts);
  
  return { labels, step, precision };
}

// Format price for tooltip (always 2 decimals for < $100, otherwise based on step)
export function formatPriceForTooltip(value: number, step: number): string {
  if (!Number.isFinite(value)) return "–";
  
  if (Math.abs(value) < 100) {
    return value.toFixed(2);
  }
  
  const precision = getPrecisionForStep(step);
  return value.toFixed(precision);
}



