import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  Database,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Search,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { RagDocumentChunk, AiAuditLog } from '../../types';

export const AiDiagnosticView: React.FC = () => {
  const { assets, auditLogs, runAiDiagnosticQuery, mode } = useSimulation();

  const [activeSubTab, setActiveSubTab] = useState<'RAG_COPILOT' | 'FORECASTING' | 'AUDIT_TRAIL'>('RAG_COPILOT');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0].id);
  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  // RAG Chat State
  const [queryInput, setQueryInput] = useState<string>('');
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<
    { sender: 'user' | 'assistant'; text: string; sources?: RagDocumentChunk[]; sourceLabels?: string[]; timestamp: string }[]
  >([
    {
      sender: 'assistant',
      text: 'Hello, I am your industrial maintenance diagnosis assistant. Select an asset and enter a telemetry anomaly question, or pick a standard diagnostic prompt below.',
      timestamp: '11:00 AM'
    }
  ]);

  const handleSendQuery = async (customPrompt?: string) => {
    const promptToSend = customPrompt || queryInput;
    if (!promptToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setQueryInput('');
    setIsQuerying(true);

    try {
      const response = await runAiDiagnosticQuery(selectedAssetId, promptToSend);

      const assistantMsg = {
        sender: 'assistant' as const,
        text: response.answer,
        sources: response.sources,
        sourceLabels: response.sourceLabels,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold uppercase tracking-wider">
              {mode === 'LIVE' ? 'AI Service • FastAPI' : 'AI / RAG Service • Local Simulation'}
            </span>
            {mode === 'SIMULATION' && <span className="text-xs font-mono text-gray-500">Vector Collection: asset_docs • 512-dim</span>}
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
            {mode === 'LIVE' ? 'AI Maintenance Diagnosis' : 'Predictive AI & RAG Diagnostic Engine'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'LIVE'
              ? 'Diagnosis uses the selected asset and question through the live AI service.'
              : 'Hybrid system: probabilistic failure forecasting + semantic retrieval over OEM equipment service manuals'}
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('RAG_COPILOT')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'RAG_COPILOT'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>RAG Maintenance Copilot</span>
          </button>

          <button
            onClick={() => setActiveSubTab('FORECASTING')}
            disabled={mode === 'LIVE'}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'FORECASTING'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            <span>Failure Forecasting</span>
          </button>

          <button
            onClick={() => setActiveSubTab('AUDIT_TRAIL')}
            disabled={mode === 'LIVE'}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'AUDIT_TRAIL'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>Audit Trail (Postgres)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: RAG Maintenance Diagnostic Copilot */}
      {activeSubTab === 'RAG_COPILOT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (8 cols): Interactive RAG Chat */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
            
            {/* Chat Header: Machine Selector */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">Target Asset Context:</span>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-gray-900 focus:outline-none focus:border-purple-500"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.machineClass})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                POST /api/ai/diagnose
              </span>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 text-xs ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-xl p-3.5 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-purple-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                    {/* Source Vector Chunks Retrieved from Qdrant */}
                    {((msg.sources?.length ?? 0) > 0 || (msg.sourceLabels?.length ?? 0) > 0) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                          <FileText className="w-3 h-3 text-purple-600" />
                          <span>{mode === 'LIVE' ? 'Sources returned by AI service' : 'Retrieved Evidence Chunks (Qdrant Vector Match)'}</span>
                        </div>

                        {msg.sourceLabels?.map((source) => (
                          <div key={source} className="rounded border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700">
                            {source}
                          </div>
                        ))}

                        {msg.sources?.map((src) => (
                          <div
                            key={src.chunkId}
                            className="bg-white p-2.5 rounded-lg border border-purple-100 text-[11px] shadow-xs"
                          >
                            <div className="flex items-center justify-between text-purple-900 font-bold mb-1">
                              <span className="truncate max-w-[280px]">{src.section}</span>
                              <span className="font-mono bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded text-[10px]">
                                {(src.similarityScore * 100).toFixed(1)}% match
                              </span>
                            </div>
                            <p className="text-gray-600 italic leading-snug line-clamp-3">
                              "{src.text}"
                            </p>
                            <div className="mt-1 text-[9px] text-gray-400 font-mono truncate">
                              Source: {src.sourceDoc}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-[9px] mt-1.5 text-right font-mono ${
                        msg.sender === 'user' ? 'text-purple-200' : 'text-gray-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {isQuerying && (
                <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold p-2 bg-purple-50 rounded-lg animate-pulse w-fit">
                  <Brain className="w-4 h-4 animate-spin" />
                  <span>Searching Qdrant vector index & synthesizing diagnostic procedure...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-gray-400 font-semibold uppercase text-[10px] shrink-0">Try prompt:</span>
              <button
                onClick={() =>
                  handleSendQuery('Explain high vibration anomaly on SINUMERIK 840D spindle and step-by-step fix')
                }
                className="px-2.5 py-1 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-800 rounded-full border border-gray-200 whitespace-nowrap transition-colors"
              >
                Spindle Vibration Spike
              </button>
              <button
                onClick={() =>
                  handleSendQuery('What is the procedure when SINAMICS S120 inverter bridge temperature exceeds 85°C?')
                }
                className="px-2.5 py-1 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-800 rounded-full border border-gray-200 whitespace-nowrap transition-colors"
              >
                S120 Thermal Overheat SOP
              </button>
              <button
                onClick={() =>
                  handleSendQuery('Emergency procedure for main cylinder pressure drop on 500-Ton Hydraulic Cold Press')
                }
                className="px-2.5 py-1 bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-800 rounded-full border border-gray-200 whitespace-nowrap transition-colors"
              >
                Hydraulic Pressure Drop
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask technical question about asset manual, threshold specs, or repair procedure..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                className="flex-1 py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
              />
              <button
                onClick={() => handleSendQuery()}
                disabled={isQuerying || !queryInput.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Right Column (4 cols): Vector Store & Manual Index Info */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm pb-3 border-b border-gray-100">
                <Database className="w-4 h-4 text-purple-600" />
                <span>Qdrant Vector Collections</span>
              </div>

              <div className="mt-3 space-y-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between font-mono font-bold text-gray-800">
                    <span>collection: asset_docs</span>
                    <span className="text-emerald-600">ONLINE</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Indexed OEM manuals, troubleshooting SOPs, schematics, and tolerance tables
                  </p>
                  <div className="mt-2 text-[10px] text-gray-400 font-mono">
                    Chunks: 1,480 • Dimensions: 1536 (text-embedding-3-small)
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="font-semibold text-gray-800 block mb-1">Indexed OEM Manuals:</span>
                  <ul className="space-y-1 text-[11px] text-gray-600 list-disc list-inside">
                    <li>Siemens SINUMERIK 840D sl Diagnostics</li>
                    <li>SINAMICS S120 Inverter Power Unit SOP</li>
                    <li>Bosch Rexroth 500T Hydraulic Press Manual</li>
                    <li>SIMATIC 6-Axis Robot Kinematics Guide</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Recruiter Talking Point Card */}
            <div className="bg-purple-950 text-white rounded-2xl p-5 border border-purple-800 shadow-md text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/80 px-2 py-0.5 rounded">
                Recruiter Talking Point #3
              </span>
              <h3 className="font-bold text-white text-sm mt-2">Enterprise Audit Trail</h3>
              <p className="text-purple-200 mt-1 text-[11px] leading-relaxed">
                "Where is the audit trail?" is the first question enterprise software buyers ask of any AI feature. Every prediction and RAG response is persisted to Postgres (`analysis_results`) with the exact `model_version` and input sensor vectors.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Sub-Tab 2: Failure Forecasting Model Details */}
      {mode === 'LIVE' && activeSubTab !== 'RAG_COPILOT' && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          The live AI service exposes diagnosis only; forecasting and audit-log endpoints are not defined by the current backend contract.
        </div>
      )}

      {mode === 'SIMULATION' && activeSubTab === 'FORECASTING' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-5">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                POST /api/ai/forecast
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">
                Real-Time ML Failure Forecast: {selectedAsset.name}
              </h2>
              <p className="text-xs text-gray-500">
                Gradient boosted decision trees + recurrent sequence encoder evaluating 30-step telemetry windows
              </p>
            </div>

            {/* Probability Gauge & RUL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-xs font-semibold text-gray-500">Predicted Failure Probability (24h)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-3xl font-black font-mono ${
                      selectedAsset.healthScore < 60
                        ? 'text-rose-600'
                        : selectedAsset.healthScore < 80
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {selectedAsset.healthScore < 60 ? '94.2%' : selectedAsset.healthScore < 80 ? '68.5%' : '4.8%'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedAsset.healthScore < 60 ? 'CRITICAL RISK' : 'Nominal band'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-500">Estimated Remaining Useful Life (RUL)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black font-mono text-gray-900">
                    {selectedAsset.healthScore < 60 ? '14.2' : '1,840'}
                  </span>
                  <span className="text-xs text-gray-500">operating hours</span>
                </div>
              </div>
            </div>

            {/* Feature Importances */}
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Sensor Feature Importance Contribution (SHAP values)
              </h3>
              <div className="space-y-2 text-xs">
                {selectedAsset.sensors.map((s, idx) => {
                  const pct = [58, 24, 12, 6][idx] || 10;
                  return (
                    <div key={s.id} className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-700">{s.name}</span>
                        <span className="text-gray-900 font-mono font-bold">{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Model Deployment Spec</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Architecture:</span>
                <span className="font-mono font-bold">FastAPI + ONNX Runtime</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Model Version:</span>
                <span className="font-mono">v2.1-industrial-ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Inference Latency:</span>
                <span className="font-mono text-emerald-600 font-bold">~42ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Training Dataset:</span>
                <span>NASA Turbofan & Siemens IoT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: AI Audit Trail Table */}
      {mode === 'SIMULATION' && activeSubTab === 'AUDIT_TRAIL' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">PostgreSQL `analysis_results` Audit Trail</h2>
              <p className="text-xs text-gray-500">
                Immutable ledger of all automated inference executions and RAG citations
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-white border border-gray-300 px-2 py-1 rounded-md text-gray-700">
              {auditLogs.length} Logged Inferences
            </span>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-100/70 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Audit ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Model Version</th>
                  <th className="py-3 px-4">P(Failure)</th>
                  <th className="py-3 px-4">Recommended Action</th>
                  <th className="py-3 px-4">Auto Ticket</th>
                  <th className="py-3 px-4">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-purple-700">{log.id}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-gray-900">
                      {log.assetName}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">{log.modelVersion}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.failureProbability > 0.7
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {(log.failureProbability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-700 truncate max-w-xs">
                      {log.recommendedAction}
                    </td>
                    <td className="py-3 px-4">
                      {log.triggeredWorkOrderId ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {log.triggeredWorkOrderId}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-sans italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{log.executionTimeMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
