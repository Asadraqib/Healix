import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import type { SearchResult } from '../../services/searchRecords';
export function RecordDetail({ record, onClose }: { record: SearchResult; onClose: () => void }) {
 const { parts, suppliers, stockMovements, loadPartMovements }=useSimulation(); const [error,setError]=useState('');
 const part=parts.find(p=>p.id===record.id);const supplier=suppliers.find(s=>s.id===record.id);
 useEffect(()=>{if(record.kind==='inventory')void loadPartMovements(record.id).catch(e=>setError(e.message));},[record.id,record.kind]);
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section role="dialog" aria-modal="true" aria-label={record.label} className="max-w-xl w-full max-h-[85vh] overflow-auto bg-white rounded-xl border p-6 text-sm space-y-3"><button onClick={onClose} className="float-right" aria-label="Close record details"><X className="h-5 w-5"/></button><h2 className="text-lg font-semibold">{record.label}</h2>
 {record.kind==='inventory'&&part?<><p>SKU: {part.sku??part.id}</p><p>On hand: {part.quantityOnHand} · Reorder level: {part.reorderLevel}</p><p>Unit cost: ${(part.unitCost??0).toFixed(2)} · Stock value: ${(part.quantityOnHand*(part.unitCost??0)).toFixed(2)}</p><p>Supplier: {part.supplierName}</p><p>Compatible machines: {part.compatibleAssets?.join(', ')||'Not specified'}</p><h3>Stock movement history</h3>{error?<p role="alert" className="text-rose-700">{error}</p>:stockMovements.filter(m=>m.part_id===part.id).map(m=><p key={String(m.id)} className="text-xs border-t pt-2">{new Date(String(m.created_at)).toLocaleString()} · {String(m.quantity_delta)} units · {String(m.reason)} {String(m.work_order_id??'')}</p>)}{!stockMovements.some(m=>m.part_id===part.id)&&!error&&<p className="text-slate-500">No recorded stock movements.</p>}</>:record.kind==='suppliers'&&supplier?<><p>Sample directory record. Verify supplier authorization and part compatibility before procurement.</p><p>{supplier.contact}</p><p>{supplier.contactPhone}</p><h3>Available parts</h3>{parts.filter(p=>p.supplierId===supplier.id).map(p=><p key={p.id}>{p.name} · {p.sku??p.id}</p>)}</>:<p>This record is no longer available.</p>}
 </section></div>;
}
