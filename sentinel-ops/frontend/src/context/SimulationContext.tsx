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
import { captureSimulationRecords, evaluateSimulationFleet, failureReading } from '../services/simulationWorkflow';
import { ApiError, liveApi, LiveDashboardSummary, LiveUserDto, TelemetryMessage, AiResult } from '../services/liveApi';
import { mapLiveAssets, mapLiveParts, mapLiveSuppliers, mapLiveWorkOrders } from '../services/domainAdapters';
import { canPerform } from '../services/accessControl';
import { TelemetryStabilizer, TELEMETRY_CONFIG } from '../services/telemetryStabilizer';

export type AppMode = 'SIMULATION' | 'LIVE';

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
  reorderInventoryPart: (partId: string, quantity: number) => Promise<void>;
  runAiDiagnosticQuery: (assetId: string, userQuery: string) => Promise<{
    answer: string;
    sources: RagDocumentChunk[];
    sourceLabels?: string[];
    auditEntry?: AiAuditLog;
  }>;
  runAi: (action: 'chat' | 'analyze' | 'forecast' | 'draft-work-order', assetId: string, question: string) => Promise<AiResult>;
  adjustInventoryPart: (partId: string, delta: number, workOrderId?: string) => Promise<void>;
  assignWorkOrder: (id: string, owner: string) => Promise<void>;
  simulationSessionId: string;
  alarms: Record<string, unknown>[];
  receiveSupplierOrder: (id: string) => Promise<void>;
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

  const [simulationSessionId,setSimulationSessionId]=useState(()=>crypto.randomUUID());
  const [alarms,setAlarms]=useState<Record<string, unknown>[]>([]);
  const [stockMovements, setStockMovements] = useState<Record<string, unknown>[]>([]);
  const [supplierOrders, setSupplierOrders] = useState<Record<string, unknown>[]>([]);
  const ordersRef = useRef(workOrders);
  ordersRef.current = workOrders;
  const snapshotRef = useRef({ assets, workOrders, parts });
  snapshotRef.current = { assets, workOrders, parts };
  const addNotice = (notice: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => { const next=[{ ...notice, id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false }, ...noticesRef.current]; noticesRef.current=next; setNotifications(next); };
  const refreshOperational = async (requestId = modeRequest.current) => {
    const [snapshot, notices, reorders, incidents, movements] = await Promise.all([liveApi.getSnapshot(), liveApi.notifications(), liveApi.supplierOrders(), liveApi.alarms(), liveApi.allMovements()]);
    if (requestId !== modeRequest.current) return;
    const fleet = mapLiveAssets(snapshot.assets);
    const directory = mapLiveSuppliers(snapshot.suppliers);
    setAlarms(incidents);setStockMovements(movements);
    setWorkOrders(mapLiveWorkOrders(snapshot.workOrders, fleet));
    setParts(mapLiveParts(snapshot.parts, directory)); setSuppliers(directory); setSupplierOrders(reorders);
    setNotifications(notices.map(n => ({ id: String(n.id), timestamp: String(n.created_at), type: n.type as NotificationItem['type'], title: String(n.title), message: String(n.message), assetId: n.asset_id ? String(n.asset_id) : undefined, workOrderId: n.work_order_id ? String(n.work_order_id) : undefined, partId: n.part_id ? String(n.part_id) : undefined, read: Boolean(n.is_read) })));
  };

  // Keep track of which asset triggers have already generated an open ticket to prevent duplicate spam

  const virtualBaseline = useRef<{assets:Asset[];workOrders:WorkOrder[];parts:InventoryPart[];suppliers:Supplier[];alarms:Record<string,unknown>[];notifications:NotificationItem[];supplierOrders:Record<string,unknown>[];stockMovements:Record<string,unknown>[]}|null>(null);
  const incidentsRef=useRef(alarms); incidentsRef.current=alarms;
  const noticesRef=useRef(notifications); noticesRef.current=notifications;
  const evaluateVirtual=(nextAssets:Asset[],now=Date.now())=>{
    const result=evaluateSimulationFleet(nextAssets,incidentsRef.current,ordersRef.current,noticesRef.current,now);
    snapshotRef.current.assets=result.assets; snapshotRef.current.workOrders=result.workOrders;
    ordersRef.current=result.workOrders; incidentsRef.current=result.alarms; noticesRef.current=result.notifications;
    setAssets(result.assets);setWorkOrders(result.workOrders);setAlarms(result.alarms);setNotifications(result.notifications);
  };
  // Unchanged virtual readings stay at the captured LIVE values. Held tests relax back after expiry.
  useEffect(()=>{
    if(!currentUser||mode!=='SIMULATION'||!isSimulating||isSwitchingMode)return;
    const interval=window.setInterval(()=>{
      const now=Date.now(); const held=activeOverride&&now<activeOverride.expiresAt?activeOverride:null;
      if(activeOverride&&!held)setActiveOverride(null);
      const next=snapshotRef.current.assets.map(asset=>({...asset,sensors:asset.sensors.map(sensor=>{
        const captured=virtualBaseline.current?.assets.find(a=>a.id===asset.id)?.sensors.find(s=>s.id===sensor.id)?.currentValue ?? sensor.currentValue;
        const value=held&&held.assetId===asset.id&&held.sensorId===sensor.id?held.value:Number((sensor.currentValue+(captured-sensor.currentValue)*.08).toFixed(4));
        return {...sensor,currentValue:value,rawValue:value,history:[...sensor.history.slice(-29),value]};
      })}));
      evaluateVirtual(next,now);
    },2000);
    return()=>window.clearInterval(interval);
  },[mode,currentUser,isSimulating,activeOverride,isSwitchingMode]);

  useEffect(() => {
    if (mode !== 'LIVE' || !currentUser || isSwitchingMode) return;
    let stopped = false;
    const liveScope=modeRequest.current;
    let socketConnected = false;
    const disconnect = liveApi.connectTelemetry((message: TelemetryMessage) => {
      if(stopped||liveScope!==modeRequest.current)return;
      const alert = stabilizer.current.ingest(message);
      if (alert) setAssets(previous => previous.map(asset => asset.id === message.machineId
        ? { ...asset, status: alert, healthScore: alert === 'DOWN'
          ? Math.min(asset.healthScore, message.healthScore) : asset.healthScore } : asset));
    }, connected => {
      socketConnected = connected;
      setTelemetryConnected(connected);
    });
    const displayTimer = window.setInterval(() => {
      if(stopped||liveScope!==modeRequest.current)return;
      setAssets(previous => stabilizer.current.flush(previous));
      setTelemetryConnected(socketConnected && stabilizer.current.isFresh());
    }, TELEMETRY_CONFIG.displayIntervalMs);
    // Reconcile persistent incidents and inventory with the selected LIVE session.
    let pollTimer: number;
    const poll = async () => {
      let nextPollMs = 15000;
      try {
        const rows = await liveApi.getAssets();
        if (stopped || liveScope!==modeRequest.current) return;
        for (const row of rows) {
          for (const sensor of row.sensors ?? []) {
            stabilizer.current.ingest({ machineId: row.id, sensorType: sensor.type, sensorId: sensor.id, value: sensor.currentValue, healthScore: row.health, status: row.status, recordedAt: row.lastSeenAt ?? '', source: row.telemetrySource });
          }
        }
        await refreshOperational(liveScope);
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) nextPollMs = Math.max(15000, error.retryAfterMs);
        else if (!stopped && error instanceof Error) setModeError(error.message);
      } finally {
        if (!stopped) pollTimer = window.setTimeout(poll, nextPollMs);
      }
    };
    pollTimer = window.setTimeout(poll, 15000);
    return () => {
      stopped = true;
      disconnect();
      window.clearInterval(displayTimer);
      window.clearTimeout(pollTimer);
      setTelemetryConnected(false);
    };
  }, [mode, currentUser, isSwitchingMode]);

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

    if (mode === 'LIVE') { setModeError('Switch to Simulation to change test readings.'); return; }

    const target=snapshotRef.current.assets.find(a=>a.id===assetId)?.sensors.find(sensor=>sensor.id===sensorId);
    if(!target||!Number.isFinite(value)||!Number.isFinite(holdSeconds)||holdSeconds<1||holdSeconds>3600){setModeError('Choose a valid sensor, finite reading, and duration between 1 and 3600 seconds.');return;}
    setModeError(null);
    evaluateVirtual(snapshotRef.current.assets.map(asset=>asset.id===assetId?{...asset,sensors:asset.sensors.map(sensor=>sensor.id===sensorId?{...sensor,currentValue:value,rawValue:value,history:[...sensor.history.slice(-29),value]}:sensor)}:asset));
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

    if (mode === 'LIVE') { setModeError('Machine resets are available in Simulation only.'); return; }

    setActiveOverride(null);
    const restored=snapshotRef.current.assets.map(asset=>asset.id===assetId?{...asset,sensors:asset.sensors.map(sensor=>({...sensor,currentValue:sensor.baseline??sensor.currentValue,rawValue:sensor.baseline??sensor.currentValue,history:[...sensor.history.slice(-29),sensor.baseline??sensor.currentValue]}))}:asset);
    evaluateVirtual(restored);
  };

  const resetFleet=()=>{
    if(mode!=='SIMULATION'||!canPerform(userRole,'reset')||!virtualBaseline.current)return;
    const snapshot=structuredClone(virtualBaseline.current);setActiveOverride(null);setRecentSelfHealingEvent(null);setAuditLogs([]);
    snapshotRef.current={assets:snapshot.assets,workOrders:snapshot.workOrders,parts:snapshot.parts};ordersRef.current=snapshot.workOrders;incidentsRef.current=snapshot.alarms;noticesRef.current=snapshot.notifications;
    setAssets(snapshot.assets);setWorkOrders(snapshot.workOrders);setParts(snapshot.parts);setSuppliers(snapshot.suppliers);setAlarms(snapshot.alarms);setNotifications(snapshot.notifications);setSupplierOrders(snapshot.supplierOrders);setStockMovements(snapshot.stockMovements);setModeError(null);
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

    try {
      const preset=({CNC_SPINDLE:['ast-sinumerik-01','Vibration'],HYDRAULIC_BURST:['ast-hydraulic-04','Pressure'],INVERTER_MELTDOWN:['ast-sinamics-03','Temperature']} as const)[presetType];
      const reading=failureReading(snapshotRef.current.assets.find(asset=>asset.id===preset[0]),preset[1]);
      applyOverride(reading.assetId,reading.sensorId,reading.value,60,reading.description);
    }catch(error){setModeError(error instanceof Error?error.message:'Failure test unavailable.');}
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

    const updated=ordersRef.current.map(order=>order.id===workOrderId?{...order,status:newStatus,resolvedAt:newStatus==='RESOLVED'?new Date().toISOString():undefined}:order);
    ordersRef.current=updated;snapshotRef.current.workOrders=updated;setWorkOrders(updated);

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
    if(!input.title.trim()||input.title.trim().length>200||(input.owner??'').length>80)throw new Error('Enter a title of up to 200 characters and a worker name of up to 80 characters.');
    const order:WorkOrder={id:`WO-${crypto.randomUUID().slice(0,12)}`,assetId:asset.id,assetName:asset.name,severity:input.priority,status:'SCHEDULED',title:input.title.trim(),assignedTechnician:input.owner?.trim()||'Unassigned',createdAt:new Date().toISOString(),description:input.description,aiRootCause:input.recommendedAction,autoGenerated:false};
    const updated=[order,...ordersRef.current];ordersRef.current=updated;snapshotRef.current.workOrders=updated;setWorkOrders(updated);
    addNotice({type:'WORK_ORDER',title:'Work order created',message:order.title,assetId:asset.id,workOrderId:order.id});
  };

  const reorderInventoryPart = async (partId: string, quantity: number) => {
    if (!canPerform(userRole, 'reorderInventory')) throw new Error('Your role has read-only inventory access.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error('Enter an integer quantity between 1 and 100000.');
    const requestId = modeRequest.current;
    if (mode === 'LIVE') { await liveApi.reorderPart(partId, quantity); await refreshOperational(requestId); return; }
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
    if (part.quantityOnHand + delta <= part.reorderLevel) {
      const quantity = Math.max(1, part.reorderLevel * 2 - (part.quantityOnHand + delta));
      setSupplierOrders(prev => prev.some(o => o.part_id === partId && o.status === 'SUGGESTED') ? prev : [{ id: crypto.randomUUID(), part_id: partId, supplier_id: part.supplierId, quantity, estimated_cost: quantity * (part.unitCost ?? 0), status: 'SUGGESTED', created_at: new Date().toISOString() }, ...prev]);
      addNotice({type:'INVENTORY',title:'Supplier reorder suggested',message:`${quantity} units of ${part.name}; procurement review required`,partId});
    }
  };
  const receiveSupplierOrder=async(id:string)=>{
    if(!canPerform(userRole,'reorderInventory'))throw new Error('Your role cannot receive stock.');
    const requestId=modeRequest.current;
    if(mode==='LIVE'){await liveApi.receiveOrder(id);await refreshOperational(requestId);return;}
    const order=supplierOrders.find(o=>String(o.id)===id);
    if(!order||order.status==='RECEIVED')return;
    if(!snapshotRef.current.parts.some(p=>p.id===String(order.part_id))||!Number.isInteger(Number(order.quantity))||Number(order.quantity)<1)throw new Error('Invalid supplier order or missing part.');
    setSupplierOrders(prev=>prev.map(o=>String(o.id)===id?{...o,status:'RECEIVED'}:o));
    await adjustInventoryPart(String(order.part_id),Number(order.quantity));
  };
  const loadPartMovements = async (id: string) => { if (mode !== 'LIVE') return; const requestId = modeRequest.current; const movements = await liveApi.movements(id); if (requestId === modeRequest.current) setStockMovements(previous=>[...previous.filter(m=>m.part_id!==id),...movements]); };
  const assignWorkOrder = async (id: string, owner: string) => {
    if (!canPerform(userRole, 'updateWorkOrder')) throw new Error('Your role cannot assign work orders.');
    if (!owner.trim()) throw new Error('Worker name is required.');
    const requestId = modeRequest.current;
    if (mode === 'LIVE') { await liveApi.updateWorkOrder(id, { owner, status: 'ASSIGNED' }); await refreshOperational(requestId); return; }
    if(owner.trim().length>80)throw new Error('Worker name must be at most 80 characters.');
    const updated=ordersRef.current.map(w=>w.id===id?{...w,assignedTechnician:owner.trim(),status:'ASSIGNED' as const}:w);ordersRef.current=updated;snapshotRef.current.workOrders=updated;setWorkOrders(updated);
    addNotice({ type: 'WORK_ORDER', title: 'Work order assigned', message: `${id}: ${owner}`, workOrderId: id });
  };
  const callAi = async (action: 'chat' | 'diagnose' | 'analyze' | 'forecast' | 'draft-work-order', assetId: string, question: string) => {
    if (!canPerform(userRole, 'diagnose')) throw new Error('Your role does not have access to AI diagnostics.');
    const requestId = modeRequest.current;
    const response = await liveApi.ai(action, assetId, question, mode, { asset: assets.find(a => a.id === assetId), workOrders: workOrders.filter(w => w.assetId === assetId), alarms: assets.find(a => a.id === assetId)?.sensors.filter(s => s.criticalThreshold !== undefined && (s.currentValue - s.baseline!) / (s.criticalThreshold - s.baseline!) >= .65) }, simulationSessionId);
    if (requestId !== modeRequest.current) throw new Error('Mode changed; this result was discarded.');
    return response;
  };
  const runAi = (action: 'chat' | 'analyze' | 'forecast' | 'draft-work-order', assetId: string, question: string) => callAi(action, assetId, question);
  const runAiDiagnosticQuery = async (assetId: string, question: string) => {
    const result = await callAi('diagnose', assetId, question);
    return { answer: result.answer ?? '', sources: [] as RagDocumentChunk[], sourceLabels: result.sources };
  };

  const markNotificationRead = (id: string) => {
    if (mode === 'LIVE') { const requestId = modeRequest.current; liveApi.readNotification(id).then(() => refreshOperational(requestId)).catch(error => setModeError(error.message)); return; }
    const updated=noticesRef.current.map(n=>n.id===id?{...n,read:true}:n);noticesRef.current=updated;setNotifications(updated);
  };

  const clearAllNotifications = () => {
    if (mode === 'LIVE') { const requestId = modeRequest.current; liveApi.clearNotifications().then(() => refreshOperational(requestId)).catch(error => setModeError(error.message)); return; }
    noticesRef.current=[];setNotifications([]);
  };

  const switchMode = async (nextMode: AppMode, authenticatedUser?: LiveUserDto) => {
    if (nextMode === 'SIMULATION' && !currentUser) {
      setRequiresSignIn(true);
      setModeError('Sign in is required to access Simulation mode.');
      setAssets([]); setWorkOrders([]); setParts([]); setSuppliers([]);
      setNotifications([]); setAuditLogs([]); setStockMovements([]); setSupplierOrders([]);
      return;
    }
    const captured=nextMode==='SIMULATION'?captureSimulationRecords({assets:snapshotRef.current.assets,workOrders:snapshotRef.current.workOrders,parts:snapshotRef.current.parts,suppliers,alarms,notifications,supplierOrders,stockMovements}):null;
    if(nextMode==='SIMULATION'&&!captured?.assets.length){setModeError('Wait for LIVE machinery records before starting a virtual copy.');return;}
    if (mode === 'SIMULATION') void liveApi.resetSimulationDocuments(simulationSessionId).catch(()=>{});
    setSimulationSessionId(crypto.randomUUID());
    const requestId = ++modeRequest.current;
    setModeError(null);
    setRequiresSignIn(false);
    setTelemetryConnected(false);
    setActiveOverride(null);
    setRecentSelfHealingEvent(null);
    setMode(nextMode);
    setNotifications([]); setStockMovements([]); setSupplierOrders([]);
    setAlarms([]);
    if (nextMode === 'SIMULATION' && captured) {
      virtualBaseline.current=structuredClone(captured);
      snapshotRef.current={assets:captured.assets,workOrders:captured.workOrders,parts:captured.parts};ordersRef.current=captured.workOrders;incidentsRef.current=captured.alarms;noticesRef.current=captured.notifications;
      setIsSwitchingMode(false);setUserRole('RELIABILITY_ENGINEER');setIsSimulating(true);setDashboardSummary(null);
      setAssets(captured.assets);setWorkOrders(captured.workOrders);setParts(captured.parts);setSuppliers(captured.suppliers);setAlarms(captured.alarms);setNotifications(captured.notifications);setSupplierOrders(captured.supplierOrders);setStockMovements(captured.stockMovements);setAuditLogs([]);
      return;
    }
    virtualBaseline.current=null;

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
    if(mode==='SIMULATION')void liveApi.resetSimulationDocuments(simulationSessionId).catch(()=>{});
    setSimulationSessionId(crypto.randomUUID());
    setCurrentUser(null);
    setActiveOverride(null); setRecentSelfHealingEvent(null);
    setAssets([]); setWorkOrders([]); setParts([]); setSuppliers([]);
    setAuditLogs([]); setNotifications([]); setStockMovements([]); setSupplierOrders([]);
    setAlarms([]);
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
        clearAllNotifications, simulationSessionId, alarms, receiveSupplierOrder, runAi, adjustInventoryPart, assignWorkOrder, stockMovements, supplierOrders, loadPartMovements
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
