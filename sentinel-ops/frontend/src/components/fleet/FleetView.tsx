import React, { useEffect, useState } from 'react';
import { Search, MapPin, Sliders, ArrowUpRight } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { StatusBadge } from '../common/StatusBadge';
import { Sparkline } from '../common/Sparkline';
import { AssetDetailModal } from './AssetDetailModal';
import { Asset } from '../../types';
import { canAccessTab } from '../../services/accessControl';

interface FleetViewProps {
  onNavigateTab: (tab: string) => void;
  selectedAssetId?: string | null;
  onClearSelection?: () => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  onNavigateTab,
  selectedAssetId,
  onClearSelection,
}) => {
  const { assets, userRole, mode } = useSimulation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'DEGRADED' | 'DOWN'>('ALL');
  const [modalAsset, setModalAsset] = useState<Asset | null>(
    selectedAssetId ? assets.find((a) => a.id === selectedAssetId) || null : null,
  );

  useEffect(() => {
    if (selectedAssetId) setModalAsset(assets.find((a) => a.id === selectedAssetId) ?? null);
  }, [selectedAssetId]);
  useEffect(() => {
    setModalAsset((previous) =>
      previous ? (assets.find((a) => a.id === previous.id) ?? null) : null,
    );
  }, [assets]);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.machineClass.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Filters */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Machinery & Assets</h1>
          <p className="text-xs text-slate-500 mt-1">
            Condition status and streaming sensor telemetry for Plant 04 equipment
          </p>
        </div>

        {/* Search & Status Pill Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 w-full sm:w-48 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
            {(['ALL', 'HEALTHY', 'DEGRADED', 'DOWN'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-0.5 rounded font-medium text-xs transition-all ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL'
                  ? 'All'
                  : filter === 'DOWN'
                    ? 'Critical'
                    : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.map((asset) => {
          const primarySensor = asset.sensors[0];
          const isOver =
            primarySensor.criticalThreshold !== undefined &&
            primarySensor.baseline !== undefined &&
            (primarySensor.criticalThreshold > primarySensor.baseline
              ? primarySensor.currentValue >= primarySensor.criticalThreshold
              : primarySensor.currentValue <= primarySensor.criticalThreshold);

          return (
            <div
              key={asset.id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{asset.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{asset.location}</span>
                    </div>
                  </div>
                  <StatusBadge status={asset.status} size="sm" />
                </div>

                {/* Health progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Health</span>
                    <span className="font-mono font-bold text-slate-800">{asset.healthScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        asset.healthScore < 60
                          ? 'bg-rose-500'
                          : asset.healthScore < 80
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${asset.healthScore}%` }}
                    />
                  </div>
                </div>

                {/* Primary Sensor Reading */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate">
                      {primarySensor.name}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isOver ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {primarySensor.currentValue} {primarySensor.unit}
                    </span>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                    <Sparkline
                      data={primarySensor.history}
                      threshold={primarySensor.criticalThreshold}
                      unit={primarySensor.unit}
                      width={180}
                      height={28}
                      color="#2563eb"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      Limit {primarySensor.criticalThreshold ?? 'Not reported'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setModalAsset(asset)}
                  className="flex-1 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                >
                  <span>Details</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>

                {mode === 'SIMULATION' && canAccessTab(userRole, 'simulation') && (
                  <button
                    onClick={() => onNavigateTab('simulation')}
                    className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 border border-blue-200"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Simulate</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailModal
        asset={modalAsset}
        onClose={() => {
          setModalAsset(null);
          onClearSelection?.();
        }}
        onNavigateToAi={() => onNavigateTab('ai-rag')}
        onNavigateToSimulation={() => onNavigateTab('simulation')}
      />
    </div>
  );
};
