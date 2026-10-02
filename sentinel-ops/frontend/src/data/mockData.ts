import { Asset, WorkOrder, InventoryPart, Supplier, RagDocumentChunk, AiAuditLog } from '../types';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'ast-sinumerik-01',
    name: 'SINUMERIK 840D CNC Center',
    assetType: '5-Axis CNC Milling Center',
    location: 'Bay 3 - Nuremberg Plant',
    installDate: '2023-04-12',
    healthScore: 94.5,
    status: 'HEALTHY',
    machineClass: 'SINUMERIK',
    runningHours: 8420,
    lastMaintenance: '2026-08-15',
    assignedEngineer: 'Alex Vance (Lead)',
    sensors: [
      {
        id: 'sn-snm-01',
        name: 'Spindle Vibration RMS',
        type: 'Vibration',
        currentValue: 1.82,
        baseline: 1.5,
        criticalThreshold: 6.5,
        unit: 'mm/s',
        history: [1.4, 1.5, 1.6, 1.5, 1.7, 1.6, 1.5, 1.8, 1.6, 1.7, 1.8, 1.7, 1.6, 1.8, 1.9, 1.7, 1.8, 1.9, 1.8, 1.7, 1.82]
      },
      {
        id: 'sn-snm-02',
        name: 'Spindle Bearing Temp',
        type: 'Temperature',
        currentValue: 48.4,
        baseline: 45.0,
        criticalThreshold: 82.0,
        unit: '°C',
        history: [44.8, 45.1, 45.3, 46.0, 46.2, 47.1, 47.5, 47.8, 48.0, 48.1, 48.4]
      },
      {
        id: 'sn-snm-03',
        name: 'Spindle Drive RPM',
        type: 'Speed',
        currentValue: 12050,
        baseline: 12000,
        criticalThreshold: 15500,
        unit: 'RPM',
        history: [11980, 12020, 12010, 12050, 12040, 12000, 12050]
      },
      {
        id: 'sn-snm-04',
        name: 'High-Pressure Coolant',
        type: 'Pressure',
        currentValue: 4.3,
        baseline: 4.5,
        criticalThreshold: 2.1,
        unit: 'Bar',
        history: [4.5, 4.4, 4.5, 4.3, 4.4, 4.3, 4.3]
      }
    ]
  },
  {
    id: 'ast-simatic-02',
    name: 'SIMATIC 6-Axis Industrial Robot',
    assetType: 'Automated Arc Welding Manipulator',
    location: 'Welding Cell B - Plant 04',
    installDate: '2023-11-20',
    healthScore: 89.2,
    status: 'HEALTHY',
    machineClass: 'SIMATIC',
    runningHours: 6150,
    lastMaintenance: '2026-07-28',
    assignedEngineer: 'Marcus Keller',
    sensors: [
      {
        id: 'sn-smk-01',
        name: 'Joint 3 Harmonic Torque',
        type: 'Torque',
        currentValue: 142.5,
        baseline: 135.0,
        criticalThreshold: 210.0,
        unit: 'Nm',
        history: [134, 136, 137, 135, 139, 141, 140, 142.5]
      },
      {
        id: 'sn-smk-02',
        name: 'Servo Winding Temp',
        type: 'Temperature',
        currentValue: 61.2,
        baseline: 55.0,
        criticalThreshold: 90.0,
        unit: '°C',
        history: [55.2, 56.4, 58.1, 59.0, 60.5, 61.2]
      },
      {
        id: 'sn-smk-03',
        name: 'TCP Repeatability Drift',
        type: 'Position',
        currentValue: 0.042,
        baseline: 0.02,
        criticalThreshold: 0.12,
        unit: 'mm',
        history: [0.021, 0.024, 0.028, 0.035, 0.042]
      }
    ]
  },
  {
    id: 'ast-sinamics-03',
    name: 'SINAMICS S120 High-Inertia Drive',
    assetType: 'Synchronous Multi-Axis Drive',
    location: 'Assembly Conveyor Line 1',
    installDate: '2022-09-05',
    healthScore: 76.5,
    status: 'DEGRADED',
    machineClass: 'SINAMICS',
    runningHours: 14200,
    lastMaintenance: '2026-05-10',
    assignedEngineer: 'Chen Wei',
    sensors: [
      {
        id: 'sn-snx-01',
        name: 'Inverter Bridge Temp',
        type: 'Temperature',
        currentValue: 78.8,
        baseline: 62.0,
        criticalThreshold: 88.0,
        unit: '°C',
        history: [64, 67, 70, 72, 75, 77, 78.8]
      },
      {
        id: 'sn-snx-02',
        name: 'Output Current RMS',
        type: 'Current',
        currentValue: 48.2,
        baseline: 40.0,
        criticalThreshold: 65.0,
        unit: 'A',
        history: [41, 42, 45, 46, 48.2]
      },
      {
        id: 'sn-snx-03',
        name: 'DC Link Ripple Voltage',
        type: 'Voltage',
        currentValue: 14.5,
        baseline: 8.0,
        criticalThreshold: 25.0,
        unit: 'V',
        history: [8.5, 9.2, 11.0, 13.2, 14.5]
      }
    ]
  },
  {
    id: 'ast-hydraulic-04',
    name: '500-Ton Hydraulic Cold Press',
    assetType: 'Heavy Forging & Stamping Press',
    location: 'Forging Bay A',
    installDate: '2021-02-14',
    healthScore: 96.8,
    status: 'HEALTHY',
    machineClass: 'HYDRAULIC',
    runningHours: 19800,
    lastMaintenance: '2026-08-30',
    assignedEngineer: 'Elena Rossi',
    sensors: [
      {
        id: 'sn-hyd-01',
        name: 'Main Cylinder Pressure',
        type: 'Pressure',
        currentValue: 312.0,
        baseline: 310.0,
        criticalThreshold: 390.0,
        unit: 'Bar',
        history: [308, 310, 311, 310, 312]
      },
      {
        id: 'sn-hyd-02',
        name: 'Hydraulic Fluid Temp',
        type: 'Temperature',
        currentValue: 51.5,
        baseline: 50.0,
        criticalThreshold: 75.0,
        unit: '°C',
        history: [49.5, 50.1, 50.8, 51.5]
      },
      {
        id: 'sn-hyd-03',
        name: 'Proportional Valve Flow',
        type: 'Flow',
        currentValue: 88.0,
        baseline: 90.0,
        criticalThreshold: 60.0,
        unit: 'L/min',
        history: [90.2, 89.8, 89.0, 88.0]
      }
    ]
  },
  {
    id: 'ast-chiller-05',
    name: 'CryoCooler Industrial Chiller 40kW',
    assetType: 'Refrigerated Process Fluid Chiller',
    location: 'HVAC Mezzanine Roof',
    installDate: '2023-01-18',
    healthScore: 92.1,
    status: 'HEALTHY',
    machineClass: 'CHILLER',
    runningHours: 11200,
    lastMaintenance: '2026-09-02',
    assignedEngineer: 'Marcus Keller',
    sensors: [
      {
        id: 'sn-chl-01',
        name: 'Evaporator Temperature',
        type: 'Temperature',
        currentValue: 6.8,
        baseline: 6.5,
        criticalThreshold: 14.0,
        unit: '°C',
        history: [6.4, 6.5, 6.6, 6.8]
      },
      {
        id: 'sn-chl-02',
        name: 'Refrigerant Head Pressure',
        type: 'Pressure',
        currentValue: 16.4,
        baseline: 16.0,
        criticalThreshold: 24.0,
        unit: 'Bar',
        history: [15.8, 16.0, 16.2, 16.4]
      },
      {
        id: 'sn-chl-03',
        name: 'Scroll Compressor Load',
        type: 'Load',
        currentValue: 71.0,
        baseline: 70.0,
        criticalThreshold: 95.0,
        unit: '%',
        history: [68, 70, 71]
      }
    ]
  }
];

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-1041',
    assetId: 'ast-sinamics-03',
    assetName: 'SINAMICS S120 High-Inertia Drive',
    severity: 'HIGH',
    status: 'AUTO_GENERATED',
    title: 'Inverter Bridge Thermal Degradation Mitigation',
    description: 'Autonomous trigger: Inverter temperature exceeded 78°C while DC link ripple expanded to 14.5V. AI Model predicts IGBT thermal junction fatigue within 18 operating hours.',
    aiRootCause: 'Harmonic distortion caused by DC bus capacitor aging and thermal paste dehydration on heatsink block 2.',
    aiConfidence: 0.93,
    partRequired: 'SINAMICS S120 Bus Capacitor Kit',
    partId: 'PRT-003',
    partReserved: true,
    assignedTechnician: 'Chen Wei',
    createdAt: '2026-09-27T11:20:00Z',
    autoGenerated: true
  },
  {
    id: 'WO-1039',
    assetId: 'ast-hydraulic-04',
    assetName: '500-Ton Hydraulic Cold Press',
    severity: 'MEDIUM',
    status: 'IN_PROGRESS',
    title: 'Proportional Valve Pre-emptive Seal Replacement',
    description: 'Slight flow rate drop recorded across 40 continuous stamping cycles. Maintenance scheduled during shift handover.',
    aiRootCause: 'Micro-scratches on spool valve seal O-ring causing 2.2% bypass leakage.',
    aiConfidence: 0.88,
    partRequired: 'Hydraulic High-Pressure Seal Kit V-2',
    partId: 'PRT-002',
    partReserved: true,
    assignedTechnician: 'Elena Rossi',
    createdAt: '2026-09-26T16:45:00Z',
    autoGenerated: false
  },
  {
    id: 'WO-1035',
    assetId: 'ast-simatic-02',
    assetName: 'SIMATIC 6-Axis Industrial Robot',
    severity: 'LOW',
    status: 'RESOLVED',
    title: 'Joint 3 Gearbox Synthetic Lubricant Replenishment',
    description: 'Routine closed-loop service ticket following 6,000 continuous operating hours. Viscosity inspection passed.',
    aiRootCause: 'Normal operational oil shear degradation.',
    aiConfidence: 0.99,
    partRequired: 'Synthetic Grease Mobilith SHC',
    partId: 'PRT-004',
    partReserved: false,
    assignedTechnician: 'Marcus Keller',
    createdAt: '2026-09-24T09:00:00Z',
    resolvedAt: '2026-09-24T14:30:00Z',
    autoGenerated: true
  }
];

export const INITIAL_PARTS: InventoryPart[] = [
  {
    id: 'PRT-001',
    sku: 'SKF-6205-2RSH-C3',
    name: 'Spindle Bearing 6205-2RS (Ceramic Hybrid)',
    category: 'Mechanical / Bearings',
    quantityOnHand: 3,
    reorderLevel: 5,
    unitCost: 340.0,
    supplierId: 'SUP-02',
    supplierName: 'SKF Group Bearings & Seals',
    leadTimeDays: 2,
    compatibleAssets: ['ast-sinumerik-01']
  },
  {
    id: 'PRT-002',
    sku: 'BOSCH-SEAL-500T',
    name: 'Hydraulic High-Pressure Seal Kit V-2',
    category: 'Hydraulics & Seals',
    quantityOnHand: 14,
    reorderLevel: 8,
    unitCost: 125.0,
    supplierId: 'SUP-03',
    supplierName: 'Bosch Rexroth Hydraulics',
    leadTimeDays: 4,
    compatibleAssets: ['ast-hydraulic-04']
  },
  {
    id: 'PRT-003',
    sku: '6SL3040-1MA01-0AA0',
    name: 'SINAMICS S120 Bus Capacitor Kit',
    category: 'Electronics / Inverters',
    quantityOnHand: 2,
    reorderLevel: 4,
    unitCost: 680.0,
    supplierId: 'SUP-01',
    supplierName: 'Siemens Industry Direct',
    leadTimeDays: 3,
    compatibleAssets: ['ast-sinamics-03']
  },
  {
    id: 'PRT-004',
    sku: 'MOBIL-SHC-460',
    name: 'Synthetic Grease Mobilith SHC (1kg Cartridge)',
    category: 'Lubricants & Fluids',
    quantityOnHand: 32,
    reorderLevel: 10,
    unitCost: 45.0,
    supplierId: 'SUP-04',
    supplierName: 'Festo Pneumatics & Lubrication',
    leadTimeDays: 1,
    compatibleAssets: ['ast-simatic-02', 'ast-sinumerik-01']
  },
  {
    id: 'PRT-005',
    sku: 'SIEMENS-TEMP-PT1000',
    name: 'High-Precision RTD Thermal Sensor Probe',
    category: 'Instrumentation',
    quantityOnHand: 8,
    reorderLevel: 6,
    unitCost: 92.0,
    supplierId: 'SUP-01',
    supplierName: 'Siemens Industry Direct',
    leadTimeDays: 2,
    compatibleAssets: ['ast-sinumerik-01', 'ast-sinamics-03', 'ast-chiller-05']
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-01',
    name: 'Siemens Industry Direct',
    tier: 'Tier 1 OEM',
    rating: 4.95,
    onTimeDeliveryRate: 99.4,
    contactEmail: 'order-dispatch@siemens-industry.corp',
    contactPhone: '+49 911 895 0',
    location: 'Nuremberg & Erlangen, Germany',
    catalogCount: 1420,
    suppliedParts: ['PRT-003', 'PRT-005']
  },
  {
    id: 'SUP-02',
    name: 'SKF Group Bearings & Seals',
    tier: 'Tier 1 OEM',
    rating: 4.88,
    onTimeDeliveryRate: 98.7,
    contactEmail: 'procurement-emea@skf.com',
    contactPhone: '+46 31 337 1000',
    location: 'Gothenburg, Sweden',
    catalogCount: 860,
    suppliedParts: ['PRT-001']
  },
  {
    id: 'SUP-03',
    name: 'Bosch Rexroth Hydraulics',
    tier: 'OEM Partner',
    rating: 4.82,
    onTimeDeliveryRate: 97.9,
    contactEmail: 'support.hydraulic@boschrexroth.de',
    contactPhone: '+49 9352 18 0',
    location: 'Lohr am Main, Germany',
    catalogCount: 650,
    suppliedParts: ['PRT-002']
  },
  {
    id: 'SUP-04',
    name: 'Festo Pneumatics & Lubrication',
    tier: 'Certified Distributor',
    rating: 4.91,
    onTimeDeliveryRate: 99.1,
    contactEmail: 'orders-express@festo.com',
    contactPhone: '+49 711 347 0',
    location: 'Esslingen, Germany',
    catalogCount: 1100,
    suppliedParts: ['PRT-004']
  }
];

export const RAG_DOCUMENTS: RagDocumentChunk[] = [
  {
    chunkId: 'chunk-snm-01',
    sourceDoc: 'Siemens SINUMERIK 840D sl Diagnostics & Maintenance Manual (DocID: 6FC5397-0EP40-0BA0)',
    assetId: 'ast-sinumerik-01',
    section: 'Section 4.3.2: High-Frequency Spindle Bearing Vibration Analysis',
    similarityScore: 0.942,
    text: 'When spindle vibration RMS exceeds 6.0 mm/s (normal band 1.2–2.2 mm/s), the root cause is predominantly inner raceway flaking or cage fatigue on the front hybrid ceramic angular contact bearing. If accompanied by bearing temperature exceeding 75°C, immediate spindle speed derating to 40% is mandatory to prevent catastrophic spindle seizure. Recommended procedure: Lockout spindle drive, inspect runout with dial gauge (<0.003 mm acceptable), and replace Bearing 6205-2RS.'
  },
  {
    chunkId: 'chunk-snm-02',
    sourceDoc: 'Siemens SINUMERIK 840D sl Diagnostics & Maintenance Manual (DocID: 6FC5397-0EP40-0BA0)',
    assetId: 'ast-sinumerik-01',
    section: 'Section 8.1.5: Emergency Coolant Pressure Loss Protocols',
    similarityScore: 0.895,
    text: 'A decrease in high-pressure coolant below 2.5 Bar during active milling cycles causes rapid thermal expansion of carbide tooling and workpiece surface galling. Verify filter differential pressure sensor and solenoid valve 3Y1. If cavitation is audible, bleed air from the recirculation pump manifold.'
  },
  {
    chunkId: 'chunk-snx-01',
    sourceDoc: 'SINAMICS S120 Inverter Power Units Equipment Manual (DocID: 6SL3097-4AP10-0BP6)',
    assetId: 'ast-sinamics-03',
    section: 'Section 11.2: Heat Sink Over-temperature Alarm Fault F30004',
    similarityScore: 0.928,
    text: 'Fault F30004 occurs when the temperature sensor inside the power module exceeds 85°C. Primary failure modes include clogged cabinet air intake filters, cooling fan tachometer failure, or drying of thermal interface material (TIM). In tandem with elevated DC link ripple (>12V), inspect electrolytic bus capacitors for electrolyte venting and ESR degradation.'
  },
  {
    chunkId: 'chunk-hyd-01',
    sourceDoc: 'Bosch Rexroth / Schuler 500-Ton Forging Press SOP Manual',
    assetId: 'ast-hydraulic-04',
    section: 'Section 6.4: Hydraulic Valve Spool Wear & Cylinder Seal Integrity',
    similarityScore: 0.912,
    text: 'If hydraulic fluid temperature elevates past 70°C, oil viscosity drops below 20 cSt, leading to rapid degradation of polyurethane rod seals. If main cylinder holding pressure decays by more than 15 Bar over a 60-second dwell test, replace the primary chevron packing kit (Part: BOSCH-SEAL-500T) and flush the proportional valve pilot lines.'
  },
  {
    chunkId: 'chunk-smk-01',
    sourceDoc: 'SIMATIC Industrial Robotic Manipulator Kinematics & Maintenance Guide',
    assetId: 'ast-simatic-02',
    section: 'Section 3.7: Harmonic Drive Backlash & Joint Torque Deviation',
    similarityScore: 0.884,
    text: 'A drift in Joint 3 torque exceeding +15% of nominal baseline indicates grease contamination or pre-load loss on the flexible spline. Recalibrate tool center point (TCP) using the optical laser interferometer. If repeatability exceeds 0.08 mm, replenish with synthetic Mobilith SHC grease and run the 15-minute conditioning routine.'
  }
];

export const INITIAL_AUDIT_LOGS: AiAuditLog[] = [
  {
    id: 'log-ai-8821',
    timestamp: '2026-09-27T11:20:00Z',
    assetId: 'ast-sinamics-03',
    assetName: 'SINAMICS S120 High-Inertia Drive',
    modelVersion: 'gpt-4o-mini-ft-industrial-v2.1',
    inputSensorVector: { 'Inverter Bridge Temp': 78.8, 'Output Current RMS': 48.2, 'DC Link Ripple': 14.5 },
    failureProbability: 0.932,
    recommendedAction: 'Dispatch technician & pre-stage Bus Capacitor Kit',
    triggeredWorkOrderId: 'WO-1041',
    executionTimeMs: 142
  },
  {
    id: 'log-ai-8819',
    timestamp: '2026-09-27T08:15:32Z',
    assetId: 'ast-sinumerik-01',
    assetName: 'SINUMERIK 840D CNC Center',
    modelVersion: 'gpt-4o-mini-ft-industrial-v2.1',
    inputSensorVector: { 'Spindle Vibration RMS': 1.82, 'Bearing Temp': 48.4, 'Spindle Speed': 12050 },
    failureProbability: 0.048,
    recommendedAction: 'Maintain autonomous continuous monitoring',
    executionTimeMs: 98
  },
  {
    id: 'log-ai-8815',
    timestamp: '2026-09-26T22:40:11Z',
    assetId: 'ast-hydraulic-04',
    assetName: '500-Ton Hydraulic Cold Press',
    modelVersion: 'gpt-4o-mini-ft-industrial-v2.1',
    inputSensorVector: { 'Cylinder Pressure': 312, 'Oil Temp': 51.5, 'Valve Flow': 88.0 },
    failureProbability: 0.065,
    recommendedAction: 'Nominal operational status verified',
    executionTimeMs: 104
  }
];
