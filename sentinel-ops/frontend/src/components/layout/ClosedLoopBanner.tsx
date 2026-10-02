import React from 'react';
import { Zap, ArrowRight, X } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface ClosedLoopBannerProps {
  onViewWorkOrder?: (workOrderId: string) => void;
}

export const ClosedLoopBanner: React.FC<ClosedLoopBannerProps> = ({ onViewWorkOrder }) => {
  const { recentSelfHealingEvent, dismissSelfHealingEvent } = useSimulation();

  if (!recentSelfHealingEvent) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 text-blue-900 px-4 py-2 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            <strong>Self-Healing Loop Triggered:</strong> {recentSelfHealingEvent.assetName} (
            {recentSelfHealingEvent.triggerSensor} at {recentSelfHealingEvent.triggerValue} {recentSelfHealingEvent.unit}) &rarr; Auto-created{' '}
            <strong>{recentSelfHealingEvent.generatedWorkOrderId}</strong>. Part {recentSelfHealingEvent.allocatedPartName} reserved.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onViewWorkOrder && onViewWorkOrder(recentSelfHealingEvent.generatedWorkOrderId)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
          >
            <span>View Ticket</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={dismissSelfHealingEvent}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
