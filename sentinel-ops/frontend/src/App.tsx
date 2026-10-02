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
import { canAccessTab } from './services/accessControl';

const AppContent: React.FC = () => {
  const { userRole } = useSimulation();
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
    if (!canAccessTab(userRole, activeTab)) setActiveTab('dashboard');
  }, [activeTab, userRole]);

  const handleNavigateTab = (tab: string) => {
    if (!canAccessTab(userRole, tab)) return;
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
      />

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

          {activeTab === 'simulation' && (
            <SimulationView onNavigateTab={handleNavigateTab} />
          )}

          {activeTab === 'fleet' && (
            <FleetView
              onNavigateTab={handleNavigateTab}
              selectedAssetId={selectedAssetId}
            />
          )}

          {activeTab === 'workorders' && (
            <WorkOrdersView
              onNavigateTab={handleNavigateTab}
              targetWorkOrderId={targetWorkOrderId}
            />
          )}

          {activeTab === 'ai-rag' && <AiDiagnosticView />}

          {activeTab === 'inventory' && (
            <InventoryView onNavigateTab={handleNavigateTab} />
          )}

          {activeTab === 'suppliers' && <SuppliersView />}

          {activeTab === 'architecture' && <ArchitectureInspector />}
        </main>
      </div>
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
