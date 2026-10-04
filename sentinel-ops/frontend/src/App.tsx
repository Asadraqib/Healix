import React, { useEffect, useState } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ClosedLoopBanner } from './components/layout/ClosedLoopBanner';
import { DashboardView } from './components/dashboard/DashboardView';
import { SimulationView } from './components/simulation/SimulationView';
import { FleetView } from './components/fleet/FleetView';
import { WorkOrdersView } from './components/workorders/WorkOrdersView';
import { AiDiagnosticView } from './components/ai/AiDiagnosticView';
import { InventoryView } from './components/inventory/InventoryView';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { ArchitectureInspector } from './components/architecture/ArchitectureInspector';
import { useSimulation } from './context/SimulationContext';
import { RecordDetail } from './components/search/RecordDetail';
import type { SearchResult } from './services/searchRecords';
import { canAccessTab } from './services/accessControl';

const AppContent: React.FC = () => {
  const { userRole, currentUser, isSwitchingMode, mode } = useSimulation();
  const [detailRecord,setDetailRecord]=useState<SearchResult|null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
    window.matchMedia('(max-width: 639px)').matches
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [targetWorkOrderId, setTargetWorkOrderId] = useState<string | null>(null);

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 639px)');
    const updateSidebar = () => setSidebarCollapsed(mobileViewport.matches);
    mobileViewport.addEventListener('change', updateSidebar);
    return () => mobileViewport.removeEventListener('change', updateSidebar);
  }, []);

  useEffect(() => {
    if (!canAccessTab(userRole, activeTab) || (mode === 'LIVE' && ['simulation','architecture'].includes(activeTab))) setActiveTab('dashboard');
  }, [activeTab, userRole, mode]);

  useEffect(()=>{setDetailRecord(null);setSelectedAssetId(null);setTargetWorkOrderId(null);},[mode,currentUser?.id]);
  const openRecord=(record:SearchResult)=>{
    if(!canAccessTab(userRole,record.kind))return;
    if(record.kind==='fleet'){setSelectedAssetId(record.id);setActiveTab('fleet');}
    else if(record.kind==='workorders'){setTargetWorkOrderId(record.id);setActiveTab('workorders');}
    else setDetailRecord(record);
  };
  const handleNavigateTab = (tab: string) => {
    if (!canAccessTab(userRole, tab) || (mode === 'LIVE' && ['simulation','architecture'].includes(tab))) return;
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setActiveTab('fleet');
  };

  const handleViewWorkOrder = (workOrderId: string) => {
    setTargetWorkOrderId(workOrderId);
    setActiveTab('workorders');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Global Navigation Bar */}
      <Header
        onNavigateTab={handleNavigateTab}
        onOpenRecord={openRecord}
      />

      {!currentUser ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold">Sign in to Healix</h1>
            <p className="mt-3 text-sm text-slate-600">{isSwitchingMode ? 'Checking your session…' : 'Use the Sign in button above to access your machinery dashboard. LIVE and SIMULATION data are available after signing in.'}</p>
          </div>
        </main>
      ) : <>
      {detailRecord&&<RecordDetail record={detailRecord} onClose={()=>setDetailRecord(null)}/>}
      {/* Autonomous Closed-Loop Event Banner (Pops up on self-healing triggers) */}
      <ClosedLoopBanner onViewWorkOrder={handleViewWorkOrder} />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Collapsible Left Enterprise Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={handleNavigateTab}
              onSelectAsset={handleSelectAsset}
            />
          )}

          {mode === 'SIMULATION' && activeTab === 'simulation' && (
            <SimulationView onNavigateTab={handleNavigateTab} />
          )}

          {activeTab === 'fleet' && (
            <FleetView
              onNavigateTab={handleNavigateTab}
              selectedAssetId={selectedAssetId}
              onClearSelection={() => setSelectedAssetId(null)}
            />
          )}

          {activeTab === 'workorders' && (
            <WorkOrdersView
              onNavigateTab={handleNavigateTab}
              targetWorkOrderId={targetWorkOrderId}
              onClearSelection={() => setTargetWorkOrderId(null)}
            />
          )}

          {activeTab === 'ai-rag' && <AiDiagnosticView />}

          {activeTab === 'inventory' && (
            <InventoryView onNavigateTab={handleNavigateTab} />
          )}

          {activeTab === 'suppliers' && <SuppliersView />}

          {mode === 'SIMULATION' && activeTab === 'architecture' && <ArchitectureInspector />}
        </main>
      </div>
      </>}
    </div>
  );
};

export default function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
}
