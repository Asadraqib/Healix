import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  icon,
  accentColor = 'border-blue-500'
}) => {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-xs border border-gray-200/90 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 border-l-4 ${accentColor}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</h3>
          {(subtitle || change) && (
            <div className="flex items-center gap-1.5 mt-2">
              {change && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {change}
                </span>
              )}
              {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
            </div>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border border-gray-100">{icon}</div>
      </div>
    </div>
  );
};
