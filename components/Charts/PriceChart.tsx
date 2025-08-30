"use client";

import React, { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { usePriceSeries, type PricePoint, type RangeKey } from '../../hooks/usePriceSeries';
import { formatTime, formatPriceForTooltip, formatDateOnly } from '../../lib/formatters';
import { getRangeConfig, getOptimalTickCount, getDataInterval } from '../../lib/ranges';
import RoiOverlay from './RoiOverlay';
import '../../styles/chart-roi.css';

interface PriceChartProps {
  data: PricePoint[];
  range: RangeKey;
  livePrice?: number | null;
  height?: number;
  className?: string;
  onStats?: (stats: { oldPrice: number | null; newPrice: number | null; abs: number | null; pct: number | null }) => void;
  enableROI?: boolean;
}

export default function PriceChart({
  data,
  range,
  livePrice,
  height = 360,
  className = "",
  onStats,
  enableROI = false
}: PriceChartProps) {
  // Get the data interval for this range
  const dataInterval = useMemo(() => getDataInterval(range), [range]);
  
  // Transform data using our hook with the correct interval
  const series = usePriceSeries({ data, range, livePrice, dataInterval });
  
  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    return series.data.map((point, index) => ({
      ...point,
      timeLabel: series.timeLabels[index] || '',
      originalIndex: index
    }));
  }, [series.data, series.timeLabels]);

  // Memoize Y-axis configuration
  const yAxisConfig = useMemo(() => {
    const { yDomain, tickStep } = series;
    
    // Generate Y-axis ticks
    const ticks = series.priceLabels.map(label => parseFloat(label));
    
    return {
      domain: yDomain,
      ticks,
      tickFormatter: (value: number) => formatPriceForTooltip(value, tickStep)
    };
  }, [series.yDomain, series.priceLabels, series.tickStep]);

  // Memoize X-axis configuration with interval awareness
  const xAxisConfig = useMemo(() => {
    const config = getRangeConfig(range);
    const optimalTickCount = getOptimalTickCount(range, data.length);
    
    // Reduce tick count if data is sparse to prevent overlap
    const actualTickCount = Math.min(optimalTickCount, Math.ceil(data.length / 2));
    
    // For 5D range, use ordinal indices for seamless X-axis positioning
    if (range === "5D") {
      const dataLength = series.data.length;
      
      // Find day boundaries by looking for timestamp changes that cross midnight
      const dayBoundaryIndices: number[] = [];
      let lastDate = '';
      
      series.data.forEach((point, index) => {
        if (series.timestampLookup) {
          const timestamp = series.timestampLookup.get(point.time);
          if (timestamp) {
            const date = new Date(timestamp);
            const nyDate = date.toLocaleDateString("en-US", {timeZone: "America/New_York"});
            
            if (nyDate !== lastDate) {
              dayBoundaryIndices.push(index);
              lastDate = nyDate;
            }
          }
        }
      });
      
      // Ensure we have exactly 5 ticks (one per day) and they're evenly spaced
      let tickIndices: number[];
      if (dayBoundaryIndices.length >= 5) {
        // Use the first 5 day boundaries
        tickIndices = dayBoundaryIndices.slice(0, 5);
      } else {
        // Fallback: create 5 evenly spaced ticks
        tickIndices = [];
        for (let i = 0; i < 5; i++) {
          const index = Math.floor((i * (dataLength - 1)) / 4);
          tickIndices.push(index);
        }
      }
      
      return {
        tickCount: 5,
        ticks: tickIndices,
        tickFormatter: (value: number) => {
          // For 5D, value is the ordinal index, use timestamp lookup for formatting
          if (series.timestampLookup) {
            const timestamp = series.timestampLookup.get(value);
            if (timestamp) {
              return formatDateOnly(timestamp);
            }
          }
          // Fallback to timeLabel if available
          const point = chartData.find(p => p.time === value);
          return point?.timeLabel || '';
        },
        domain: [0, Math.max(0, dataLength - 1)],
        type: 'number' as const,
        scale: 'linear' as const
      };
    }
    
    // For other ranges, use actual data bounds to ensure today's data is visible
    return {
      tickCount: actualTickCount,
      tickFormatter: (value: number) => {
        const point = chartData.find(p => p.time === value);
        return point?.timeLabel || '';
      },
      domain: ['dataMin', 'dataMax'], // Use actual data bounds, not hardcoded
      type: 'number' as const,
      scale: 'time' as const
    };
  }, [range, data.length, chartData, series.data.length, series.timestampLookup]);

  // Calculate stats for parent component
  React.useEffect(() => {
    if (onStats && chartData.length >= 2) {
      const first = chartData.find(d => typeof d.value === 'number');
      const last = [...chartData].reverse().find(d => typeof d.value === 'number');
      const firstPrice = first?.value;
      const lastPrice = last?.value;
      
      if (typeof firstPrice === 'number' && typeof lastPrice === 'number') {
        const abs = lastPrice - firstPrice;
        const pct = firstPrice !== 0 ? (abs / firstPrice) * 100 : null;
        
        onStats({
          oldPrice: firstPrice,
          newPrice: lastPrice,
          abs,
          pct
        });
      }
    }
  }, [chartData, onStats]);

  // Compute dynamic line color based on overall return for the period
  const lineColor = React.useMemo(() => {
    if (!chartData || chartData.length < 2) return '#10B981';
    const first = chartData.find(d => typeof d.value === 'number' && isFinite(d.value));
    const last = [...chartData].reverse().find(d => typeof d.value === 'number' && isFinite(d.value));
    const firstValue = first?.value;
    const lastValue = last?.value;
    if (firstValue == null || lastValue == null) return '#10B981';
    if (firstValue === 0) return '#10B981';
    return lastValue < firstValue ? '#EF4444' : '#10B981';
  }, [chartData]);

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-sm text-zinc-400">No data available</div>
      </div>
    );
  }

  // Handle single data point
  if (data.length === 1) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-sm text-zinc-400">Insufficient data for chart</div>
      </div>
    );
  }

  // ROI wiring values
  const xMode = range === '5D' ? 'ordinal' : 'timestamp';
  const xDomain: [number, number] = xMode === 'ordinal'
    ? [0, Math.max(0, series.data.length - 1)]
    : ['dataMin' as any, 'dataMax' as any];
  // For timestamp mode, get actual numeric domain from data
  let numericXDomain: [number, number] = [0, 1];
  if (xMode === 'timestamp') {
    const times = series.data.map(d => d.time);
    numericXDomain = [Math.min(...times), Math.max(...times)];
  }

  // Get actual container dimensions for plotBox
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [plotBox, setPlotBox] = React.useState({
    width: 0, height: 0,
    paddingLeft: 20, paddingRight: 30, paddingTop: 20, paddingBottom: 20
  });
  const [suppressTooltip, setSuppressTooltip] = React.useState(false);

  React.useEffect(() => {
    if (containerRef.current) {
      const updatePlotBox = () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          setPlotBox(prev => ({
            ...prev,
            width: rect.width,
            height: rect.height
          }));
        }
      };
      
      // Initial update
      updatePlotBox();
      
      // Set up resize observer
      const resizeObserver = new ResizeObserver(updatePlotBox);
      resizeObserver.observe(containerRef.current);
      
      // Also update on next frame to ensure dimensions are set
      const timeoutId = setTimeout(updatePlotBox, 100);
      
      return () => {
        resizeObserver.disconnect();
        clearTimeout(timeoutId);
      };
    }
  }, []);

  return (
    <div ref={containerRef} className={`w-full select-none ${className}`} style={{ position:'relative', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#374151" 
            strokeOpacity={0.3}
            vertical={false}
          />
          
          <XAxis
            dataKey="time"
            type={xAxisConfig.type}
            scale={xAxisConfig.scale}
            domain={xAxisConfig.domain}
            tickCount={xAxisConfig.tickCount}
            tickFormatter={xAxisConfig.tickFormatter}
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            allowDataOverflow={false}
            includeHidden={false}
          />
          
          <YAxis
            domain={yAxisConfig.domain}
            ticks={yAxisConfig.ticks}
            tickFormatter={yAxisConfig.tickFormatter}
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          
          {!suppressTooltip && (
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  let time: string;
                  
                  if (range === "5D" && series.timestampLookup) {
                    const timestamp = series.timestampLookup.get(data.time);
                    if (timestamp) {
                      time = formatTime(range, timestamp);
                    } else {
                      time = data.timeLabel || '';
                    }
                  } else {
                    time = formatTime(range, data.time);
                  }
                  
                  return (
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-lg">
                      <div className="text-sm text-zinc-300">{time}</div>
                      <div className="text-lg font-semibold text-white">
                        ${Number(data.value).toFixed(2)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: '#4B5563', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#10B981" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>

      {enableROI && plotBox.width > 0 && plotBox.height > 0 && series.data.length > 0 && (
        <RoiOverlay
          series={series.data.map((d, index) => ({ 
            t: xMode === 'timestamp' ? d.time : undefined, 
            x: xMode === 'ordinal' ? index : undefined, 
            ts: series.timestampLookup?.get(d.time) || d.time, 
            c: d.value 
          }))}
          xMode={xMode}
          xDomain={xMode === 'ordinal' ? [0, Math.max(0, series.data.length - 1)] : numericXDomain}
          yDomain={series.yDomain}
          plotBox={plotBox}
          rangeKey={range}
          tooltipClassName="bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow roi-pill"
          onSuppress={(s:boolean) => setSuppressTooltip(s)}
        />
      )}
    </div>
  );
}
