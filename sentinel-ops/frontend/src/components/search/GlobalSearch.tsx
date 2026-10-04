import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { searchRecords, type SearchResult } from '../../services/searchRecords';
export function GlobalSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
 const { assets, workOrders, parts, suppliers, userRole, mode } = useSimulation();
 const [query,setQuery]=useState(''); const [open,setOpen]=useState(false); const [focused,setFocused]=useState(0);
 const root=useRef<HTMLDivElement>(null);
 const results=searchRecords(query,userRole,{assets,workOrders,parts,suppliers});
 useEffect(()=>{setQuery('');setOpen(false);},[mode]);
 useEffect(()=>{const dismiss=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('mousedown',dismiss);return()=>document.removeEventListener('mousedown',dismiss);},[]);
 const select=(result:SearchResult)=>{onSelect(result);setQuery('');setOpen(false);};
 return <div ref={root} className="relative flex-1 min-w-0 max-w-sm mx-2 sm:mx-4">
  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400"/>
  <input aria-label="Search Healix" aria-expanded={open&&!!query.trim()} aria-controls="global-search-results" value={query} onChange={e=>{setQuery(e.target.value);setFocused(0);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);if(e.key==='ArrowDown'){e.preventDefault();setFocused(i=>Math.min(i+1,results.length-1));}if(e.key==='ArrowUp'){e.preventDefault();setFocused(i=>Math.max(0,i-1));}if(e.key==='Enter'&&results[focused]){e.preventDefault();select(results[focused]);}}} placeholder="Search Healix…" className="w-full pl-9 pr-7 py-2 bg-[#001738] text-xs text-white placeholder-slate-400 rounded-md border border-[#003882] focus:outline-none focus:border-blue-400"/>
  {query&&<button onClick={()=>{setQuery('');setOpen(false);}} aria-label="Clear search" className="absolute right-2 top-2.5"><X className="w-3 h-3"/></button>}
  {open&&query.trim()&&<div id="global-search-results" className="absolute left-0 right-0 top-full mt-2 min-w-64 max-h-80 overflow-y-auto rounded-lg bg-white text-slate-900 border border-slate-200 shadow-xl z-50">{results.length?results.map((r,index)=><button key={`${r.kind}-${r.id}`} onClick={()=>select(r)} className={`block w-full p-3 text-left text-xs border-b border-slate-100 ${index===focused?'bg-blue-50':'hover:bg-slate-50'}`}><span className="block font-semibold">{r.label}</span><span className="block mt-1 text-slate-500">{r.kind==='fleet'?'Asset':r.kind==='workorders'?'Work order':r.kind==='inventory'?'Part':'Supplier'} · {r.secondary}</span></button>):<p className="p-4 text-xs text-slate-500">No matching records in {mode.toLowerCase()} mode.</p>}</div>}
 </div>;
}
