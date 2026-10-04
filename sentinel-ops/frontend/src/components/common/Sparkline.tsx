import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  threshold?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#2563eb',
  threshold,
  width = 180,
  height = 42,
  unit = '',
}) => {
  if (!data || data.length === 0) {
    return <div className="text-xs text-gray-400">No telemetry data</div>;
  }

  const min = Math.min(...data, threshold !== undefined ? threshold * 0.8 : Infinity);
  const max = Math.max(...data, threshold !== undefined ? threshold * 1.1 : -Infinity);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1 || 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Calculate threshold Y
  let thresholdY: number | null = null;
  if (threshold !== undefined) {
    thresholdY = height - ((threshold - min) / range) * (height - 8) - 4;
  }

  const latestVal = data[data.length - 1];
  const isOverThreshold = threshold !== undefined && latestVal >= threshold;
  const strokeColor = isOverThreshold ? '#ef4444' : color;

  return (
    <div className="relative inline-block">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Threshold dashed line */}
        {thresholdY !== null && thresholdY >= 0 && thresholdY <= height && (
          <line
            x1="0"
            y1={thresholdY}
            x2={width}
            y2={thresholdY}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.6"
          />
        )}

        {/* Area fill */}
        <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />

        {/* Line stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest point dot */}
        {data.length > 0 && (
          <circle
            cx={width}
            cy={height - ((latestVal - min) / range) * (height - 8) - 4}
            r="3.5"
            fill={strokeColor}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        )}
      </svg>
      {threshold && (
        <span className="sr-only">
          Threshold: {threshold} {unit}
        </span>
      )}
    </div>
  );
};
