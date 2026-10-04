import React, { useState } from 'react';
import { RecordDetail } from '../search/RecordDetail';
import type { SearchResult } from '../../services/searchRecords';
import { Truck, Star, MapPin, Mail, Phone, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const SuppliersView: React.FC = () => {
  const { suppliers } = useSimulation();
  const [selected, setSelected] = useState<SearchResult | null>(null);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs">
        <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
          Suppliers
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Sample supplier directory. Verify authorization and compatibility before ordering.
        </p>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {supplier.tier ?? 'Tier not reported'}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1.5">{supplier.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{supplier.location ?? 'Location not reported'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{supplier.rating.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">Supplier Score</span>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">On-Time Delivery</span>
                  <div className="text-sm font-black font-mono text-emerald-600 mt-0.5">
                      {supplier.onTimeDeliveryRate === undefined ? 'Not reported' : `${supplier.onTimeDeliveryRate}%`}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase">Catalog SKUs</span>
                  <div className="text-sm font-black font-mono text-gray-900 mt-0.5">
                    {supplier.catalogCount?.toLocaleString() ?? 'Not reported'}{supplier.catalogCount === undefined ? '' : ' parts'}
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono text-gray-800">{supplier.contact ?? supplier.contactEmail ?? 'Contact not reported'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono text-gray-800">{supplier.contactPhone ?? 'Phone not reported'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Sample record</span>

              <button onClick={() => setSelected({kind:"suppliers",id:supplier.id,label:supplier.name,secondary:"Supplier directory"})} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                <span>View Catalog</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && <RecordDetail record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
