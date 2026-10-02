import React, { FormEvent, useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Package,
  Cpu,
  Zap,
  ArrowRight,
  Filter,
  Search,
  FileText,
  RotateCcw,
  Plus,
  X
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { StatusBadge } from '../common/StatusBadge';
import { WorkOrder, WorkOrderSeverity, WorkOrderStatus } from '../../types';
import { canPerform } from '../../services/accessControl';

interface WorkOrdersViewProps {
  onNavigateTab: (tab: string) => void;
  targetWorkOrderId?: string | null;
}

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({ onNavigateTab, targetWorkOrderId }) => {
  const { workOrders, updateWorkOrderStatus, parts, resetAssetToBaseline, assets, mode, createWorkOrder, userRole } = useSimulation();
  const canManageWorkOrders = canPerform(userRole, 'updateWorkOrder');

  const [searchQuery, setSearchQuery] = useState(targetWorkOrderId || '');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkOrderStatus>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(
    targetWorkOrderId ? workOrders.find((w) => w.id === targetWorkOrderId) || null : null
  );
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [newAssetId, setNewAssetId] = useState(assets[0]?.id ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<WorkOrderSeverity>('MEDIUM');
  const [newOwner, setNewOwner] = useState('');
  const [newDue, setNewDue] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.assignedTechnician ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleResolveOrder = (order: WorkOrder) => {
    if (mode === 'LIVE') return;
    updateWorkOrderStatus(order.id, 'RESOLVED');
    resetAssetToBaseline(order.assetId);
  };

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      await createWorkOrder({
        assetId: newAssetId,
        title: newTitle,
        priority: newPriority,
        ...(newOwner ? { owner: newOwner } : {}),
        ...(newDue ? { due: newDue } : {})
      });
      setShowCreateOrder(false);
      setNewTitle('');
      setNewOwner('');
      setNewDue('');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create work order.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase tracking-wider">
              Maintenance Service • POST /api/work-orders
            </span>
            <span className="text-xs font-mono text-gray-500">Autonomous Closed-Loop Dispatch</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
            Self-Healing Work Orders & Remediation
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'LIVE'
              ? 'Work orders are loaded from the maintenance service. The current API does not expose status updates.'
              : 'Work orders created automatically upon AI failure forecasting. Resolving a ticket triggers an actuator reset and recalibrates asset health.'}
          </p>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search WO#, asset, tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white w-full sm:w-56 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs overflow-x-auto">
            {(['ALL', 'AUTO_GENERATED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-all ${
                  statusFilter === filter
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {filter === 'ALL'
                  ? 'All'
                  : filter === 'AUTO_GENERATED'
                  ? 'AI Generated'
                  : filter === 'SCHEDULED'
                  ? 'Scheduled'
                  : filter === 'IN_PROGRESS'
                  ? 'In Progress'
                  : 'Resolved'}
              </button>
            ))}
          </div>

          {canPerform(userRole, 'createWorkOrder') && <button
            onClick={() => setShowCreateOrder(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-3.5 w-3.5" /> New Work Order
          </button>}
        </div>
      </div>

      {/* Main Content: Orders List + Selected Order Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Work Orders List */}
        <div className="lg:col-span-7 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 text-gray-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-gray-800">No matching work orders found</p>
              <p className="text-xs text-gray-400 mt-1">Try resetting the status filter or search query</p>
            </div>
          ) : (
            filteredOrders.map((wo) => {
              const isSelected = selectedOrder?.id === wo.id;

              return (
                <div
                  key={wo.id}
                  onClick={() => setSelectedOrder(wo)}
                  className={`bg-white rounded-xl p-4 border transition-all cursor-pointer hover:shadow-sm ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-200/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {wo.id}
                        </span>
                        <StatusBadge status={wo.status} size="sm" />
                        <StatusBadge status={wo.severity} size="sm" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mt-1.5">{wo.title}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Cpu className="w-3.5 h-3.5 text-gray-400" />
                        <span>{wo.assetName}</span>
                      </p>
                    </div>

                    <div className="text-right text-[11px] text-gray-400 font-mono shrink-0">
                      {wo.createdAt ? new Date(wo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time not reported'}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{wo.description ?? 'Description not provided by service.'}</p>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                        <span>{wo.assignedTechnician}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[140px]">{wo.partRequired ?? 'Part not reported'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {mode === 'LIVE' || !canManageWorkOrders ? (
                        <span className="text-[10px] text-slate-400">Updates unavailable</span>
                      ) : wo.status !== 'RESOLVED' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveOrder(wo);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resolve Fix</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Fixed & Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column (5 cols): Selected Work Order Detail Inspector */}
        <div className="lg:col-span-5">
          {selectedOrder ? (
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-4 sticky top-20">
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">
                      {selectedOrder.id}
                    </span>
                    <StatusBadge status={selectedOrder.status} size="sm" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 mt-2">{selectedOrder.title}</h2>
                  <p className="text-xs text-gray-500">{selectedOrder.assetName}</p>
                </div>
              </div>

              {/* AI Diagnostic Reasoning Box */}
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-indigo-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Autonomous Root Cause Diagnosis</span>
                  </span>
                  <span className="font-mono bg-indigo-200/60 px-1.5 py-0.2 rounded text-[10px]">
                    {selectedOrder.aiConfidence === undefined ? 'Confidence not reported' : `${(selectedOrder.aiConfidence * 100).toFixed(0)}% Confidence`}
                  </span>
                </div>
                <p className="text-indigo-900/90 leading-relaxed">{selectedOrder.aiRootCause ?? 'Diagnosis not provided by the service.'}</p>
              </div>

              {/* Ticket Metadata */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Asset Location:</span>
                  <span className="font-semibold text-gray-800">{assets.find((asset) => asset.id === selectedOrder.assetId)?.location ?? 'Not reported'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Assigned Technician:</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.assignedTechnician ?? 'Not reported'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Required Spare Part:</span>
                  <span className="font-semibold text-gray-800">{selectedOrder.partRequired ?? 'Not reported'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Inventory Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{mode === 'SIMULATION' ? 'Reserved & Staged at Bay' : 'Reservation status not reported'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-mono text-gray-800">
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'Not reported'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Lifecycle */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {mode === 'LIVE' ? (
                  <p className="rounded bg-slate-50 p-3 text-center text-xs text-slate-600">
                    The live maintenance contract does not expose work-order status updates.
                  </p>
                ) : !canManageWorkOrders ? (
                  <p className="rounded bg-slate-50 p-3 text-center text-xs text-slate-600">
                    Your account role has read-only work-order access.
                  </p>
                ) : selectedOrder.status !== 'RESOLVED' ? (
                  <>
                    <button
                      onClick={() => handleResolveOrder(selectedOrder)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Repair & Run Actuator Test</span>
                    </button>

                    <button
                      onClick={() => updateWorkOrderStatus(selectedOrder.id, 'IN_PROGRESS')}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl transition-colors"
                    >
                      Mark In Progress (Technician En Route)
                    </button>
                  </>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <span className="font-bold">Remediation Verified & Closed</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Asset calibrated back to nominal baseline. Audit trail logged.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => onNavigateTab('ai-rag')}
                  className="w-full py-2 text-center text-xs text-blue-600 hover:underline font-semibold flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inspect Service Manual Procedures (RAG)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200 text-gray-400 text-xs">
              Select a work order on the left to inspect AI diagnosis, spare parts, and remediation procedures.
            </div>
          )}
        </div>

      </div>

      {showCreateOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isCreating) setShowCreateOrder(false); }}>
          <form onSubmit={(event) => void handleCreateOrder(event)} className="w-full max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold">Create work order</h2>
              <button type="button" disabled={isCreating} onClick={() => setShowCreateOrder(false)} aria-label="Close create work order dialog" className="p-1 text-slate-500 hover:text-slate-900"><X className="h-4 w-4" /></button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Asset
              <select required value={newAssetId} onChange={(event) => setNewAssetId(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal">
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Title
              <input required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal" />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-xs font-semibold text-slate-700">
                Priority
                <select value={newPriority} onChange={(event) => setNewPriority(event.target.value as WorkOrderSeverity)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Owner
                <input value={newOwner} onChange={(event) => setNewOwner(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Due
                <input value={newDue} onChange={(event) => setNewDue(event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
            </div>
            {createError && <p role="alert" className="text-xs text-rose-700">{createError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" disabled={isCreating} onClick={() => setShowCreateOrder(false)} className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={isCreating || assets.length === 0} className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isCreating ? 'Creating...' : 'Create Work Order'}</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
