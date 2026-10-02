import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Gauge
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { Sparkline } from '../common/Sparkline';
import { canPerform } from '../../services/accessControl';

interface SimulationViewProps {
  onNavigateTab: (tab: string) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ onNavigateTab }) => {
  const {
    assets,
    applyOverride,
    resetAssetToBaseline,
    resetFleet,
    activeOverride,
    isSimulating,
    toggleSimulation,
    triggerFailurePreset,
    mode,
    userRole
  } = useSimulation();

  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0].id);
  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const [selectedSensorId, setSelectedSensorId] = useState<string>(selectedAsset.sensors[0].id);
  const selectedSensor =
    selectedAsset.sensors.find((s) => s.id === selectedSensorId) || selectedAsset.sensors[0];

  const [overrideValue, setOverrideValue] = useState<number>(selectedSensor.currentValue);

  const handleSensorSelect = (sensorId: string) => {
    setSelectedSensorId(sensorId);
    const sensor = selectedAsset.sensors.find((s) => s.id === sensorId);
    if (sensor) {
      setOverrideValue(sensor.currentValue);
    }
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = assets.find((a) => a.id === assetId);
    if (asset && asset.sensors.length > 0) {
      setSelectedSensorId(asset.sensors[0].id);
      setOverrideValue(asset.sensors[0].currentValue);
    }
  };

  const handlePushReading = () => {
    applyOverride(
      selectedAsset.id,
      selectedSensor.id,
      Number(overrideValue),
      30,
      `Manual test override on ${selectedSensor.name}`
    );
  };

  const minSlider = 0;
  const maxSlider = Math.max(
    (selectedSensor.baseline ?? selectedSensor.currentValue) * 2.2,
    (selectedSensor.criticalThreshold ?? selectedSensor.currentValue) * 1.4,
    selectedSensor.currentValue * 1.3
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {mode === 'LIVE' ? 'Live Telemetry & Manual Override' : 'Live Telemetry Simulation & Anomaly Injection'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'LIVE'
              ? 'Streaming readings from the asset service. The live override endpoint currently accepts temperature values.'
              : 'Machines drift with natural Gaussian noise. Adjust sliders to push sensor values beyond threshold and observe the self-healing reaction.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPerform(userRole, 'reset') && <button
            onClick={resetFleet}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Fleet</span>
          </button>}

          {mode === 'SIMULATION' && <button
            onClick={toggleSimulation}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              isSimulating
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSimulating ? 'Pause Stream' : 'Resume Stream'}
          </button>}
        </div>
      </div>

      {/* 4-Step Self-Healing Pipeline Timeline */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Step 1</span>
            <div className="font-semibold text-slate-800 mt-0.5">Telemetry Ingestion</div>
            <p className="text-[11px] text-slate-500 mt-0.5">{mode === 'LIVE' ? 'Asset service telemetry stream' : 'Ticking every 2000ms'}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Step 2</span>
            <div className="font-semibold text-slate-800 mt-0.5">Health Score Compute</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Threshold: &lt; 60 pts</p>
          </div>

          <div
            className={`p-2.5 rounded-lg border transition-colors ${
              selectedAsset.healthScore < 60
                ? 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                : 'bg-slate-50 border-slate-100 text-slate-800'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Step 3</span>
            <div className="font-semibold mt-0.5">{mode === 'LIVE' ? 'AI Diagnosis' : 'AI Failure Forecast'}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">{mode === 'LIVE' ? 'POST /api/ai/diagnose' : 'Local simulation model'}</p>
          </div>

          <div
            className={`p-2.5 rounded-lg border transition-colors ${
              selectedAsset.healthScore < 60
                ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                : 'bg-slate-50 border-slate-100 text-slate-800'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Step 4</span>
            <div className="font-semibold mt-0.5">{mode === 'LIVE' ? 'Work Orders' : 'Auto Work Order'}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">{mode === 'LIVE' ? 'GET /api/work-orders' : 'Closed loop dispatch'}</p>
          </div>
        </div>
      </div>

      {/* Main Simulation Workspace: Clean Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Machine Selector & Live Telemetry Channels */}
        <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          
          {/* Machine Selection Tabs */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Select Industrial Asset
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAssetSelect(a.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedAssetId === a.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {a.name.split(' ')[0]} {a.name.split(' ')[1] || ''}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Info Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{selectedAsset.name}</h2>
              <span className="text-slate-500">{selectedAsset.location}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800">
                Health Score: {selectedAsset.healthScore}%
              </span>
              <span className="block text-[11px] text-slate-400">
                Status: {selectedAsset.status}
              </span>
            </div>
          </div>

          {/* Sensors List */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Sensor Channels (Click to select for override)
            </span>

            {selectedAsset.sensors.map((sensor) => {
              const isSelected = sensor.id === selectedSensorId;
              const isOver = sensor.criticalThreshold !== undefined &&
                sensor.baseline !== undefined &&
                (sensor.criticalThreshold > sensor.baseline
                  ? sensor.currentValue >= sensor.criticalThreshold
                  : sensor.currentValue <= sensor.criticalThreshold);

              return (
                <div
                  key={sensor.id}
                  onClick={() => handleSensorSelect(sensor.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-400 ring-1 ring-blue-300'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{sensor.name}</span>
                      <span className="text-slate-400 text-[11px] block">
                        Nominal: {sensor.baseline ?? 'Not reported'} {sensor.baseline === undefined ? '' : sensor.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isOver ? 'text-rose-600 font-black' : 'text-slate-900'
                        }`}
                      >
                        {sensor.currentValue} {sensor.unit}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Limit: {sensor.criticalThreshold ?? 'Not reported'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Sparkline
                      data={sensor.history}
                      threshold={sensor.criticalThreshold}
                      unit={sensor.unit}
                      width={220}
                      height={28}
                      color="#2563eb"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">history (30s)</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column (5 cols): Clean Manual Override Console */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">
                Manual Override Console
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedSensor.name}</h3>
              <p className="text-xs text-slate-500">
                Pushing an anomaly forces the sensor past threshold for 30s.
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600">Injection Value:</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {overrideValue} {selectedSensor.unit}
                </span>
              </div>

              <input
                type="range"
                min={minSlider}
                max={maxSlider}
                step={selectedSensor.unit === 'mm' ? 0.005 : selectedSensor.unit === 'RPM' ? 50 : 0.5}
                value={overrideValue}
                onChange={(e) => setOverrideValue(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0</span>
                <span className="text-rose-500 font-semibold">
                  Danger &gt; {selectedSensor.criticalThreshold ?? 'Not reported'}
                </span>
                <span>{maxSlider.toFixed(0)}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handlePushReading}
              disabled={mode === 'LIVE' && selectedSensor.type.toLowerCase() !== 'temperature'}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md shadow-xs transition-colors"
            >
              {mode === 'LIVE' && selectedSensor.type.toLowerCase() !== 'temperature' ? 'Live override supports temperature only' : 'Push Value to Machine'}
            </button>

            {activeOverride && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Override active: {activeOverride.description}</span>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Quick Test Presets
            </span>

            <button
              onClick={() => triggerFailurePreset('CNC_SPINDLE')}
              disabled={mode === 'LIVE'}
              className="w-full p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-slate-800">Spindle Bearing Flaking</span>
                <p className="text-[10px] text-slate-500">CNC Vibration &gt; 8.4 mm/s</p>
              </div>
              <Zap className="w-3.5 h-3.5 text-blue-600" />
            </button>

            <button
              onClick={() => triggerFailurePreset('INVERTER_MELTDOWN')}
              disabled={mode === 'LIVE'}
              className="w-full p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-slate-800">Inverter Thermal Overheat</span>
                <p className="text-[10px] text-slate-500">S120 Temp &gt; 94°C</p>
              </div>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
            </button>

            <button
              onClick={() => triggerFailurePreset('HYDRAULIC_BURST')}
              disabled={mode === 'LIVE'}
              className="w-full p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-medium text-slate-800">Hydraulic Pressure Spike</span>
                <p className="text-[10px] text-slate-500">Cold Press &gt; 425 Bar</p>
              </div>
              <Gauge className="w-3.5 h-3.5 text-cyan-600" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
