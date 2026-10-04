import React from 'react';
import { AssetStatus, WorkOrderSeverity, WorkOrderStatus } from '../../types';

interface StatusBadgeProps {
  status: AssetStatus | WorkOrderStatus | WorkOrderSeverity | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-gray-100 text-gray-800 border-gray-200';
  let dotColor = 'bg-gray-400';
  let label = status;

  switch (status) {
    case 'HEALTHY':
    case 'RESOLVED':
    case 'OPTIMAL':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
      label = status === 'RESOLVED' ? 'Resolved' : 'Healthy';
      break;

    case 'DEGRADED':
    case 'IN_PROGRESS':
    case 'MEDIUM':
    case 'LOW_STOCK':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      dotColor = 'bg-amber-500';
      label =
        status === 'IN_PROGRESS' ? 'In Progress' : status === 'DEGRADED' ? 'Degraded' : status;
      break;

    case 'DOWN':
    case 'CRITICAL':
    case 'CRITICAL_SHORTAGE':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      dotColor = 'bg-rose-500';
      label = status === 'DOWN' ? 'Critical Down' : status;
      break;

    case 'AUTO_GENERATED':
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dotColor = 'bg-indigo-500';
      label = 'AI Auto-Generated';
      break;

    case 'HIGH':
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
      dotColor = 'bg-orange-500';
      label = 'High Priority';
      break;

    case 'ASSIGNED':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-500';
      label = 'Assigned';
      break;

    default:
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses} ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
