import type { UserRole } from '../types';

export type AppTab = 'dashboard' | 'simulation' | 'fleet' | 'workorders' | 'ai-rag' | 'inventory' | 'suppliers' | 'architecture';
export type AppAction = 'override' | 'reset' | 'createWorkOrder' | 'updateWorkOrder' | 'reorderInventory' | 'diagnose';

const tabAccess: Record<UserRole, AppTab[]> = {
  ADMIN: ['dashboard', 'simulation', 'fleet', 'workorders', 'ai-rag', 'inventory', 'suppliers', 'architecture'],
  RELIABILITY_ENGINEER: ['dashboard', 'simulation', 'fleet', 'workorders', 'ai-rag', 'inventory', 'suppliers', 'architecture'],
  TECHNICIAN: ['dashboard', 'simulation', 'fleet', 'workorders', 'inventory'],
  EXECUTIVE_VIEWER: ['dashboard', 'fleet', 'workorders', 'suppliers', 'architecture'],
  VIEWER: ['dashboard', 'fleet']
};

const actionAccess: Record<AppAction, UserRole[]> = {
  override: ['ADMIN', 'RELIABILITY_ENGINEER', 'TECHNICIAN'],
  reset: ['ADMIN', 'RELIABILITY_ENGINEER', 'TECHNICIAN'],
  createWorkOrder: ['ADMIN', 'RELIABILITY_ENGINEER', 'TECHNICIAN'],
  updateWorkOrder: ['ADMIN', 'RELIABILITY_ENGINEER', 'TECHNICIAN'],
  reorderInventory: ['ADMIN', 'RELIABILITY_ENGINEER'],
  diagnose: ['ADMIN', 'RELIABILITY_ENGINEER']
};

export const canAccessTab = (role: UserRole, tab: string) =>
  tabAccess[role].includes(tab as AppTab);

export const canPerform = (role: UserRole, action: AppAction) =>
  actionAccess[action].includes(role);

export const roleLabel = (role: UserRole) => ({
  ADMIN: 'Administrator',
  RELIABILITY_ENGINEER: 'Reliability Engineer',
  TECHNICIAN: 'Technician',
  EXECUTIVE_VIEWER: 'Executive Viewer',
  VIEWER: 'Viewer'
})[role];