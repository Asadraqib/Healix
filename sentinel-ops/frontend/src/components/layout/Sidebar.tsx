import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Sliders,
  Wrench,
  Brain,
  Package,
  Truck,
  Network,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { canAccessTab } from '../../services/accessControl';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed
}) => {
  const { workOrders, parts, userRole, mode } = useSimulation();

  const openWorkOrdersCount = workOrders.filter((w) => w.status !== 'RESOLVED').length;
  const lowPartsCount = parts.filter((p) => p.quantityOnHand <= p.reorderLevel).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'simulation',
      label: 'Simulation & Override',
      icon: Sliders,
      badge: 'Demo'
    },
    {
      id: 'fleet',
      label: 'Assets & Machines',
      icon: Cpu,
      badge: null
    },
    {
      id: 'workorders',
      label: 'Work Orders',
      icon: Wrench,
      badge: openWorkOrdersCount > 0 ? String(openWorkOrdersCount) : null
    },
    {
      id: 'ai-rag',
      label: 'AI Diagnostics',
      icon: Brain,
      badge: null
    },
    {
      id: 'inventory',
      label: 'Inventory & Parts',
      icon: Package,
      badge: lowPartsCount > 0 ? String(lowPartsCount) : null
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      badge: null
    },
    {
      id: 'architecture',
      label: 'Architecture',
      icon: Network,
      badge: null
    }
  ];

  return (
    <aside
      className={`bg-white text-slate-700 border-r border-slate-200 transition-all duration-200 flex flex-col shrink-0 select-none z-30 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Toggle button */}
      <div className="h-10 border-b border-slate-100 flex items-center justify-end px-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
        {navItems.filter((item) => canAccessTab(userRole, item.id) && (mode === 'SIMULATION' || !['simulation', 'architecture'].includes(item.id))).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors text-xs font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Clean quiet footer */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400">
          {mode === 'SIMULATION' ? 'Temporary simulation' : 'Siemens AG · Live operations'}
        </div>
      )}
    </aside>
  );
};
