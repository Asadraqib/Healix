import React from 'react';
import { X, Cpu, Wrench, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { Asset } from '../../types';
import { HealthScoreGauge } from '../common/HealthScoreGauge';
import { StatusBadge } from '../common/StatusBadge';
import { Sparkline } from '../common/Sparkline';
import { useSimulation } from '../../context/SimulationContext';
import { canAccessTab } from '../../services/accessControl';

interface AssetDetailModalProps {
  asset: Asset | null;
  onClose: () => void;
  onNavigateToAi: (assetId: string) => void;
  onNavigateToSimulation: (assetId: string) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  onNavigateToAi,
  onNavigateToSimulation
}) => {
  const { mode, userRole } = useSimulation();
  const canDiagnose = canAccessTab(userRole, 'ai-rag');
  const canOverride = canAccessTab(userRole, 'simulation');
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase text-cyan-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {asset.machineClass}
                </span>
                <StatusBadge status={asset.status} size="sm" />
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{asset.name}</h2>
              <p className="text-xs text-slate-400">
                {asset.assetType} â€¢ Location: {asset.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <HealthScoreGauge score={asset.healthScore} size={64} showLabel={false} />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          <p className="rounded bg-blue-50 p-3 text-blue-900">{mode === 'SIMULATION' ? 'Temporary simulation telemetry' : asset.telemetrySource === 'CONNECTED_MACHINE' ? 'Connected adapter telemetry' : 'Generated/demo telemetry — no physical equipment connected'} · {asset.connectionState ?? 'Checking connection'} · Last update: {asset.lastSeenAt ? new Date(asset.lastSeenAt).toLocaleString() : 'Not available'}</p>
          {/* Machine Specs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Install Date</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{asset.installDate ?? 'Not reported'}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Running Hours</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {asset.runningHours?.toLocaleString() ?? 'Not reported'} {asset.runningHours === undefined ? '' : 'hrs'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Last Service</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{asset.lastMaintenance ?? 'Not reported'}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Lead Engineer</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{asset.assignedEngineer ?? 'Not reported'}</p>
            </div>
          </div>

          {/* Sensor Channels Grid */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Real-Time Streaming Telemetry Channels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {asset.sensors.map((sensor) => {
                const isOverThreshold = sensor.criticalThreshold !== undefined &&
                  sensor.baseline !== undefined &&
                  (sensor.criticalThreshold > sensor.baseline
                    ? (sensor.rawValue ?? sensor.currentValue) >= sensor.criticalThreshold
                    : (sensor.rawValue ?? sensor.currentValue) <= sensor.criticalThreshold);

                return (
                  <div
                    key={sensor.id}
                    className={`p-4 rounded-xl border ${
                      isOverThreshold
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-900">{sensor.name}</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Type: {sensor.type} â€¢ Nominal: {sensor.baseline ?? 'Not reported'} {sensor.baseline === undefined ? '' : sensor.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-base font-black font-mono ${
                            isOverThreshold ? 'text-rose-600' : 'text-gray-900'
                          }`}
                        >
                          {sensor.currentValue} {sensor.unit}
                        </span>
                        <p className="text-[10px] text-gray-400 font-mono">
                          Limit: {sensor.criticalThreshold ?? 'Not reported'} {sensor.criticalThreshold === undefined ? '' : sensor.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <Sparkline
                        data={sensor.history}
                        threshold={sensor.criticalThreshold}
                        unit={sensor.unit}
                        width={280}
                        height={40}
                        color={isOverThreshold ? '#ef4444' : '#2563eb'}
                      />
                      <span className="text-[10px] text-gray-400 font-mono">30-point hist</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Maintenance & Audit Procedures */}
          {(canDiagnose || canOverride) && <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-blue-950 text-xs">{mode === 'LIVE' ? 'Live AI Diagnosis Available' : 'Autonomous Diagnosis Available'}</span>
              <p className="text-[11px] text-blue-800 mt-0.5">
                {mode === 'LIVE'
                  ? 'Send a question and this asset ID to the live AI diagnosis service.'
                  : 'Query technical service manual chunks from the local vector store and run predictive failure models.'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canDiagnose && <button
                onClick={() => {
                  onClose();
                  onNavigateToAi(asset.id);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>{mode === 'LIVE' ? 'Launch AI Diagnosis' : 'Launch RAG Diagnosis'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>}
              {canOverride && <button
                onClick={() => {
                  onClose();
                  onNavigateToSimulation(asset.id);
                }}
                className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-lg border border-gray-300 transition-colors"
              >
                Inject Override
              </button>}
            </div>
          </div>}

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 font-mono">Asset UUID: {asset.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
