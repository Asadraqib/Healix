import React from 'react';

interface HealthScoreGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({
  score,
  size = 80,
  showLabel = true,
}) => {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#10b981'; // Green
  let badgeColor = 'text-emerald-700 bg-emerald-50';
  let statusText = 'Optimal';

  if (score < 60) {
    strokeColor = '#ef4444'; // Red
    badgeColor = 'text-red-700 bg-red-50';
    statusText = 'Critical';
  } else if (score < 80) {
    strokeColor = '#f59e0b'; // Amber
    badgeColor = 'text-amber-700 bg-amber-50';
    statusText = 'Degraded';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-gray-900 tracking-tight">
            {Math.round(score)}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {statusText}
        </span>
      )}
    </div>
  );
};
