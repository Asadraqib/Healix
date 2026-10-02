import React from 'react';
import { Truck, Star, MapPin, Mail, Phone, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const SuppliersView: React.FC = () => {
  const { suppliers, mode } = useSimulation();

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
            Supplier Service • GET /api/suppliers
          </span>
          <span className="text-xs font-mono text-gray-500">{mode === 'LIVE' ? 'Supplier records from maintenance service' : 'Tier 1 Industrial OEM Partners'}</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
          OEM Vendor Directory & Supply Chain Integration
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {mode === 'LIVE'
            ? 'Supplier records include the service-provided name, contact, phone, and rating fields.'
            : 'Connected supplier networks with automated EDI procurement channels for instant spare parts dispatch'}
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
              <span className={`px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${mode === 'SIMULATION' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{mode === 'SIMULATION' ? 'Demo connection' : 'Connection status not reported'}</span>
              </span>

              <button className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                <span>View Catalog</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
