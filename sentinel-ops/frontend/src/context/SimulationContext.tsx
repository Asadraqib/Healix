import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Asset,
  WorkOrder,
  InventoryPart,
  Supplier,
  AiAuditLog,
  NotificationItem,
  UserRole,
  RagDocumentChunk,
  WorkOrderSeverity
} from '../types';
import {
  INITIAL_ASSETS,
  INITIAL_WORK_ORDERS,
  INITIAL_PARTS,
  INITIAL_SUPPLIERS,
} from '../data/mockData';
import { liveApi, LiveDashboardSummary, LiveUserDto, TelemetryMessage, AiResult } from '../services/liveApi';
import { mapLiveAssets, mapLiveParts, mapLiveSuppliers, mapLiveWorkOrders } from '../services/domainAdapters';
import { canPerform } from '../services/accessControl';
import { TelemetryStabilizer, TELEMETRY_CONFIG } from '../services/telemetryStabilizer';

export type AppMode = 'SIMULATION' | 'LIVE';

const SIMULATION_SEED = 0x5eed1234;

const nextSeededValue = (seed: { current: number }) => {
  seed.current = (1664525 * seed.current + 1013904223) >>> 0;
  return seed.current / 4294967296;
};

const normalizeUserRole = (role: string): UserRole => {
  const normalized = role.toUpperCase();
  return ['ADMIN', 'RELIABILITY_ENGINEER', 'TECHNICIAN', 'EXECUTIVE_VIEWER', 'VIEWER'].includes(normalized)
    ? normalized as UserRole
    : 'VIEWER';
};

interface OverrideState {
  assetId: string;
  sensorId: string;
  value: number;
  expiresAt: number;
  description: string;
}

export interface SelfHealingEvent {
  id: string;
  timestamp: string;
  assetId: string;
  assetName: string;
  triggerSensor: string;
  triggerValue: number;
  thresholdValue: number;
  unit: string;
  failureProbability: number;
  generatedWorkOrderId: string;
  allocatedPartName: string;
}

interface SimulationContextType {
  mode: AppMode;
  modeError: string | null;
  requiresSignIn: boolean;
  isSwitchingMode: boolean;
  telemetryConnected: boolean;
  currentUser: LiveUserDto | null;
  dashboardSummary: LiveDashboardSummary | null;
  assets: Asset[];
  workOrders: WorkOrder[];
  parts: InventoryPart[];
  suppliers: Supplier[];
  auditLogs: AiAuditLog[];
  notifications: NotificationItem[];
  userRole: UserRole;
  isSimulating: boolean;
  activeOverride: OverrideState | null;
  recentSelfHealingEvent: SelfHealingEvent | null;
  setUserRole: (role: UserRole) => void;
  switchMode: (mode: AppMode) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  toggleSimulation: () => void;
  applyOverride: (assetId: string, sensorId: string, value: number, holdSeconds?: number, description?: string) => void;
  resetAssetToBaseline: (assetId: string) => void;
  resetFleet: () => void;
  triggerFailurePreset: (presetType: 'CNC_SPINDLE' | 'HYDRAULIC_BURST' | 'INVERTER_MELTDOWN') => void;
  dismissSelfHealingEvent: () => void;
  updateWorkOrderStatus: (workOrderId: string, newStatus: WorkOrder['status']) => void;
  createWorkOrder: (input: { assetId: string; title: string; priority: WorkOrderSeverity; owner?: string; due?: string; description?: string; recommendedAction?: string }) => Promise<void>;
  reorderInventoryPart: (partId: string, quantity: number) => void;
  runAiDiagnosticQuery: (assetId: string, userQuery: string) => Promise<{
    answer: string;
    sources: RagDocumentChunk[];
    sourceLabels?: string[];
    auditEntry?: AiAuditLog;
  }>;
  runAi: (action: 'analyze' | 'forecast' | 'draft-work-order', assetId: string, question: string) => Promise<AiResult>;
  adjustInventoryPart: (partId: string, delta: number, workOrderId?: string) => Promise<void>;
  assignWorkOrder: (id: string, owner: string) => Promise<void>;
  stockMovements: Record<string, unknown>[];
  supplierOrders: Record<string, unknown>[];
  loadPartMovements: (partId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('LIVE');
  const [modeError, setModeError] = useState<string | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(true);
  const [telemetryConnected, setTelemetryConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<LiveUserDto | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<LiveDashboardSummary | null>(null);
  const simulationSeed = useRef(SIMULATION_SEED);
  const modeRequest = useRef(0);
  const stabilizer = useRef(new TelemetryStabilizer());
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<InventoryPart[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [auditLogs, setAuditLogs] = useState<AiAuditLog[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('VIEWER');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [activeOverride, setActiveOverride] = useState<OverrideState | null>(null);
  const [recentSelfHealingEvent, setRecentSelfHealingEvent] = useState<SelfHealingEvent | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [stockMovements, setStockMovements] = useState<Record<string, unknown>[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<Record<string, unknown>[]>([]);
  const ordersRef = useRef(workOrders);
  ordersRef.current = workOrders;
  const activeAlarmRef = useRef<Record<string, string>>({});
  const snapshotRef = useRef({ assets, workOrders, parts });
  snapshotRef.current = { assets, workOrders, parts };
  const addNotice = (notice: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => setNotifications(prev => [{ ...notice, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false }, ...prev]);
  const refreshOperational = async (requestId = modeRequest.current) => {
    const [snapshot, notices, reorders] = await Promise.all([liveApi.getSnapshot(), liveApi.notifications(), liveApi.supplierOrders()]);
    if (requestId !== modeRequest.current) return;
    const fleet = mapLiveAssets(snapshot.assets);
    const directory = mapLiveSuppliers(snapshot.suppliers);
    setWorkOrders(mapLiveWorkOrders(snapshot.workOrders, fleet));
    setParts(mapLiveParts(snapshot.parts, directory)); setSuppliers(directory); setSupplierOrders(reorders);
    setNotifications(notices.map(n => ({ id: String(n.id), timestamp: String(n.created_at), type: n.type as NotificationItem['type'], title: String(n.title), message: String(n.message), assetId: n.asset_id ? String(n.asset_id) : undefined, workOrderId: n.work_order_id ? String(n.work_order_id) : undefined, partId: n.part_id ? String(n.part_id) : undefined, read: Boolean(n.is_read) })));
  };

  // Keep track of which asset triggers have already generated an open ticket to prevent duplicate spam
  const autoTriggerCooldownRef = useRef<Record<string, number>>({});

  // Simulation loop tick every 2000ms
  useEffect(() => {
    if (!currentUser || !isSimulating || mode !== 'SIMULATION') return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Check if override expired
      if (activeOverride && now >= activeOverride.expiresAt) {
        setActiveOverride(null);
      }

      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          let assetMaxSeverity = 0; // 0: healthy, 1: degraded, 2: critical
          let triggeredSensorInfo: { name: string; value: number; threshold: number; unit: string } | null = null;

          const updatedSensors = asset.sensors.map((sensor) => {
            let newValue = sensor.currentValue;

            // Is this sensor currently overridden?
            if (activeOverride && activeOverride.assetId === asset.id && activeOverride.sensorId === sensor.id) {
              newValue = activeOverride.value;
            } else {
              // Natural drift with bounded gaussian noise around baseline
              const baseline = sensor.baseline ?? sensor.currentValue;
              const noise = (nextSeededValue(simulationSeed) - 0.49) * (baseline * 0.015);
              const restoringPull = (baseline - sensor.currentValue) * 0.06;
              newValue = Math.max(0.1, Number((sensor.currentValue + noise + restoringPull).toFixed(2)));
            }

            // Append to history (keep 30 items)
            const updatedHistory = [...sensor.history.slice(-29), newValue];

            // Evaluate threshold
            const hasThreshold = sensor.criticalThreshold !== undefined && sensor.baseline !== undefined;
            const isExceeded = hasThreshold && (sensor.criticalThreshold! > sensor.baseline!
              ? newValue >= sensor.criticalThreshold!
              : newValue <= sensor.criticalThreshold!);

            if (isExceeded) {
              assetMaxSeverity = 2; // Critical
              triggeredSensorInfo = {
                name: sensor.name,
                value: newValue,
                threshold: sensor.criticalThreshold!,
                unit: sensor.unit
              };
            } else {
              const warningDistance = hasThreshold ? Math.abs(sensor.criticalThreshold! - sensor.baseline!) * 0.65 : Infinity;
              const currentDistance = (newValue - (sensor.baseline ?? newValue)) * Math.sign(sensor.criticalThreshold! - (sensor.baseline ?? newValue));
              if (currentDistance >= warningDistance && assetMaxSeverity < 1) {
                assetMaxSeverity = 1; // Degraded
              }
            }

            return {
              ...sensor,
              currentValue: newValue,
              history: updatedHistory
            };
          });

          // Compute health score
          let newHealthScore = 98 - nextSeededValue(simulationSeed) * 2;
          let newStatus: Asset['status'] = 'HEALTHY';

          if (assetMaxSeverity === 2) {
            newHealthScore = Math.max(24, Math.round(48 - nextSeededValue(simulationSeed) * 15));
            newStatus = 'DOWN';
          } else if (assetMaxSeverity === 1) {
            newHealthScore = Math.max(68, Math.round(76 - nextSeededValue(simulationSeed) * 8));
            newStatus = 'DEGRADED';
          }

          // Trigger Closed-Loop Self-Healing if Critical and cooldown passed
          if (assetMaxSeverity === 2 && triggeredSensorInfo) {
            const lastTriggerTime = autoTriggerCooldownRef.current[asset.id] || 0;
            if (now - lastTriggerTime > 15000 && !ordersRef.current.some(w => w.assetId === asset.id && w.autoGenerated && w.status !== 'RESOLVED')) {
              // 15 sec cooldown per asset
              autoTriggerCooldownRef.current[asset.id] = now;
              triggerClosedLoopSelfHealing(asset, triggeredSensorInfo, updatedSensors);
            }
          }

          return {
            ...asset,
            healthScore: Number(newHealthScore.toFixed(1)),
            status: newStatus,
            sensors: updatedSensors,
            lastSeenAt: new Date(now).toISOString(), telemetrySource: 'SIMULATION', connectionState: 'CONNECTED'
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, activeOverride, mode, currentUser]);

  useEffect(() => {
    if (mode !== 'LIVE' || !currentUser || isSwitchingMode) return;
    let stopped = false;
    let socketConnected = false;
    const disconnect = liveApi.connectTelemetry((message: TelemetryMessage) => {
      const alert = stabilizer.current.ingest(message);
      if (alert) setAssets(previous => previous.map(asset => asset.id === message.machineId
        ? { ...asset, status: alert, healthScore: alert === 'DOWN'
          ? Math.min(asset.healthScore, message.healthScore) : asset.healthScore } : asset));
    }, connected => {
      socketConnected = connected;
      setTelemetryConnected(connected);
    });
    const displayTimer = window.setInterval(() => {
      setAssets(previous => stabilizer.current.flush(previous));
      setTelemetryConnected(socketConnected && stabilizer.current.isFresh());
    }, TELEMETRY_CONFIG.displayIntervalMs);
    // WebSocket currently publishes temperature only; refresh other channels through the same filter.
    let pollTimer: number;
    const poll = async () => {
      try {
        const rows = await liveApi.getAssets();
        if (stopped) return;
        for (const row of rows) {
          for (const sensor of row.sensors ?? []) {
            stabilizer.current.ingest({ machineId: row.id, sensorType: sensor.type, sensorId: sensor.id, value: sensor.currentValue, healthScore: row.health, status: row.status, recordedAt: row.lastSeenAt ?? '', source: row.telemetrySource });
          }
        }
        await refreshOperational();
      } catch (error) {
        if (!stopped && error instanceof Error) setModeError(error.message);
      } finally {
        if (!stopped) pollTimer = window.setTimeout(poll, 10000);
      }
    };
    pollTimer = window.setTimeout(poll, 10000);
    return () => {
      stopped = true;
      disconnect();
      window.clearInterval(displayTimer);
      window.clearTimeout(pollTimer);
      setTelemetryConnected(false);
    };
  }, [mode, currentUser, isSwitchingMode]);

  // Threshold automation is deterministic business logic, not an AI prediction.
  const triggerClosedLoopSelfHealing = (
    asset: Asset,
    sensorInfo: { name: string; value: number; threshold: number; unit: string },
    _currentSensors: Asset['sensors']
  ) => {
    const id = `WO-${crypto.randomUUID().slice(0, 12)}`;
    const order: WorkOrder = { id, assetId: asset.id, assetName: asset.name, severity: 'CRITICAL', status: 'AUTO_GENERATED', title: `Inspect ${sensorInfo.name}`, description: `${sensorInfo.name} = ${sensorInfo.value} ${sensorInfo.unit}; critical threshold ${sensorInfo.threshold}. Verify sensor and inspect equipment using approved isolation procedures.`, assignedTechnician: 'Unassigned', createdAt: new Date().toISOString(), autoGenerated: true };
    ordersRef.current = [order, ...ordersRef.current];
    setWorkOrders(prev => [order, ...prev]);
    addNotice({ type: 'ALERT', title: `Critical alarm: ${asset.name}`, message: order.description!, assetId: asset.id });
    addNotice({ type: 'WORK_ORDER', title: 'Automatic work order created', message: order.title, assetId: asset.id, workOrderId: id });
  };

  const applyOverride = (
    assetId: string,
    sensorId: string,
    value: number,
    holdSeconds: number = 30,
    description: string = 'Manual test override'
  ) => {
    if (!canPerform(userRole, 'override')) {
      setModeError('Your account role does not have permission to override asset readings.');
      return;
    }

    if (mode === 'LIVE') {
      const sensor = assets.find((asset) => asset.id === assetId)?.sensors.find((item) => item.id === sensorId);
      if (sensor?.type.toLowerCase() !== 'temperature') {
        setModeError('The live simulation service currently accepts temperature overrides only.');
        return;
      }
      liveApi.override(assetId, value, holdSeconds).catch((error: Error) => setModeError(error.message));
      return;
    }

    setActiveOverride({
      assetId,
      sensorId,
      value,
      expiresAt: Date.now() + holdSeconds * 1000,
      description
    });
  };

  const resetAssetToBaseline = (assetId: string) => {
        if (!canPerform(userRole, 'reset')) {
          setModeError('Your account role does not have permission to reset assets.');
          return;
        }

    if (mode === 'LIVE') {
      liveApi.resetAsset(assetId).catch((error: Error) => setModeError(error.message));
      return;
    }

    setActiveOverride(null);
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== assetId) return a;
        return {
          ...a,
          healthScore: 96.5,
          status: 'HEALTHY',
          sensors: a.sensors.map((s) => ({
            ...s,
            currentValue: s.baseline ?? s.currentValue,
            history: [...s.history.slice(-20), s.baseline ?? s.currentValue]
          }))
        };
      })
    );
  };

  const resetFleet = () => {
        if (!canPerform(userRole, 'reset')) {
          setModeError('Your account role does not have permission to reset assets.');
          return;
        }

    if (mode === 'LIVE') {
      Promise.all(assets.map((asset) => liveApi.resetAsset(asset.id)))
        .catch((error: Error) => setModeError(error.message));
      return;
    }

    setActiveOverride(null);
    setRecentSelfHealingEvent(null);
    simulationSeed.current = SIMULATION_SEED;
    setAssets(structuredClone(INITIAL_ASSETS));
  };

  const triggerFailurePreset = (presetType: 'CNC_SPINDLE' | 'HYDRAULIC_BURST' | 'INVERTER_MELTDOWN') => {
        if (!canPerform(userRole, 'override')) {
          setModeError('Your account role does not have permission to trigger failure presets.');
          return;
        }

    if (mode === 'LIVE') {
      setModeError('Failure presets are available in Simulation mode only.');
      return;
    }

    if (presetType === 'CNC_SPINDLE') {
      applyOverride(
        'ast-sinumerik-01',
        'sn-snm-01',
        8.45,
        35,
        'Simulated Spindle Cage Bearing Fracture (Vibration > 8.0 mm/s)'
      );
    } else if (presetType === 'HYDRAULIC_BURST') {
      applyOverride(
        'ast-hydraulic-04',
        'sn-hyd-01',
        425.0,
        35,
        'Simulated Hydraulic Cavitation Spike (Pressure > 400 Bar)'
      );
    } else if (presetType === 'INVERTER_MELTDOWN') {
      applyOverride(
        'ast-sinamics-03',
        'sn-snx-01',
        94.2,
        35,
        'Simulated IGBT Thermal Breakdown (Inverter Temp > 90°C)'
      );
    }
  };

  const dismissSelfHealingEvent = () => {
    setRecentSelfHealingEvent(null);
  };

  const updateWorkOrderStatus = (workOrderId: string, newStatus: WorkOrder['status']) => {
        if (!canPerform(userRole, 'updateWorkOrder')) {
          setModeError('Your account role has read-only work-order access.');
          return;
        }

    if (mode === 'LIVE') {
      const requestId = modeRequest.current;
      liveApi.updateWorkOrder(workOrderId, { status: newStatus }).then(() => refreshOperational(requestId)).catch(error => { if (requestId === modeRequest.current) setModeError(error.message); });
      return;
    }

    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== workOrderId) return wo;
        const resolvedAt = newStatus === 'RESOLVED' ? new Date().toISOString() : wo.resolvedAt;
        return {
          ...wo,
          status: newStatus,
          resolvedAt
        };
      })
    );

    // If resolving, restore asset health if it was linked
    addNotice({ type: 'WORK_ORDER', title: newStatus === 'RESOLVED' ? 'Work order resolved' : 'Work order updated', message: `${workOrderId}: ${newStatus}`, workOrderId });
    if (newStatus === 'RESOLVED') {
      const targetWo = workOrders.find((w) => w.id === workOrderId);
      if (targetWo) {
        resetAssetToBaseline(targetWo.assetId);
      }
    }
  };

  const createWorkOrder = async (input: { assetId: string; title: string; priority: WorkOrderSeverity; owner?: string; due?: string; description?: string; recommendedAction?: string }) => {
        if (!canPerform(userRole, 'createWorkOrder')) {
          setModeError('Your account role does not have permission to create work orders.');
          throw new Error('Your account role does not have permission to create work orders.');
        }

    if (mode === 'LIVE') {
      const requestId = modeRequest.current;
      const created = await liveApi.createWorkOrder(input);
      if (requestId !== modeRequest.current) return;
      setWorkOrders((previous) => [mapLiveWorkOrders([created], assets)[0], ...previous]);
      return;
    }

    const asset = assets.find((item) => item.id === input.assetId);
    if (!asset) throw new Error('Select a valid asset.');
    setWorkOrders((previous) => [{
      id: `WO-${Date.now().toString().slice(-4)}`,
      assetId: asset.id,
      assetName: asset.name,
      severity: input.priority,
      status: 'SCHEDULED',
      title: input.title,
      assignedTechnician: input.owner || 'Unassigned',
      createdAt: new Date().toISOString(),
      description: input.description, aiRootCause: input.recommendedAction, autoGenerated: false
    }, ...previous]);
    addNotice({ type: 'WORK_ORDER', title: 'Work order created', message: input.title, assetId: asset.id });
  };

  const reorderInventoryPart = (partId: string, quantity: number) => {
    if (!canPerform(userRole, 'reorderInventory')) { setModeError('Your role has read-only inventory access.'); return; }
    if (!Number.isInteger(quantity) || quantity < 1) { setModeError('Enter a positive integer quantity.'); return; }
    const requestId = modeRequest.current;
    if (mode === 'LIVE') { liveApi.reorderPart(partId, quantity).then(() => refreshOperational(requestId)).catch(error => { if (requestId === modeRequest.current) setModeError(error.message); }); return; }
    const part = snapshotRef.current.parts.find(p => p.id === partId);
    if (!part) return;
    setSupplierOrders(prev => prev.some(o => o.part_id === partId && o.status === 'SUGGESTED') ? prev : [{ id: crypto.randomUUID(), part_id: partId, supplier_id: part.supplierId, quantity, estimated_cost: quantity * (part.unitCost ?? 0), status: 'SUGGESTED', created_at: new Date().toISOString() }, ...prev]);
    addNotice({ type: 'INVENTORY', title: 'Supplier reorder suggested', message: `${quantity} units of ${part.name}; procurement review required`, partId });
  };
  const adjustInventoryPart = async (partId: string, delta: number, workOrderId?: string) => {
    if (!canPerform(userRole, workOrderId ? 'updateWorkOrder' : 'reorderInventory')) throw new Error('Your role cannot change stock.');
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) throw new Error('Enter a nonzero integer quantity within 100000.');
    const part = snapshotRef.current.parts.find(p => p.id === partId);
    if (!part || part.quantityOnHand + delta < 0) throw new Error('Insufficient stock or unknown part.');
    const wo = snapshotRef.current.workOrders.find(w => w.id === workOrderId);
    if (workOrderId && (!wo || wo.status === 'RESOLVED' || !(part.compatibleAssets ?? []).includes(wo.assetId) || delta > 0)) throw new Error('Select an open work order compatible with this part.');
    const requestId = modeRequest.current;
    if (mode === 'LIVE') { if (workOrderId) await liveApi.consumePart(partId, -delta, workOrderId); else await liveApi.adjustPart(partId, delta); await refreshOperational(requestId); return; }
    setParts(prev => prev.map(p => p.id === partId ? { ...p, quantityOnHand: p.quantityOnHand + delta } : p));
    snapshotRef.current.parts = snapshotRef.current.parts.map(p => p.id === partId ? { ...p, quantityOnHand: p.quantityOnHand + delta } : p);
    setStockMovements(prev => [{ id: crypto.randomUUID(), part_id: partId, quantity_delta: delta, reason: workOrderId ? 'WORK_ORDER' : 'ADJUSTMENT', work_order_id: workOrderId, created_at: new Date().toISOString() }, ...prev]);
    addNotice({ type: 'INVENTORY', title: 'Stock movement', message: `${part.name}: ${delta}`, partId, workOrderId });
    if (part.quantityOnHand + delta <= part.reorderLevel) reorderInventoryPart(partId, Math.max(1, part.reorderLevel * 2 - (part.quantityOnHand + delta)));
  };
  const loadPartMovements = async (id: string) => { if (mode !== 'LIVE') return; const requestId = modeRequest.current; const movements = await liveApi.movements(id); if (requestId === modeRequest.current) setStockMovements(movements); };
  const assignWorkOrder = async (id: string, owner: string) => {
    if (!canPerform(userRole, 'updateWorkOrder')) throw new Error('Your role cannot assign work orders.');
    if (!owner.trim()) throw new Error('Worker name is required.');
    const requestId = modeRequest.current;
    if (mode === 'LIVE') { await liveApi.updateWorkOrder(id, { owner, status: 'ASSIGNED' }); await refreshOperational(requestId); return; }
    setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, assignedTechnician: owner, status: 'ASSIGNED' } : w));
    addNotice({ type: 'WORK_ORDER', title: 'Work order assigned', message: `${id}: ${owner}`, workOrderId: id });
  };
  const callAi = async (action: 'diagnose' | 'analyze' | 'forecast' | 'draft-work-order', assetId: string, question: string) => {
    if (!canPerform(userRole, 'diagnose')) throw new Error('Your role does not have access to AI diagnostics.');
    const requestId = modeRequest.current;
    const response = await liveApi.ai(action, assetId, question, mode, { asset: assets.find(a => a.id === assetId), workOrders: workOrders.filter(w => w.assetId === assetId), alarms: assets.find(a => a.id === assetId)?.sensors.filter(s => s.criticalThreshold !== undefined && (s.currentValue - s.baseline!) / (s.criticalThreshold - s.baseline!) >= .65) });
    if (requestId !== modeRequest.current) throw new Error('Mode changed; this result was discarded.');
    return response;
  };
  const runAi = (action: 'analyze' | 'forecast' | 'draft-work-order', assetId: string, question: string) => callAi(action, assetId, question);
  const runAiDiagnosticQuery = async (assetId: string, question: string) => {
    const result = await callAi('diagnose', assetId, question);
    return { answer: result.answer ?? '', sources: [] as RagDocumentChunk[], sourceLabels: result.sources };
  };

  const markNotificationRead = (id: string) => {
    if (mode === 'LIVE') { const requestId = modeRequest.current; liveApi.readNotification(id).then(() => refreshOperational(requestId)).catch(error => setModeError(error.message)); return; }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    if (mode === 'LIVE') { const requestId = modeRequest.current; liveApi.clearNotifications().then(() => refreshOperational(requestId)).catch(error => setModeError(error.message)); return; }
    setNotifications([]);
  };

  const switchMode = async (nextMode: AppMode, authenticatedUser?: LiveUserDto) => {
    if (nextMode === 'SIMULATION' && !currentUser) {
      setRequiresSignIn(true);
      setModeError('Sign in is required to access Simulation mode.');
      setAssets([]); setWorkOrders([]); setParts([]); setSuppliers([]);
      setNotifications([]); setAuditLogs([]); setStockMovements([]); setSupplierOrders([]);
      return;
    }
    const requestId = ++modeRequest.current;
    setModeError(null);
    setRequiresSignIn(false);
    setTelemetryConnected(false);
    setActiveOverride(null);
    setRecentSelfHealingEvent(null);
    setMode(nextMode);
    setNotifications([]); setStockMovements([]); setSupplierOrders([]);
    autoTriggerCooldownRef.current = {}; activeAlarmRef.current = {};
    if (nextMode === 'SIMULATION') {
      setIsSwitchingMode(false);
      simulationSeed.current = SIMULATION_SEED;
      setUserRole('RELIABILITY_ENGINEER');
      setDashboardSummary(null);
      setAssets(structuredClone(INITIAL_ASSETS));
      setWorkOrders(structuredClone(INITIAL_WORK_ORDERS));
      setParts(structuredClone(INITIAL_PARTS));
      setSuppliers(structuredClone(INITIAL_SUPPLIERS));
      setAuditLogs([]);
      return;
    }

    // Never label mock data as live while authenticating or recovering a connection.
    setAssets([]);
    setWorkOrders([]);
    setParts([]);
    setSuppliers([]);
    setAuditLogs([]);
    setNotifications([]);
    setDashboardSummary(null);
    setIsSwitchingMode(true);
    try {
      const user = authenticatedUser ?? await liveApi.getCurrentUser();
      if (requestId !== modeRequest.current) return;
      setCurrentUser(user);
      setUserRole(normalizeUserRole(user.role));
      const snapshot = await liveApi.getSnapshot();
      if (requestId !== modeRequest.current) return;
      if (snapshot.assets.length === 0) throw new Error('The live services returned no assets.');
      const liveAssets = mapLiveAssets(snapshot.assets);
      if (!liveAssets.length) throw new Error('The live services returned no valid telemetry.');
      const liveSuppliers = mapLiveSuppliers(snapshot.suppliers);
      stabilizer.current.seed(liveAssets);
      setAssets(liveAssets);
      setWorkOrders(mapLiveWorkOrders(snapshot.workOrders, liveAssets));
      setSuppliers(liveSuppliers);
      setParts(mapLiveParts(snapshot.parts, liveSuppliers));
      await refreshOperational(requestId);
    } catch (error) {
      if (requestId !== modeRequest.current) return;
      const message = error instanceof TypeError
        ? 'Unable to reach the Spring Boot gateway. Check that the live services are running.'
        : error instanceof Error ? error.message : 'Unable to connect to the live services.';
      const signInRequired = message.toLowerCase().includes('sign in is required');
      setRequiresSignIn(signInRequired);
      if (signInRequired) { setCurrentUser(null); setUserRole('VIEWER'); }
      setModeError(message);
    } finally {
      if (requestId === modeRequest.current) setIsSwitchingMode(false);
    }
  };

  // Restore cookie-backed sessions on reload. Simulation requires explicit selection.
  useEffect(() => {
    void switchMode('LIVE');
    return () => { ++modeRequest.current; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const user = await liveApi.login(email, password);
      await switchMode('LIVE', user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed.';
      setModeError(message);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const user = await liveApi.register(name, email, password);
      await switchMode('LIVE', user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account creation failed.';
      setModeError(message);
      throw error;
    }
  };

  const signOut = async () => {
    ++modeRequest.current;
    setCurrentUser(null);
    setActiveOverride(null); setRecentSelfHealingEvent(null);
    setAssets([]); setWorkOrders([]); setParts([]); setSuppliers([]);
    setAuditLogs([]); setNotifications([]); setStockMovements([]); setSupplierOrders([]);
    autoTriggerCooldownRef.current = {}; activeAlarmRef.current = {};
    setModeError(null);
    let logoutError: string | null = null;
    try {
      await liveApi.logout();
    } catch (error) {
      logoutError = error instanceof Error ? error.message : 'Sign out failed.';
    }
    setCurrentUser(null);
    ++modeRequest.current;
    setMode('LIVE');
    setAssets([]);
    setWorkOrders([]);
    setParts([]);
    setSuppliers([]);
    setAuditLogs([]);
    setNotifications([]);
    setDashboardSummary(null);
    setUserRole('VIEWER');
    setTelemetryConnected(false);
    setRequiresSignIn(true);
    setIsSwitchingMode(false);
    if (logoutError) setModeError(logoutError);
  };

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
  };

  return (
    <SimulationContext.Provider
      value={{
        mode,
        modeError,
        requiresSignIn,
        isSwitchingMode,
        telemetryConnected,
        currentUser,
        dashboardSummary,
        assets,
        workOrders,
        parts,
        suppliers,
        auditLogs,
        notifications,
        userRole,
        isSimulating,
        activeOverride,
        recentSelfHealingEvent,
        setUserRole,
        switchMode,
        signIn,
          register,
        signOut,
        toggleSimulation,
        applyOverride,
        resetAssetToBaseline,
        resetFleet,
        triggerFailurePreset,
        dismissSelfHealingEvent,
        updateWorkOrderStatus,
        createWorkOrder,
        reorderInventoryPart,
        runAiDiagnosticQuery,
        markNotificationRead,
        clearAllNotifications, runAi, adjustInventoryPart, assignWorkOrder, stockMovements, supplierOrders, loadPartMovements
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
