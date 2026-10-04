import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Plus, CheckCircle2, Truck, Search, ShoppingCart, RefreshCw } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { StatusBadge } from '../common/StatusBadge';
import { InventoryPart } from '../../types';
import { canPerform } from '../../services/accessControl';

interface InventoryViewProps {
  onNavigateTab: (tab: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigateTab }) => {
  const { parts, reorderInventoryPart, adjustInventoryPart, loadPartMovements, stockMovements, supplierOrders, receiveSupplierOrder, workOrders, mode, userRole } = useSimulation();

  const [error, setError] = useState('');
  const [delta, setDelta] = useState(1);
  const [workOrderId, setWorkOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<InventoryPart | null>(null);
  const [reorderAmount, setReorderAmount] = useState<number>(10);
  const [showReorderModal, setShowReorderModal] = useState<boolean>(false);

  useEffect(() => { setSelectedPart(null); setShowReorderModal(false); setError(''); setWorkOrderId(''); }, [mode]);
  useEffect(() => { setSelectedPart(previous => previous ? parts.find(part => part.id === previous.id) ?? null : null); }, [parts]);
  const filteredParts = parts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku ?? p.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenReorder = (part: InventoryPart) => {
    setSelectedPart(part);
    setReorderAmount(part.reorderLevel * 2);
    setShowReorderModal(true);
  };

  const handleConfirmReorder = async () => {
    if (selectedPart) {
      try { await reorderInventoryPart(selectedPart.id, reorderAmount); setError(''); setShowReorderModal(false); } catch (e) { setError(e instanceof Error ? e.message : 'Reorder failed'); }
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
            Inventory
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'LIVE'
              ? 'Sample maintenance catalog and persistent stock movements. Verify OEM part numbers and machine compatibility before procurement.'
              : 'Temporary stock adjustments and part usage; supplier orders are suggestions.'}
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search spare parts or SKUs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500 focus:bg-white w-full sm:w-64 transition-all"
          />
        </div>
      </div>

      <p className="bg-white rounded-xl border p-4 text-sm font-bold">Inventory valuation: ${parts.reduce((sum,p)=>sum+p.quantityOnHand*(p.unitCost??0),0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
      <div className="bg-white border rounded-xl p-4 space-y-3 text-xs"><h2 className="font-bold">Stock movements and part usage</h2><select value={selectedPart?.id??''} onChange={e=>{const part=parts.find(p=>p.id===e.target.value)??null;setSelectedPart(part);if(part)void loadPartMovements(part.id).catch(error=>setError(error.message));}} className="border rounded p-2"><option value="">Select part</option>{parts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="number" value={delta} onChange={e=>setDelta(Number(e.target.value))} className="border rounded p-2 w-24" aria-label="Stock quantity"/><select value={workOrderId} onChange={e=>setWorkOrderId(e.target.value)} className="border rounded p-2"><option value="">Stock adjustment</option>{workOrders.filter(w=>w.status!=='RESOLVED').map(w=><option key={w.id} value={w.id}>{w.id}: {w.title}</option>)}</select><button disabled={!selectedPart||!canPerform(userRole,workOrderId?'updateWorkOrder':'reorderInventory')} onClick={()=>{if(selectedPart)void adjustInventoryPart(selectedPart.id,workOrderId?-Math.abs(delta):delta,workOrderId||undefined).then(()=>{setError('');return loadPartMovements(selectedPart.id);}).catch(error=>setError(error.message));}} className="bg-blue-700 text-white rounded px-3 py-2 disabled:opacity-50">{workOrderId?'Consume parts':'Record adjustment'}</button><p>For adjustments, enter a signed quantity. For usage, select the work order and quantity consumed.</p>{stockMovements.filter(m=>m.part_id===selectedPart?.id).map(m=><p key={String(m.id)}>{String(m.created_at)} · {String(m.quantity_delta)} · {String(m.reason)} · {String(m.work_order_id??'')}</p>)}</div>
      <div className="bg-white border rounded-xl p-4 text-xs space-y-2"><h2 className="font-bold">Supplier reorder suggestions</h2>{supplierOrders.length? supplierOrders.map(o=><p key={String(o.id)}>{String(o.part_id)} · {String(o.supplier_id)} · {String(o.quantity)} units · ${String(o.estimated_cost)} · {String(o.status)} {o.status!=='RECEIVED'&&canPerform(userRole,'reorderInventory')&&<button onClick={()=>void receiveSupplierOrder(String(o.id)).catch(e=>setError(e.message))} className="ml-3 text-blue-700 underline">Receive stock</button>}</p>):<p>No pending suggestions</p>}</div>
      {/* Parts Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Part / SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Reorder Level</th>
                <th className="py-3.5 px-4">Unit Cost</th>
                <th className="py-3.5 px-4">OEM Supplier</th>
                <th className="py-3.5 px-4">Lead Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredParts.map((part) => {
                const isShortage = part.quantityOnHand <= part.reorderLevel;

                return (
                  <tr
                    key={part.id}
                    className={`hover:bg-gray-50/80 transition-colors ${
                      isShortage ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{part.name}</div>
                      <div className="text-[11px] font-mono text-gray-400 mt-0.5">{part.sku ?? part.id}</div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600">{part.category ?? 'Not reported'}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black font-mono text-sm ${
                            isShortage ? 'text-rose-600 font-bold' : 'text-gray-900'
                          }`}
                        >
                          {part.quantityOnHand}
                        </span>
                        {isShortage && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            LOW STOCK
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-gray-600">{part.reorderLevel} units</td>

                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {part.unitCost === undefined ? 'Not reported' : `$${part.unitCost.toFixed(2)}`}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-800">{part.supplierName}</span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 font-mono">{part.leadTimeDays === undefined ? 'Not reported' : `${part.leadTimeDays} days`}</td>

                    <td className="py-3.5 px-4 text-right">
                      {!canPerform(userRole, 'reorderInventory') ? (
                        <span className="text-[11px] text-slate-400">Read only</span>
                      ) : <button
                        onClick={() => handleOpenReorder(part)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Order More</span>
                      </button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reorder Modal */}
      {showReorderModal && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Review reorder suggestion</h3>
                <p className="text-xs text-gray-500">{selectedPart.name}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Supplier:</span>
                  <span className="font-bold text-gray-800">{selectedPart.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Stock:</span>
                  <span className="font-mono font-bold">{selectedPart.quantityOnHand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unit Price:</span>
                  <span className="font-mono">${selectedPart.unitCost}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Reorder Quantity (Units):
                </label>
                <input
                  type="number"
                  min="1"
                  value={reorderAmount}
                  onChange={(e) => setReorderAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono font-bold text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-100">
                <span>Total PO Amount:</span>
                <span className="font-mono text-emerald-600">
                  {selectedPart.unitCost === undefined ? 'Not reported' : `$${(reorderAmount * selectedPart.unitCost).toLocaleString()}`}
                </span>
              </div>
            </div>

            {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowReorderModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmReorder()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                Save reorder suggestion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
