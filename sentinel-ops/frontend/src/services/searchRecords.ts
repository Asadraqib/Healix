import type { Asset, InventoryPart, Supplier, WorkOrder, UserRole } from '../types';
import { canAccessTab } from './accessControl';
export type SearchKind = 'fleet' | 'workorders' | 'inventory' | 'suppliers';
export interface SearchResult {
  kind: SearchKind;
  id: string;
  label: string;
  secondary: string;
}
export function searchRecords(
  query: string,
  role: UserRole,
  records: {
    assets: Asset[];
    workOrders: WorkOrder[];
    parts: InventoryPart[];
    suppliers: Supplier[];
  },
): SearchResult[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const results: (SearchResult & { text: string })[] = [
    ...records.assets.map((a) => ({
      kind: 'fleet' as const,
      id: a.id,
      label: a.name,
      secondary: a.location,
      text: `${a.id} ${a.name} ${a.assetType} ${a.location} ${a.sensors.map((s) => s.name).join(' ')}`,
    })),
    ...records.workOrders.map((w) => ({
      kind: 'workorders' as const,
      id: w.id,
      label: w.title,
      secondary: `${w.id} · ${w.assetName} · ${w.status}`,
      text: `${w.id} ${w.title} ${w.assetName} ${w.description ?? ''} ${w.assignedTechnician ?? ''} ${w.status}`,
    })),
    ...records.parts.map((p) => ({
      kind: 'inventory' as const,
      id: p.id,
      label: p.name,
      secondary: `${p.sku ?? p.id} · ${p.quantityOnHand} in stock`,
      text: `${p.id} ${p.name} ${p.sku ?? ''} ${p.category ?? ''} ${p.supplierName ?? ''}`,
    })),
    ...records.suppliers.map((s) => ({
      kind: 'suppliers' as const,
      id: s.id,
      label: s.name,
      secondary: s.location ?? 'Supplier directory',
      text: `${s.id} ${s.name} ${s.contact ?? ''}`,
    })),
  ];
  return results
    .filter(
      (r) =>
        canAccessTab(role, r.kind) &&
        terms.every((term) => r.text.toLocaleLowerCase().includes(term)),
    )
    .slice(0, 20)
    .map(({ kind, id, label, secondary }) => ({ kind, id, label, secondary }));
}
