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
  INITIAL_AUDIT_LOGS,
  RAG_DOCUMENTS
} from '../data/mockData';
import { liveApi, LiveDashboardSummary, LiveUserDto, TelemetryMessage } from '../services/liveApi';
import { mapLiveAssets, mapLiveParts, mapLiveSuppliers, mapLiveWorkOrders } from '../services/domainAdapters';
import { canPerform } from '../services/accessControl';

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
  createWorkOrder: (input: { assetId: string; title: string; priority: WorkOrderSeverity; owner?: string; due?: string }) => Promise<void>;
  reorderInventoryPart: (partId: string, quantity: number) => void;
  runAiDiagnosticQuery: (assetId: string, userQuery: string) => Promise<{
    answer: string;
    sources: RagDocumentChunk[];
    sourceLabels?: string[];
    auditEntry?: AiAuditLog;
  }>;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('SIMULATION');
  const [modeError, setModeError] = useState<string | null>(null);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [telemetryConnected, setTelemetryConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<LiveUserDto | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<LiveDashboardSummary | null>(null);
  const simulationSeed = useRef(SIMULATION_SEED);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [parts, setParts] = useState<InventoryPart[]>(INITIAL_PARTS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [auditLogs, setAuditLogs] = useState<AiAuditLog[]>(INITIAL_AUDIT_LOGS);
  const [userRole, setUserRole] = useState<UserRole>('RELIABILITY_ENGINEER');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [activeOverride, setActiveOverride] = useState<OverrideState | null>(null);
  const [recentSelfHealingEvent, setRecentSelfHealingEvent] = useState<SelfHealingEvent | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-init-1',
      timestamp: 'Just now',
      type: 'ALERT',
      title: 'Siemens SINUMERIK Live Telemetry Streaming',
      message: 'Edge gateway channel verified. High frequency vibration sensors online.',
      read: false
    }
  ]);

  // Keep track of which asset triggers have already generated an open ticket to prevent duplicate spam
  const autoTriggerCooldownRef = useRef<Record<string, number>>({});

  // Simulation loop tick every 2000ms
  useEffect(() => {
    if (!isSimulating || mode !== 'SIMULATION') return;

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
              const currentDistance = Math.abs(newValue - (sensor.baseline ?? newValue));
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
            if (now - lastTriggerTime > 15000) {
              // 15 sec cooldown per asset
              autoTriggerCooldownRef.current[asset.id] = now;
              triggerClosedLoopSelfHealing(asset, triggeredSensorInfo, updatedSensors);
            }
          }

          return {
            ...asset,
            healthScore: Number(newHealthScore.toFixed(1)),
            status: newStatus,
            sensors: updatedSensors
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, activeOverride, mode]);

  useEffect(() => {
    if (mode !== 'LIVE') return;

    return liveApi.connectTelemetry((message: TelemetryMessage) => {
      setAssets((previous) => previous.map((asset) => {
        if (asset.id !== message.machineId) return asset;
        const updatedSensors = asset.sensors.map((sensor) => {
          if (sensor.type.toLowerCase() !== message.sensorType.toLowerCase()) return sensor;
          return {
            ...sensor,
            currentValue: message.value,
            history: [...sensor.history.slice(-29), message.value]
          };
        });
        const status = message.status.toLowerCase();
        return {
          ...asset,
          healthScore: message.healthScore,
          status: status === 'fault' ? 'DOWN' : status === 'warning' ? 'DEGRADED' : 'HEALTHY',
          sensors: updatedSensors
        };
      }));
    }, setTelemetryConnected);
  }, [mode]);

  // Self-healing automated closed-loop logic
  const triggerClosedLoopSelfHealing = (
    asset: Asset,
    sensorInfo: { name: string; value: number; threshold: number; unit: string },
    currentSensors: Asset['sensors']
  ) => {
    const ticketNum = Math.floor(1040 + nextSeededValue(simulationSeed) * 890);
    const workOrderId = `WO-${ticketNum}`;
    const timestamp = new Date().toISOString();

    // Determine compatible spare part
    const matchingPart = parts.find((p) => (p.compatibleAssets ?? []).includes(asset.id)) || parts[0];

    // Failure probability calculation
    const failureProb = Number((0.91 + nextSeededValue(simulationSeed) * 0.08).toFixed(3));

    // 1. Create Work Order
    const newWorkOrder: WorkOrder = {
      id: workOrderId,
      assetId: asset.id,
      assetName: asset.name,
      severity: 'CRITICAL',
      status: 'AUTO_GENERATED',
      title: `Emergency Repair: ${sensorInfo.name} Anomaly Threshold Exceeded`,
      description: `Autonomous Self-Healing Loop triggered: ${sensorInfo.name} reached ${sensorInfo.value} ${sensorInfo.unit} (threshold: ${sensorInfo.threshold} ${sensorInfo.unit}). AI Failure prediction model flags imminent physical breakdown within 4 operating hours.`,
      aiRootCause: `Predictive spectral harmonic anomaly detected on ${sensorInfo.name}. Pre-emptive replacement initiated to avert unrecoverable machine damage.`,
      aiConfidence: failureProb,
      partRequired: matchingPart.name,
      partId: matchingPart.id,
      partReserved: true,
      assignedTechnician: asset.assignedEngineer || 'Marcus Keller (On Call)',
      createdAt: timestamp,
      autoGenerated: true
    };

    setWorkOrders((prev) => [newWorkOrder, ...prev]);

    // 2. Reserve part in inventory
    setParts((prevParts) =>
      prevParts.map((p) => {
        if (p.id === matchingPart.id && p.quantityOnHand > 0) {
          return { ...p, quantityOnHand: p.quantityOnHand - 1 };
        }
        return p;
      })
    );

    // 3. Log into AI Audit trail (analysis_results)
    const sensorVector: Record<string, number> = {};
    currentSensors.forEach((s) => {
      sensorVector[s.name] = s.currentValue;
    });

    const newAuditLog: AiAuditLog = {
      id: `log-ai-${Math.floor(8900 + nextSeededValue(simulationSeed) * 1000)}`,
      timestamp,
      assetId: asset.id,
      assetName: asset.name,
      modelVersion: 'gpt-4o-mini-ft-industrial-v2.1',
      inputSensorVector: sensorVector,
      failureProbability: failureProb,
      recommendedAction: `Autonomous WO dispatch & part allocation (${matchingPart.sku})`,
      triggeredWorkOrderId: workOrderId,
      executionTimeMs: Math.floor(95 + nextSeededValue(simulationSeed) * 45)
    };

    setAuditLogs((prev) => [newAuditLog, ...prev]);

    // 4. Set recent banner event for operator notification
    const healingEvent: SelfHealingEvent = {
      id: `sh-evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      assetId: asset.id,
      assetName: asset.name,
      triggerSensor: sensorInfo.name,
      triggerValue: sensorInfo.value,
      thresholdValue: sensorInfo.threshold,
      unit: sensorInfo.unit,
      failureProbability: failureProb,
      generatedWorkOrderId: workOrderId,
      allocatedPartName: matchingPart.name
    };

    setRecentSelfHealingEvent(healingEvent);

    // 5. Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: 'Just now',
        type: 'HEALED',
        title: `Self-Healing Triggered: ${asset.name}`,
        message: `${sensorInfo.name} at ${sensorInfo.value} ${sensorInfo.unit} exceeded threshold. Work order ${workOrderId} auto-generated.`,
        assetId: asset.id,
        workOrderId,
        read: false
      },
      ...prev
    ]);
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
    setAssets(INITIAL_ASSETS);
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
      setModeError('The maintenance service does not expose a work-order status update endpoint.');
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
    if (newStatus === 'RESOLVED') {
      const targetWo = workOrders.find((w) => w.id === workOrderId);
      if (targetWo) {
        resetAssetToBaseline(targetWo.assetId);
      }
    }
  };

  const createWorkOrder = async (input: { assetId: string; title: string; priority: WorkOrderSeverity; owner?: string; due?: string }) => {
        if (!canPerform(userRole, 'createWorkOrder')) {
          setModeError('Your account role does not have permission to create work orders.');
          throw new Error('Your account role does not have permission to create work orders.');
        }

    if (mode === 'LIVE') {
      const created = await liveApi.createWorkOrder(input);
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
      autoGenerated: false
    }, ...previous]);
  };

  const reorderInventoryPart = (partId: string, quantity: number) => {
        if (!canPerform(userRole, 'reorderInventory')) {
          setModeError('Your account role has read-only inventory access.');
          return;
        }

    if (mode === 'LIVE') {
      setModeError('The maintenance service does not expose an inventory reorder endpoint.');
      return;
    }

    setParts((prev) =>
      prev.map((p) => {
        if (p.id !== partId) return p;
        return { ...p, quantityOnHand: p.quantityOnHand + quantity };
      })
    );
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: 'Just now',
        type: 'INVENTORY',
        title: 'Purchase Order Dispatched',
        message: `Order for ${quantity}x units sent to supplier via automated SAP EDI channel.`,
        read: false
      },
      ...prev
    ]);
  };

  const runAiDiagnosticQuery = async (
    assetId: string,
    userQuery: string
  ): Promise<{
    answer: string;
    sources: RagDocumentChunk[];
    sourceLabels?: string[];
    auditEntry?: AiAuditLog;
  }> => {
        if (!canPerform(userRole, 'diagnose')) {
          setModeError('Your account role does not have access to AI diagnostics.');
          throw new Error('Your account role does not have access to AI diagnostics.');
        }

    if (mode === 'LIVE') {
      const response = await liveApi.diagnose(assetId, userQuery);
      return { answer: response.answer, sources: [], sourceLabels: response.sources };
    }

    // Simulate RAG vector search in Qdrant and LLM response
    await new Promise((resolve) => setTimeout(resolve, 800));

    const asset = assets.find((a) => a.id === assetId) || assets[0];
    const matchingDocs = RAG_DOCUMENTS.filter((doc) => !doc.assetId || doc.assetId === assetId);

    let answer = `Diagnostic analysis based on real-time telemetry from **${asset.name}** and indexed maintenance specifications:\n\n`;

    if (userQuery.toLowerCase().includes('vibration') || userQuery.toLowerCase().includes('bearing')) {
      answer += `1. **Observation**: High-frequency harmonics indicate early stage surface pitting on bearing race 6205-2RS.\n2. **RAG Knowledge Base Reference**: Per *SINUMERIK 840D sl Section 4.3.2*, vibration RMS sustained above 6.0 mm/s necessitates an immediate spindle speed reduction to 40%.\n3. **Prescribed Action**: Lock out spindle, verify concentricity with a dial indicator (<0.003 mm), and execute pre-emptive bearing assembly swap before catastrophic failure.`;
    } else if (userQuery.toLowerCase().includes('temperature') || userQuery.toLowerCase().includes('overheat')) {
      answer += `1. **Observation**: Thermal dissipation gradient shows rapid rise exceeding standard cooling curve by +14°C.\n2. **RAG Reference**: Per *SINAMICS S120 Section 11.2*, power module temperatures >85°C initiate IGBT gate drive thermal throttling. Check cabinet intake filters and inspect DC bus capacitors for ESR degradation.\n3. **Prescribed Action**: Inspect thermal paste layer, clean air baffle, and reserve replacement capacitor kit.`;
    } else {
      answer += `1. **Telemetry Review**: Sensor streams for ${asset.name} are currently evaluated against baseline models.\n2. **Standard Operating Procedure**: Verified no catastrophic drift detected on secondary channels. Ensure scheduled 500-hour lubrication and seal inspection are logged.\n3. **Recommended Next Step**: Continue automated edge monitoring; system will trigger automatic work orders if sensor envelopes cross critical thresholds.`;
    }

    const auditEntry: AiAuditLog = {
      id: `log-ai-${Math.floor(9000 + nextSeededValue(simulationSeed) * 999)}`,
      timestamp: new Date().toISOString(),
      assetId: asset.id,
      assetName: asset.name,
      modelVersion: 'gpt-4o-mini-ft-industrial-v2.1 (RAG Qdrant)',
      inputSensorVector: {
        'Query String': userQuery.length,
        'Retrieved Chunks': matchingDocs.length
      },
      failureProbability: asset.healthScore < 80 ? 0.89 : 0.05,
      recommendedAction: 'Diagnostic query completed with verified manual citations',
      executionTimeMs: 342
    };

    setAuditLogs((prev) => [auditEntry, ...prev]);

    return {
      answer,
      sources: matchingDocs,
      auditEntry
    };
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const switchMode = async (nextMode: AppMode) => {
    setModeError(null);
    setRequiresSignIn(false);
    if (nextMode === 'SIMULATION') {
      setMode('SIMULATION');
      simulationSeed.current = SIMULATION_SEED;
      setTelemetryConnected(false);
      setCurrentUser(null);
      setUserRole('RELIABILITY_ENGINEER');
      setDashboardSummary(null);
      setAssets(INITIAL_ASSETS);
      setWorkOrders(INITIAL_WORK_ORDERS);
      setParts(INITIAL_PARTS);
      setSuppliers(INITIAL_SUPPLIERS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setActiveOverride(null);
      setRecentSelfHealingEvent(null);
      return;
    }

    setIsSwitchingMode(true);
    try {
      const [user, snapshot, summary] = await Promise.all([
        liveApi.getCurrentUser(),
        liveApi.getSnapshot(),
        liveApi.getDashboardSummary()
      ]);
      if (snapshot.assets.length === 0) {
        throw new Error('The live services returned no assets; Simulation mode remains active.');
      }
      const liveAssets = mapLiveAssets(snapshot.assets);
      const liveSuppliers = mapLiveSuppliers(snapshot.suppliers);
      setAssets(liveAssets);
      setWorkOrders(mapLiveWorkOrders(snapshot.workOrders, liveAssets));
      setSuppliers(liveSuppliers);
      setParts(mapLiveParts(snapshot.parts, liveSuppliers));
      setAuditLogs([]);
      setNotifications([]);
      setCurrentUser(user);
      setDashboardSummary(summary);
      setUserRole(normalizeUserRole(user.role));
      setMode('LIVE');
      setActiveOverride(null);
      setRecentSelfHealingEvent(null);
    } catch (error) {
      const message = error instanceof TypeError
        ? 'Unable to reach the Spring Boot gateway. Check that the live services are running.'
        : error instanceof Error ? error.message : 'Unable to connect to the live services.';
      setRequiresSignIn(message.toLowerCase().includes('sign in is required'));
      setModeError(message);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const user = await liveApi.login(email, password);
      setCurrentUser(user);
      setUserRole(normalizeUserRole(user.role));
      setModeError(null);
      setRequiresSignIn(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed.';
      setModeError(message);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const user = await liveApi.register(name, email, password);
      setCurrentUser(user);
      setUserRole(normalizeUserRole(user.role));
      setModeError(null);
      setRequiresSignIn(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account creation failed.';
      setModeError(message);
      throw error;
    }
  };

  const signOut = async () => {
    let logoutError: string | null = null;
    try {
      await liveApi.logout();
    } catch (error) {
      logoutError = error instanceof Error ? error.message : 'Sign out failed.';
    }
    setCurrentUser(null);
    await switchMode('SIMULATION');
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
        clearAllNotifications
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
