import React, { useEffect, useState } from 'react';
import { Brain, Send, FileText } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import type { AiResult } from '../../services/liveApi';

export const AiDiagnosticView: React.FC = () => {
 const { assets, mode, runAi, runAiDiagnosticQuery, createWorkOrder } = useSimulation();
 const [assetId,setAssetId]=useState(assets[0]?.id ?? '');
 const [question,setQuestion]=useState('Analyze maintenance risks and recommend checks based on current readings and work orders.');
 const [result,setResult]=useState<AiResult|null>(null);
 const [pending,setPending]=useState(false); const [error,setError]=useState(''); const [saved,setSaved]=useState(false);
 useEffect(() => {setResult(null);setError('');setSaved(false);setAssetId(assets[0]?.id ?? '');},[mode]);
 const request=async(action:'analyze'|'forecast'|'draft-work-order'|'diagnose')=>{
  setPending(true);setError('');setResult(null);setSaved(false);
  try {setResult(action==='diagnose'?await runAiDiagnosticQuery(assetId,question).then(r=>({answer:r.answer,sources:r.sourceLabels??[]})):await runAi(action,assetId,question));}
  catch(e){setError(e instanceof Error?e.message:'AI request failed');}finally{setPending(false);}
 };
 const confirm=async()=>{if(!result?.title || !result.priority)return;setPending(true);setError('');try{await createWorkOrder({assetId,title:result.title,priority:result.priority,description:result.description,recommendedAction:result.recommendedAction});setSaved(true);}catch(e){setError(e instanceof Error?e.message:'Unable to save');}finally{setPending(false);}};
 return <div className="space-y-6">
  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs"><div className="flex items-center gap-2 text-purple-700"><Brain className="w-5 h-5"/><h1 className="text-2xl font-black text-gray-900">AI Maintenance Diagnosis</h1></div><p className="mt-2 text-xs text-gray-500">Analysis, forecasts, and draft work orders use the configured backend provider and the selected mode's records. The maintenance assistant retrieves project documents; approved OEM manuals must be supplied.</p></div>
  <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
   <label className="block text-xs font-semibold">Asset<select value={assetId} onChange={e=>{setAssetId(e.target.value);setResult(null);}} className="block w-full mt-1 border rounded p-2">{assets.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
   <label className="block text-xs font-semibold">Question or maintenance task<textarea value={question} onChange={e=>setQuestion(e.target.value)} className="block w-full mt-1 border rounded p-3" rows={3}/></label>
   <div className="flex flex-wrap gap-2">{(['analyze','forecast','draft-work-order','diagnose'] as const).map(action=><button key={action} disabled={pending||!assetId||!question.trim()} onClick={()=>void request(action)} className="bg-purple-700 text-white text-xs rounded px-4 py-2 disabled:opacity-50">{action==='diagnose'?'Ask maintenance assistant':action==='draft-work-order'?'Draft work order':action==='forecast'?'Failure / repair forecast':'Analyze asset'}</button>)}</div>
   {pending&&<p role="status" className="text-xs text-purple-700">Loading provider response…</p>}
   {error&&<p role="alert" className="text-sm text-rose-700 bg-rose-50 p-3 rounded">{error}</p>}
   {result&&<div className="border rounded-xl p-4 space-y-3 text-sm">
    {result.riskLevel&&<p className="font-semibold">Risk: {result.riskLevel}</p>}
    {result.answer&&<p className="whitespace-pre-wrap">{result.answer}</p>}{result.explanation&&<p>{result.explanation}</p>}
    {result.recommendedChecks?.map(check=><p key={check}>• {check}</p>)}
    {result.title&&<><p className="text-xs font-bold text-amber-700">AI draft — review before saving</p><label className="block text-xs">Title<input value={result.title} onChange={e=>setResult({...result,title:e.target.value})} className="block border rounded p-2 w-full"/></label><label className="block text-xs">Description<textarea value={result.description??''} onChange={e=>setResult({...result,description:e.target.value})} className="block border rounded p-2 w-full" rows={4}/></label><label className="block text-xs">Priority<select value={result.priority} onChange={e=>setResult({...result,priority:e.target.value as AiResult['priority']})} className="block border rounded p-2">{['LOW','MEDIUM','HIGH','CRITICAL'].map(p=><option key={p}>{p}</option>)}</select></label><p>Suggested parts (verify compatibility): {result.suggestedParts?.join(', ')||'None specified'}</p><button disabled={pending||saved} onClick={()=>void confirm()} className="bg-blue-700 text-white rounded px-4 py-2">{saved?'Work order saved':'Confirm and save work order'}</button></>}
    <p className="text-xs text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4"/>Sources: {result.sources.join(', ')||'Current maintenance records; no relevant document retrieved'}</p>
   </div>}
  </div>
 </div>;
};
