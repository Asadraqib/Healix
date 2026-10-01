import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import {
  apiBaseUrl,
  createWorkOrder,
  diagnoseAsset,
  liveApiEnabled,
  loadGatewaySnapshot,
  mergeTelemetryReading,
  postOverride,
  resetSimulation,
  subscribeToTelemetry,
  loadDashboardSummary,
  loadWorkOrdersForAsset,
} from './api';

const colors = {
  blue: '#1677c8',
  teal: '#0c8b82',
  green: '#238b5d',
  amber: '#c67b08',
  red: '#c84141',
  ink: '#1d2a37',
  muted: '#647486',
};

const machinesSeed = [
  {
    id: 'CNC-001',
    name: 'SINUMERIK Machining Center',
    type: 'CNC',
    model: '840D sl',
    location: 'Line A · Bay 01',
    status: 'Running',
    health: 96,
    temperature: 67.4,
    vibration: 2.8,
    load: 71,
    power: 12.7,
    unit: '°C',
    accent: '#1677c8',
    trend: [62, 65, 64, 66, 65, 67, 66, 67, 67.4],
    metricLabel: 'Temperature',
    metric: '67.4',
    secondaryLabel: 'Vibration',
    secondary: '2.8 mm/s',
    production: '184',
    icon: 'cnc',
  },
  {
    id: 'ROB-001',
    name: 'SIMATIC Robotic Arm',
    type: 'Robot',
    model: 'S-1500',
    location: 'Line A · Bay 02',
    status: 'Running',
    health: 92,
    temperature: 42.1,
    vibration: 1.2,
    load: 58,
    power: 8.4,
    unit: '°C',
    accent: '#0c8b82',
    trend: [40, 41, 40, 42, 41, 42, 41, 42, 42.1],
    metricLabel: 'Temperature',
    metric: '42.1',
    secondaryLabel: 'Cycle count',
    secondary: '1,284',
    production: '96',
    icon: 'robot',
  },
  {
    id: 'DRV-001',
    name: 'SINAMICS Conveyor Drive',
    type: 'Drive',
    model: 'G120X',
    location: 'Line B · Bay 01',
    status: 'Warning',
    health: 74,
    temperature: 74.8,
    vibration: 4.4,
    load: 86,
    power: 18.2,
    unit: '°C',
    accent: '#c67b08',
    trend: [61, 63, 66, 67, 69, 71, 73, 75, 74.8],
    metricLabel: 'Temperature',
    metric: '74.8',
    secondaryLabel: 'Motor load',
    secondary: '86%',
    production: '72',
    icon: 'drive',
  },
  {
    id: 'PRS-001',
    name: 'Hydraulic Press',
    type: 'Press',
    model: 'HPR-400',
    location: 'Line B · Bay 03',
    status: 'Running',
    health: 88,
    temperature: 62.3,
    vibration: 1.9,
    load: 63,
    power: 14.1,
    unit: '°C',
    accent: '#7068b6',
    trend: [60, 61, 61, 62, 61, 63, 62, 62, 62.3],
    metricLabel: 'Temperature',
    metric: '62.3',
    secondaryLabel: 'Pressure',
    secondary: '118 bar',
    production: '61',
    icon: 'press',
  },
  {
    id: 'CMP-001',
    name: 'Compressor Unit',
    type: 'Compressor',
    model: 'SICOMP CP',
    location: 'Utilities · East',
    status: 'Running',
    health: 90,
    temperature: 58.6,
    vibration: 2.1,
    load: 49,
    power: 10.3,
    unit: '°C',
    accent: '#6a889d',
    trend: [56, 57, 58, 57, 58, 58, 59, 58, 58.6],
    metricLabel: 'Temperature',
    metric: '58.6',
    secondaryLabel: 'Air pressure',
    secondary: '8.2 bar',
    production: '—',
    icon: 'compressor',
  },
];

const workOrdersSeed = [
  { id: 'WO-1042', asset: 'DRV-001', title: 'Inspect conveyor motor vibration', priority: 'High', status: 'In progress', owner: 'A. Mehta', due: 'Today, 16:30', source: 'Predictive alert' },
  { id: 'WO-1041', asset: 'CNC-001', title: 'Replace spindle cooling filter', priority: 'Medium', status: 'Scheduled', owner: 'R. Singh', due: 'Sep 28, 09:00', source: 'Preventive plan' },
  { id: 'WO-1038', asset: 'PRS-001', title: 'Calibrate pressure sensor', priority: 'Low', status: 'Completed', owner: 'N. Kumar', due: 'Sep 26, 14:10', source: 'Operator request' },
  { id: 'WO-1036', asset: 'ROB-001', title: 'Lubricate joint 3 actuator', priority: 'Medium', status: 'Scheduled', owner: 'S. Patel', due: 'Sep 29, 11:30', source: 'Maintenance plan' },
];

const parts = [
  { part: '6SL3210-1PE31', description: 'SINAMICS power module', onHand: 3, reorder: 5, location: 'Rack A-14', supplier: 'Siemens Industry', status: 'Shortage' },
  { part: '1FK7022-5AK71', description: 'SIMOTICS motor encoder', onHand: 8, reorder: 4, location: 'Rack C-03', supplier: 'Motion Supply Co.', status: 'Healthy' },
  { part: '6FC5397-6AP40', description: 'SINUMERIK control unit', onHand: 2, reorder: 2, location: 'Rack A-02', supplier: 'Siemens Industry', status: 'Healthy' },
  { part: 'HPR-SEAL-400', description: 'Hydraulic press seal kit', onHand: 1, reorder: 3, location: 'Rack B-18', supplier: 'HydroParts GmbH', status: 'Shortage' },
  { part: 'CP-FILTER-09', description: 'Compressor intake filter', onHand: 14, reorder: 6, location: 'Rack D-02', supplier: 'Air Systems Ltd.', status: 'Healthy' },
];

const suppliers = [
  { name: 'Siemens Industry', category: 'Automation & drives', rating: 'Preferred', lead: '3–5 days', orders: 18, initials: 'SI', tone: 'blue' },
  { name: 'Motion Supply Co.', category: 'Motors & encoders', rating: 'Approved', lead: '5–7 days', orders: 11, initials: 'MS', tone: 'teal' },
  { name: 'HydroParts GmbH', category: 'Hydraulics', rating: 'Approved', lead: '7–10 days', orders: 7, initials: 'HG', tone: 'purple' },
  { name: 'Air Systems Ltd.', category: 'Compressed air', rating: 'Preferred', lead: '2–4 days', orders: 9, initials: 'AS', tone: 'orange' },
];

const nav = [
  { id: 'overview', label: 'Overview', icon: 'grid', group: 'Workspace' },
  { id: 'assets', label: 'Assets', icon: 'machine', group: 'Workspace', count: '5' },
  { id: 'telemetry', label: 'Live telemetry', icon: 'activity', group: 'Workspace', live: true },
  { id: 'work-orders', label: 'Work orders', icon: 'wrench', group: 'Operations', count: '4' },
  { id: 'inventory', label: 'Parts & inventory', icon: 'package', group: 'Operations', count: '2' },
  { id: 'suppliers', label: 'Suppliers', icon: 'truck', group: 'Operations' },
  { id: 'ai', label: 'AI diagnosis', icon: 'sparkles', group: 'Intelligence', ai: true },
  { id: 'settings', label: 'Settings', icon: 'settings', group: 'System' },
];

function Icon({ name, size = 18, stroke = 1.8 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    machine: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M7 5V3h10v2M7 10h4m2 0h4M7 15h10M6 20v2m12-2v2" /></>,
    activity: <><path d="M3 12h4l2.2-7 4.4 14 2.4-7H21" /><circle cx="3" cy="12" r="1" /></>,
    wrench: <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3.5 17.5a2.1 2.1 0 1 0 3 3l4.8-4.8a5 5 0 0 0 6.4-6.4l-3.1 3.1-2.8-.7-.7-2.8z" /></>,
    package: <><path d="m3 7 9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" /><path d="m7 5 9 4" /></>,
    truck: <><path d="M3 5h11v12H3zM14 9h4l3 3v5h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
    sparkles: <><path d="m12 3-1.3 4.2L7 8.5l3.7 1.3L12 14l1.3-4.2L17 8.5l-3.7-1.3zM19 14l-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7zM5 14l-.7 2.3L2 17l2.3.7L5 20l.7-2.3L8 17l-2.3-.7z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.5-1H6v-2.6h.5A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1A1.7 1.7 0 0 0 19 10a1.7 1.7 0 0 0 1.5 1h.5v2.6h-.5a1.7 1.7 0 0 0-1.1 1.4z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    alert: <><path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" /><path d="M12 9v4m0 4h.01" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    thermometer: <><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" /><path d="M12 9v7" /></>,
    gauge: <><path d="M4 16a8 8 0 1 1 16 0" /><path d="M12 12l4-3" /><path d="M3 19h18" /></>,
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7z" />,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-4L3 10m0-5v5h5M4 13a8 8 0 0 0 14.9 4L21 14m0 5v-5h-5" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
    message: <><path d="M4 5h16v12H8l-4 4z" /><path d="M8 10h8m-8 3h5" /></>,
    pause: <><path d="M9 5v14M15 5v14" /></>,
    play: <path d="m9 5 10 7-10 7z" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.grid}</svg>;
}

function StatusBadge({ status }) {
  const key = status.toLowerCase().replaceAll(' ', '-');
  return <span className={`status-badge ${key}`}><span className="status-dot" />{status}</span>;
}

function Sparkline({ values, color = '#1677c8', height = 52, width = 180, fill = false }) {
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / (max - min)) * (height - 10) - 5}`).join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  return <svg className="sparkline" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
    {fill && <polygon points={area} fill={color} opacity=".1" />}
    <polyline points={points} fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function MachineVisual({ type, state = 'Running', compact = false }) {
  return <div className={`machine-visual ${type.toLowerCase()} ${compact ? 'compact' : ''} ${state.toLowerCase()}`}>
    <div className="machine-grid" />
    {type === 'CNC' && <><div className="cnc-cabinet" /><div className="cnc-spindle" /><div className="cnc-bed" /><div className="cnc-screen"><span /></div></>}
    {type === 'Robot' && <><div className="robot-base" /><div className="robot-arm arm-one" /><div className="robot-arm arm-two" /><div className="robot-joint joint-one" /><div className="robot-joint joint-two" /></>}
    {type === 'Drive' && <><div className="drive-body" /><div className="drive-wheel" /><div className="drive-lines" /><div className="drive-bolt"><Icon name="bolt" size={16} /></div></>}
    {type === 'Press' && <><div className="press-top" /><div className="press-column left" /><div className="press-column right" /><div className="press-plate" /><div className="press-base" /></>}
    {type === 'Compressor' && <><div className="compressor-tank" /><div className="compressor-ring" /><div className="compressor-motor" /><div className="compressor-foot left" /><div className="compressor-foot right" /></>}
    <span className="machine-reflection" />
  </div>;
}

function Donut({ value, color = '#1677c8', label, size = 88 }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return <div className="donut-wrap" style={{ width: size, height: size }}>
    <svg viewBox="0 0 80 80" className="donut">
      <circle cx="40" cy="40" r={radius} fill="none" stroke="#e8eef3" strokeWidth="7" />
      <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(value / 100) * circumference} ${circumference}`} transform="rotate(-90 40 40)" />
    </svg>
    <div className="donut-label"><strong>{value}%</strong>{label && <span>{label}</span>}</div>
  </div>;
}

function KpiCard({ eyebrow, value, detail, tone = 'blue', icon, trend, children }) {
  return <div className={`kpi-card ${tone}`}>
    <div className="kpi-top"><span>{eyebrow}</span><span className="kpi-icon"><Icon name={icon} size={17} /></span></div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-bottom"><span className="kpi-detail">{detail}</span>{trend && <span className={`trend ${trend.startsWith('+') ? 'up' : 'down'}`}>{trend}</span>}</div>
    {children}
  </div>;
}

function PageHeader({ eyebrow, title, description, action, onAction }) {
  return <div className="page-header">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <button className="primary-btn" onClick={onAction}><Icon name="plus" size={16} />{action}</button>}
  </div>;
}

function Dashboard({ machines, onNavigate, onTrigger }) {
  const [windowName, setWindowName] = useState('Last 24 hours');
  const active = machines.filter((m) => m.status !== 'Offline').length;
  const avgHealth = Math.round(machines.reduce((sum, m) => sum + m.health, 0) / machines.length);
  const alarmMachines = machines.filter((m) => m.status === 'Warning' || m.status === 'Fault');
  const criticalCount = machines.filter((m) => m.status === 'Fault').length;
  const warningCount = machines.filter((m) => m.status === 'Warning').length;
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => loadDashboardSummary().then((s) => { if (!cancelled) setSummary(s); }).catch(() => { });
    load();
    const id = setInterval(load, 6000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return <div className="page">
    <PageHeader eyebrow="Operations center / Sunday, September 27, 2026" title="Good morning, Asad" description="Here’s the current health of your industrial fleet." action="Create work order" onAction={() => onNavigate('work-orders')} />
    <div className="toolbar-row">
      <div className="sync-state"><span className="live-pulse" />Live telemetry connected <span className="divider" /> Updated just now</div>
      <div className="toolbar-actions"><button className="select-btn"><Icon name="clock" size={15} />{windowName}<Icon name="down" size={14} /></button><button className="icon-btn" aria-label="Refresh"><Icon name="refresh" size={17} /></button><button className="icon-btn" aria-label="Download"><Icon name="download" size={17} /></button></div>
    </div>
    <div className="kpi-grid">
      <KpiCard eyebrow="Assets online" value={`${active} / ${machines.length}`} detail="All systems operational" tone="blue" icon="machine" trend="+1.2%" />
      <KpiCard eyebrow="Fleet health" value={`${avgHealth}%`} detail="Above target of 85%" tone="green" icon="gauge" trend="+3.4%"><div className="mini-progress"><span style={{ width: `${avgHealth}%` }} /></div></KpiCard>
      <KpiCard eyebrow="Active alarms" value={`${alarmMachines.length}`} detail={`${criticalCount} critical · ${warningCount} warning`} tone="amber" icon="alert" trend={`${alarmMachines.length} now`} />
      <KpiCard eyebrow="Today's OEE" value="87.4%" detail="Across 2 production lines" tone="purple" icon="activity" trend="+4.1%" />
    </div>
    <div className="dashboard-grid">
      <section className="panel fleet-panel">
        <div className="panel-head"><div><h2>Fleet health</h2><p>Live status across your connected assets</p></div><button className="link-btn" onClick={() => onNavigate('assets')}>View all assets <Icon name="arrow" size={15} /></button></div>
        <div className="fleet-list">
          {machines.map((machine) => <MachineRow key={machine.id} machine={machine} onClick={() => onNavigate('assets', machine.id)} />)}
        </div>
      </section>
      <section className="panel oee-panel">
        <div className="panel-head"><div><h2>Production performance</h2><p>Overall equipment effectiveness</p></div><button className="icon-btn"><Icon name="more" size={18} /></button></div>
        <div className="oee-overview"><Donut value={87} color="#1677c8" /><div className="oee-copy"><strong>87.4%</strong><span>Fleet OEE</span><em><span className="dot green-dot" /> 4.1% vs last week</em></div></div>
        <div className="oee-bars"><div><span>Availability</span><strong>92%</strong><i><b style={{ width: '92%' }} /></i></div><div><span>Performance</span><strong>89%</strong><i><b style={{ width: '89%' }} /></i></div><div><span>Quality</span><strong>95%</strong><i><b style={{ width: '95%' }} /></i></div></div>
        <div className="line-stat"><span>Parts produced today</span><strong>428 <small>/ 500 target</small></strong></div>
      </section>
    </div>
    <div className="dashboard-grid lower">
      <section className="panel chart-panel">
        <div className="panel-head"><div><h2>Fleet health trend</h2><p>Average score by hour</p></div><button className="select-btn small">{windowName}<Icon name="down" size={14} /></button></div>
        <div className="large-chart">
          <div className="y-labels"><span>100</span><span>90</span><span>80</span><span>70</span></div>
          <div className="chart-area">
            <div className="grid-lines"><i /><i /><i /><i /></div>
            <Sparkline values={summary?.healthTrend?.length ? summary.healthTrend : [avgHealth]} color="#1677c8" height={190} width={640} fill />
          </div>
        </div>
      </section>
      <section className="panel insights-panel">
        <div className="panel-head"><div><h2>AI insights</h2><p>Evidence-based recommendations</p></div><span className="ai-mark"><Icon name="sparkles" size={16} /> Copilot</span></div>
        <div className="insight-item critical"><div className="insight-icon"><Icon name="alert" size={17} /></div><div><strong>Conveyor vibration rising</strong><p>DRV-001 is 18% above its 7-day baseline. Inspect the drive coupling within 24 hours.</p><button onClick={() => onTrigger('DRV-001')}>Review recommendation <Icon name="arrow" size={13} /></button></div></div>
        <div className="insight-item positive"><div className="insight-icon"><Icon name="check" size={17} /></div><div><strong>Fleet health improving</strong><p>Average health is up 3.4% since the last maintenance cycle.</p><button onClick={() => onNavigate('ai')}>View analysis <Icon name="arrow" size={13} /></button></div></div>
        <div className="insight-footer"><span><Icon name="bolt" size={14} /> Powered by live telemetry + maintenance history</span></div>
      </section>
    </div>
  </div>;
}

function MachineRow({ machine, onClick }) {
  return <button className="machine-row" onClick={onClick}><div className="machine-row-visual"><MachineVisual type={machine.type} state={machine.status} compact /></div><div className="machine-row-info"><div className="machine-row-title"><strong>{machine.name}</strong><span>{machine.id}</span></div><span className="machine-location">{machine.location} <span className="bullet">·</span> {machine.model}</span></div><div className="machine-row-health"><div className="health-number" style={{ color: machine.health > 85 ? '#238b5d' : '#c67b08' }}>{machine.health}%</div><div className="health-track"><i style={{ width: `${machine.health}%`, background: machine.health > 85 ? '#238b5d' : '#c67b08' }} /></div></div><StatusBadge status={machine.status} /><Icon name="chevron" size={16} /></button>;
}

function Assets({ machines, selectedId, onSelect, onTrigger, onReset }) {
  const [filter, setFilter] = useState('All assets');
  const [search, setSearch] = useState('');
  const selected = machines.find((m) => m.id === selectedId) || machines[0];
  const shown = machines.filter((m) => (filter === 'All assets' || m.status === filter) && `${m.name} ${m.id}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page">
    <PageHeader eyebrow="Asset management" title="Assets" description="Monitor, configure and inspect every machine in your operation." action="Register asset" />
    <div className="toolbar-row asset-toolbar"><div className="search-field"><Icon name="search" size={16} /><input placeholder="Search assets" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="toolbar-actions"><button className="select-btn"><Icon name="filter" size={15} />{filter}<Icon name="down" size={14} /></button><button className="secondary-btn"><Icon name="download" size={15} /> Export</button></div></div>
    <div className="asset-layout">
      <section className="asset-cards">{shown.map((machine) => <AssetCard key={machine.id} machine={machine} selected={machine.id === selected.id} onClick={() => onSelect(machine.id)} />)}</section>
      <AssetDetail machine={selected} onTrigger={onTrigger} onReset={onReset} />
    </div>
  </div>;
}

function AssetCard({ machine, selected, onClick }) {
  return <button className={`asset-card ${selected ? 'selected' : ''}`} onClick={onClick}><div className="asset-card-top"><StatusBadge status={machine.status} /><span className="asset-card-id">{machine.id}</span></div><MachineVisual type={machine.type} state={machine.status} /><div className="asset-card-name"><strong>{machine.name}</strong><span>{machine.location}</span></div><div className="asset-card-stats"><div><span>Health</span><strong style={{ color: machine.health > 85 ? '#238b5d' : '#c67b08' }}>{machine.health}%</strong></div><div><span>{machine.metricLabel}</span><strong>{machine.metric}{machine.metricLabel === 'Temperature' ? '°C' : ''}</strong></div><div><span>Load</span><strong>{machine.load}%</strong></div></div><Sparkline values={machine.trend} color={machine.accent} height={34} width={280} fill /></button>;
}

function AssetDetail({ machine, onTrigger, onReset }) {
  const [tab, setTab] = useState('Overview');
  const [override, setOverride] = useState(75);
  return <aside className="asset-detail panel"><div className="detail-head"><div><span className="detail-id">{machine.id} · {machine.model}</span><h2>{machine.name}</h2><span className="machine-location"><Icon name="machine" size={14} /> {machine.location}</span></div><button className="icon-btn"><Icon name="more" size={18} /></button></div><div className="detail-tabs">{['Overview', 'Telemetry', 'Maintenance'].map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>{tab === 'Overview' && <><div className="detail-visual"><MachineVisual type={machine.type} state={machine.status} /><div className="detail-visual-caption"><StatusBadge status={machine.status} /><span><span className="live-pulse" /> Live simulated asset</span></div></div><div className="detail-health"><div><span>Health score</span><strong>{machine.health}%</strong></div><div className="health-track large"><i style={{ width: `${machine.health}%`, background: machine.health > 85 ? '#238b5d' : '#c67b08' }} /></div><small>Last assessment 34 seconds ago</small></div><div className="metric-grid"><div><span>Temperature</span><strong>{machine.temperature.toFixed(1)}°C</strong><em><Icon name="thermometer" size={13} /> Normal</em></div><div><span>Motor load</span><strong>{machine.load}%</strong><em><Icon name="activity" size={13} /> Stable</em></div><div><span>Vibration</span><strong>{machine.vibration} mm/s</strong><em className={machine.vibration > 3 ? 'warning-text' : ''}><Icon name="activity" size={13} /> {machine.vibration > 3 ? 'Above baseline' : 'Normal'}</em></div><div><span>Power draw</span><strong>{machine.power} kW</strong><em><Icon name="bolt" size={13} /> Current</em></div></div><div className="override-box"><div className="override-head"><div><span className="eyebrow">Simulation controls</span><strong>Test a sensor override</strong></div><span className="simulated-pill">SIMULATED</span></div><p>Push a high reading to demonstrate the self-healing workflow.</p><div className="range-line"><span>Sensor value</span><strong>{override}°C</strong></div><input type="range" min="30" max="110" value={override} onChange={(e) => setOverride(Number(e.target.value))} /><div className="override-actions"><button className="primary-btn small" onClick={() => onTrigger(machine.id, override)}><Icon name="bolt" size={14} /> Push reading</button><button className="secondary-btn small" onClick={() => onReset(machine.id)}>Reset baseline</button></div></div></>}{tab === 'Telemetry' && <TelemetryTab machine={machine} />}{tab === 'Maintenance' && <MaintenanceTab machine={machine} />}</aside>;
}

function TelemetryTab({ machine }) {
  const points = machine.trend && machine.trend.length ? machine.trend.slice(-6) : [machine.temperature];
  const rows = points.map((v, i) => ({
    label: i === points.length - 1 ? 'Now' : `${(points.length - 1 - i) * 4}s ago`,
    value: v,
  }));
  return <div className="detail-tab-content">
    <div className="telemetry-chart">
      <div className="panel-head"><div><h3>Temperature</h3><p>Last {points.length} readings</p></div><strong>{machine.temperature}°C</strong></div>
      <Sparkline values={points} color={machine.accent} height={145} width={400} fill />
    </div>
    <div className="reading-table">
      {rows.map((r, i) => <div key={i}><span>{r.label}</span><strong>{(r.value.toFixed ? r.value.toFixed(1) : r.value)} °C</strong></div>)}
      <div><span>Vibration</span><strong>{machine.vibration} mm/s</strong></div>
      <div><span>Power draw</span><strong>{machine.power} kW</strong></div>
    </div>
  </div>;
}

function MaintenanceTab({ machine }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    loadWorkOrdersForAsset(machine.id)
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [machine.id]);

  return <div className="detail-tab-content">
    <div className="maintenance-summary">
      <div className="maintenance-icon"><Icon name="wrench" size={20} /></div>
      <div><span>Open work orders</span><strong>{history.filter((w) => w.status !== 'Completed').length}</strong><small>{history.length} total on record</small></div>
    </div>
    <h3>Recent activity</h3>
    <div className="timeline">
      {loading && <div><span /><p><strong>Loading…</strong></p></div>}
      {!loading && history.length === 0 && <div><span /><p><strong>No maintenance history yet</strong><small>Work orders for {machine.id} will appear here</small></p></div>}
      {history.map((wo) => <div key={wo.id}><span /><p><strong>{wo.id}</strong> · {wo.title}<small>{wo.due} · {wo.source}</small></p></div>)}
    </div>
  </div>;
}

function Telemetry({ machines, onSelect, onTrigger }) {
  const [running, setRunning] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('Temperature');
  return <div className="page"><PageHeader eyebrow="Simulation service / WebSocket stream" title="Live telemetry" description="A real-time view of simulated machine behavior across your fleet." action={running ? 'Pause stream' : 'Resume stream'} onAction={() => setRunning(!running)} /><div className="telemetry-banner"><div className="telemetry-banner-icon"><Icon name="activity" size={22} /></div><div><strong>{running ? 'Live stream is active' : 'Stream paused'}</strong><span>{running ? 'Receiving readings every 2 seconds from 5 simulated assets.' : 'Resume the stream to continue receiving live readings.'}</span></div><div className="stream-stats"><div><strong>2s</strong><span>tick rate</span></div><div><strong>1,284</strong><span>messages/hr</span></div><div><strong>WebSocket</strong><span>transport</span></div></div></div><div className="telemetry-layout"><section className="panel readings-panel"><div className="panel-head"><div><h2>Live readings</h2><p>Current sensor values and recent movement</p></div><div className="metric-switcher">{['Temperature', 'Load', 'Power'].map((metric) => <button key={metric} className={selectedMetric === metric ? 'active' : ''} onClick={() => setSelectedMetric(metric)}>{metric}</button>)}</div></div><div className="telemetry-table"><div className="table-head"><span>Asset</span><span>Status</span><span>Current value</span><span>Health</span><span>Trend</span><span> </span></div>{machines.map((m) => <div className="table-row" key={m.id}><div className="asset-cell"><div className="table-machine"><MachineVisual type={m.type} state={m.status} compact /></div><div><strong>{m.id}</strong><span>{m.name}</span></div></div><StatusBadge status={m.status} /><div className="reading-value"><strong>{selectedMetric === 'Temperature' ? `${m.temperature.toFixed(1)}°C` : selectedMetric === 'Load' ? `${m.load}%` : `${m.power} kW`}</strong><span>{selectedMetric === 'Temperature' ? 'within threshold' : 'live value'}</span></div><div className="health-cell"><strong>{m.health}%</strong><div className="health-track"><i style={{ width: `${m.health}%`, background: m.health > 85 ? '#238b5d' : '#c67b08' }} /></div></div><div className="table-spark"><Sparkline values={m.trend} color={m.accent} height={34} width={90} /></div><button className="icon-btn" onClick={() => onSelect(m.id)}><Icon name="chevron" size={16} /></button></div>)}</div></section><section className="panel protocol-panel"><div className="panel-head"><div><h2>Stream health</h2><p>Simulator connection details</p></div><span className="live-state"><span className="live-pulse" />Connected</span></div><div className="protocol-visual"><div className="protocol-node"><Icon name="machine" size={18} /><span>Simulator</span><small>5 assets</small></div><div className="protocol-line active" /><div className="protocol-node"><Icon name="activity" size={18} /><span>WebSocket</span><small>1.2k msg/hr</small></div><div className="protocol-line active" /><div className="protocol-node"><Icon name="grid" size={18} /><span>Dashboard</span><small>Synced</small></div></div><div className="protocol-list"><div><span>Last message</span><strong>Just now</strong></div><div><span>Average latency</span><strong>42 ms</strong></div><div><span>Data source</span><strong className="blue-text">Simulated</strong></div></div><button className="secondary-btn full" onClick={() => onTrigger('DRV-001', 98)}><Icon name="bolt" size={15} /> Inject test event</button></section></div></div>;
}

function WorkOrders({ workOrders, onCreate }) {
  const [tab, setTab] = useState('All work orders');
  const filtered = workOrders.filter((wo) => tab === 'All work orders' || wo.status === tab);
  return <div className="page"><PageHeader eyebrow="Maintenance service" title="Work orders" description="Coordinate predictive, preventive and corrective maintenance." action="Create work order" onAction={onCreate} /><div className="kpi-grid compact-kpis"><KpiCard eyebrow="Open work orders" value="3" detail="1 needs attention" tone="blue" icon="wrench" /><KpiCard eyebrow="Due today" value="1" detail="DRV-001 · High priority" tone="amber" icon="clock" /><KpiCard eyebrow="Completed this month" value="28" detail="92% on time" tone="green" icon="check" /><KpiCard eyebrow="Avg. resolution" value="3.8h" detail="0.6h faster than target" tone="purple" icon="activity" /></div><section className="panel workorders-panel"><div className="list-toolbar"><div className="tabs">{['All work orders', 'In progress', 'Scheduled', 'Completed'].map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div><div className="search-field compact"><Icon name="search" size={15} /><input placeholder="Search work orders" /></div></div><div className="data-table"><div className="table-head"><span>Work order</span><span>Asset</span><span>Priority</span><span>Owner</span><span>Due</span><span>Status</span><span /></div>{filtered.map((wo) => <div className="data-row" key={wo.id}><div><strong className="blue-text">{wo.id}</strong><span>{wo.title}<small>{wo.source}</small></span></div><span className="asset-tag">{wo.asset}</span><StatusBadge status={wo.priority} /><span className="person-cell"><span className="avatar tiny">{wo.owner.split(' ')[1]?.[0] || 'A'}</span>{wo.owner}</span><span className="due-cell"><Icon name="clock" size={14} />{wo.due}</span><StatusBadge status={wo.status} /><button className="icon-btn"><Icon name="more" size={17} /></button></div>)}</div></section></div>;
}

function Inventory({ partsData = parts }) {
  const shortageCount = partsData.filter((p) => p.status === 'Shortage').length;
  return <div className="page"><PageHeader eyebrow="Inventory service" title="Parts & inventory" description="Keep critical spares available for every maintenance scenario." action="Add part" /><div className="kpi-grid compact-kpis"><KpiCard eyebrow="Total parts" value="248" detail="Across 4 storage locations" tone="blue" icon="package" /><KpiCard eyebrow="Below reorder point" value={shortageCount} detail="Requires procurement action" tone="amber" icon="alert" /><KpiCard eyebrow="Inventory value" value="$184.2k" detail="+2.8% vs last month" tone="green" icon="gauge" /><KpiCard eyebrow="Open purchase orders" value="6" detail="2 arriving this week" tone="purple" icon="truck" /></div><section className="panel inventory-panel"><div className="list-toolbar"><div><h2>Critical parts</h2><p>Stock levels connected to your maintenance workflow</p></div><div className="toolbar-actions"><button className="select-btn"><Icon name="filter" size={15} />All locations<Icon name="down" size={14} /></button><button className="secondary-btn"><Icon name="download" size={15} /> Export</button></div></div><div className="data-table"><div className="table-head"><span>Part number</span><span>Description</span><span>On hand</span><span>Reorder point</span><span>Location</span><span>Supplier</span><span>Status</span></div>{partsData.map((part) => <div className="data-row" key={part.part || part.partNumber}><div><strong>{part.part || part.partNumber}</strong><span>{part.description || part.name}</span></div><span className={`stock-number ${part.status === 'Shortage' || part.quantityOnHand < part.reorderLevel ? 'low' : ''}`}>{part.onHand ?? part.quantityOnHand} units</span><span>{part.reorder ?? part.reorderLevel} units</span><span className="location-cell"><span className="location-pin" />{part.location || part.storageLocation || '—'}</span><span>{part.supplier || part.supplierName || '—'}</span><StatusBadge status={part.status || (part.quantityOnHand < part.reorderLevel ? 'Shortage' : 'Healthy')} /></div>)}</div></section></div>;
}

function Suppliers({ suppliersData = suppliers }) {
  return <div className="page"><PageHeader eyebrow="Supplier service" title="Suppliers" description="A connected vendor directory for faster repair planning." action="Add supplier" /><div className="supplier-toolbar"><div className="search-field"><Icon name="search" size={16} /><input placeholder="Search suppliers, parts or categories" /></div><button className="select-btn"><Icon name="filter" size={15} />All suppliers<Icon name="down" size={14} /></button></div><div className="supplier-grid">{suppliersData.map((supplier) => <div className="supplier-card panel" key={supplier.name || supplier.id}><div className="supplier-head"><div className={`supplier-logo ${supplier.tone || 'blue'}`}>{supplier.initials || (supplier.name || 'SP').slice(0, 2).toUpperCase()}</div><button className="icon-btn"><Icon name="more" size={17} /></button></div><h2>{supplier.name}</h2><p>{supplier.category || supplier.specialty || 'Industrial supplier'}</p><div className="supplier-rating"><StatusBadge status={supplier.rating || 'Approved'} /><span><span className="star">★</span> {supplier.score || '4.8'}</span></div><div className="supplier-stats"><div><span>Lead time</span><strong>{supplier.lead || supplier.leadTime || '—'}</strong></div><div><span>Orders YTD</span><strong>{supplier.orders || supplier.ordersYtd || '—'}</strong></div></div><button className="link-btn full">View supplier details <Icon name="arrow" size={14} /></button></div>)}</div></div>;
}

function AiDiagnosis({ machines, onCreate, onDiagnose }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hello Asad. I’m monitoring your simulated fleet. Ask me about a machine, alarm, maintenance procedure or production trend.' }]);
  const [selectedMachine, setSelectedMachine] = useState('DRV-001');
  const send = async () => {
    const question = query.trim() || `Why is ${selectedMachine} showing a warning?`;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setQuery('');
    try {
      const result = await onDiagnose({ machineId: selectedMachine, question });
      setMessages((prev) => [...prev, { role: 'assistant', text: result?.answer || 'No answer returned.' }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Could not reach the AI service. ${error.message}` }]);
    }
    setQuery('');
  };
  return <div className="page"><PageHeader eyebrow="AI service / grounded analysis" title="AI diagnosis" description="Ask questions about live machine context, history and maintenance knowledge." /><div className="ai-layout"><section className="panel copilot-panel"><div className="copilot-head"><div className="copilot-avatar"><Icon name="sparkles" size={21} /></div><div><h2>Operations Copilot</h2><p>Grounded in telemetry, work orders and maintenance documentation</p></div><span className="ai-mark">RAG enabled</span></div><div className="suggestion-row">{['Why is DRV-001 showing a warning?', 'Which machines need attention?', 'Compare CNC-001 with its baseline'].map((q) => <button key={q} onClick={() => setQuery(q)}>{q}<Icon name="arrow" size={13} /></button>)}</div><div className="chat-body">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={index}><div className="chat-avatar">{message.role === 'assistant' ? <Icon name="sparkles" size={15} /> : 'A'}</div><div className="chat-bubble">{message.text}{message.role === 'assistant' && index > 0 && <div className="answer-source"><span><Icon name="check" size={12} /> Telemetry</span><span><Icon name="check" size={12} /> Maintenance history</span><span><Icon name="check" size={12} /> SOP-DRV-04</span></div>}</div></div>)}</div><div className="chat-compose"><button className="select-btn"><Icon name="machine" size={14} />{selectedMachine}<Icon name="down" size={13} /></button><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask about your operation..." /><button className="send-btn" onClick={send}><Icon name="arrow" size={16} /></button></div><div className="chat-note"><Icon name="alert" size={13} /> AI responses are recommendations, not direct machine controls.</div></section><aside className="ai-side"><section className="panel ai-risk-card"><div className="panel-head"><div><h2>Failure risk</h2><p>Current prediction model</p></div><span className="model-tag">v0.3 heuristic</span></div><div className="risk-main"><Donut value={18} color="#c67b08" size={112} /><div><strong>Low overall risk</strong><p>1 asset needs review in the next 24 hours.</p></div></div><div className="risk-list">{machines.slice(0, 3).map((m, i) => <div key={m.id}><span><span className={`risk-dot ${i === 1 ? 'amber' : 'green'}`} />{m.id}</span><strong>{i === 1 ? '42%' : i === 2 ? '18%' : '6%'} risk</strong></div>)}</div></section><section className="panel knowledge-card"><div className="panel-head"><div><h2>Knowledge base</h2><p>Documents used in answers</p></div><Icon name="message" size={18} /></div><div className="knowledge-item"><span className="doc-icon pdf">PDF</span><div><strong>Drive maintenance SOP</strong><small>12 relevant chunks · Updated Sep 12</small></div></div><div className="knowledge-item"><span className="doc-icon doc">DOC</span><div><strong>SINAMICS G120X manual</strong><small>8 relevant chunks · Updated Aug 28</small></div></div><button className="link-btn full">Manage knowledge base <Icon name="arrow" size={14} /></button></section><button className="primary-btn full" onClick={() => onCreate()}><Icon name="wrench" size={15} /> Create work order from analysis</button></aside></div></div>;
}

function Settings() {
  return <div className="page"><PageHeader eyebrow="System configuration" title="Settings" description="Manage workspace preferences, simulator behavior and access." /><div className="settings-layout"><aside className="panel settings-nav"><button className="active"><Icon name="settings" size={16} />Workspace</button><button><Icon name="user" size={16} />Users & roles</button><button><Icon name="activity" size={16} />Data connections</button><button><Icon name="machine" size={16} />Simulator</button><button><Icon name="bell" size={16} />Notifications</button></aside><section className="panel settings-content"><div className="settings-section"><h2>Workspace details</h2><p>Basic information displayed across the operations center.</p><label>Workspace name<input defaultValue="Sentinel Manufacturing · Plant 01" /></label><label>Time zone<select defaultValue="Asia/Calcutta"><option>Asia/Calcutta</option><option>Europe/Berlin</option><option>America/New_York</option></select></label></div><div className="settings-section"><h2>Simulation environment</h2><p>These settings control the demo telemetry stream.</p><div className="setting-row"><div><strong>Simulated data stream</strong><span>Generate readings for all 5 assets every 2 seconds.</span></div><div className="toggle on"><i /></div></div><div className="setting-row"><div><strong>Auto-create work orders</strong><span>Create a ticket when health falls below the critical threshold.</span></div><div className="toggle on"><i /></div></div></div><div className="settings-actions"><button className="secondary-btn">Cancel</button><button className="primary-btn">Save changes</button></div></section></div></div>;
}

function App() {
  const [activePage, setActivePage] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [machines, setMachines] = useState(machinesSeed);
  const [selectedMachine, setSelectedMachine] = useState('CNC-001');
  const [workOrders, setWorkOrders] = useState(workOrdersSeed);
  const [partsState, setPartsState] = useState(parts);
  const [suppliersState, setSuppliersState] = useState(suppliers);
  const [toast, setToast] = useState(null);
  const [noticeCount, setNoticeCount] = useState(2);
  const [dataMode, setDataMode] = useState(liveApiEnabled ? 'connecting' : 'demo');
  const [streamStatus, setStreamStatus] = useState(liveApiEnabled ? 'connecting' : 'demo');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    fetch(`${apiBaseUrl}/auth/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) throw new Error('Invalid email or password');
      const me = await fetch(`${apiBaseUrl}/auth/me`, { credentials: 'include' }).then((r) => r.json());
      setUser(me);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Logout request failed');
      setUser(null);
      setLoginForm({ email: '', password: '' });
      setActivePage('overview');
    } catch (error) {
      notify(`Could not log out. ${error.message}`, 'warning');
    }
  };

  useEffect(() => {
    if (liveApiEnabled) return undefined;
    const interval = setInterval(() => {
      setMachines((current) => current.map((m) => {
        const drift = (Math.random() - .5) * (m.status === 'Warning' ? 1.5 : .6);
        const nextTemp = Math.max(35, m.temperature + drift);
        const nextTrend = [...m.trend.slice(-8), nextTemp];
        return { ...m, temperature: nextTemp, metric: nextTemp.toFixed(1), trend: nextTrend };
      }));
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!liveApiEnabled || !authChecked || !user) return undefined;
    let cancelled = false;
    loadGatewaySnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot.machines?.length) {
          setMachines(snapshot.machines);
          setSelectedMachine((current) => snapshot.machines.some((machine) => machine.id === current) ? current : snapshot.machines[0].id);
        }
        if (snapshot.workOrders?.length) setWorkOrders(snapshot.workOrders);
        if (snapshot.parts?.length) setPartsState(snapshot.parts);
        if (snapshot.suppliers?.length) setSuppliersState(snapshot.suppliers);
        setDataMode('live');
        setStreamStatus('connected');
      })
      .catch((error) => {
        if (cancelled) return;
        setDataMode('fallback');
        setStreamStatus('error');
        notify(`Gateway unavailable — showing demo data. ${error.message}`, 'warning');
      });
    return () => { cancelled = true; };
  }, [authChecked, user]);

  useEffect(() => {
    if (!liveApiEnabled || !authChecked || !user) return undefined;
    return subscribeToTelemetry((reading) => {
      const machineId = reading.machineId || reading.assetId;
      if (!machineId) return;
      setMachines((current) => current.map((machine) => machine.id === machineId ? mergeTelemetryReading(machine, reading) : machine));
    }, (status) => {
      setStreamStatus(status);
      if (status === 'connected') setDataMode('live');
    });
  }, [authChecked, user]);

  const notify = (message, tone = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4200);
  };

  const applyLocalReading = (id, value = 98) => {
    setMachines((current) => current.map((machine) => machine.id === id ? { ...machine, status: 'Warning', health: Math.min(machine.health, 68), temperature: Number(value), metric: Number(value).toFixed(1), trend: [...machine.trend.slice(-8), Number(value)] } : machine));
  };

  const triggerReading = async (id, value = 98) => {
    if (liveApiEnabled) {
      applyLocalReading(id, value);
      try {
        await postOverride(id, value, 30);
        setDataMode('live');
        notify(`Override sent to the simulation service for ${id}`, 'warning');
      } catch (error) {
        setDataMode('fallback');
        notify(`Could not reach simulation service. ${error.message}`, 'warning');
      }
      return;
    }
    applyLocalReading(id, value);
    const exists = workOrders.some((wo) => wo.asset === id && wo.source === 'Predictive alert');
    if (!exists) setWorkOrders((current) => [{ id: 'WO-1043', asset: id, title: 'Investigate abnormal sensor reading', priority: 'High', status: 'In progress', owner: 'A. Mehta', due: 'Today, 17:00', source: 'Predictive alert' }, ...current]);
    setNoticeCount((n) => n + 1);
    notify(`Work order WO-1043 created for ${id}`, 'warning');
  };

  const resetMachine = async (id) => {
    setMachines((current) => current.map((machine) => machine.id === id ? { ...machine, status: 'Running', health: machine.id === 'CNC-001' ? 96 : 90, temperature: machine.id === 'CNC-001' ? 67.4 : machine.temperature, metric: machine.id === 'CNC-001' ? '67.4' : machine.metric } : machine));
    if (liveApiEnabled) {
      try {
        await resetSimulation(id);
        notify(`${id} reset command sent to the simulation service`, 'success');
      } catch (error) {
        setDataMode('fallback');
        notify(`Could not reach simulation service. ${error.message}`, 'warning');
      }
    } else {
      notify(`${id} reset to baseline`, 'success');
    }
  };

  const handleCreateWorkOrder = async (assetIdArg) => {
    const assetId = typeof assetIdArg === 'string' ? assetIdArg : selectedMachine;
    if (!liveApiEnabled) {
      notify('New work order form is ready', 'success');
      return;
    }
    try {
      const created = await createWorkOrder({ assetId, title: 'Operator-created maintenance request', priority: 'Medium', source: 'Operations dashboard' });
      if (created) setWorkOrders((current) => [{ ...created, id: created.id || created.workOrderId || `WO-${Date.now().toString().slice(-4)}` }, ...current]);
      notify('Work order created through the maintenance service', 'success');
    } catch (error) {
      notify(`Could not create work order. ${error.message}`, 'warning');
    }
  };

  const handleDiagnose = async (payload) => {
    if (!liveApiEnabled) return undefined;
    return diagnoseAsset(payload);
  };

  const navigate = (page, id) => {
    setActivePage(page);
    if (id) setSelectedMachine(id);
    setMobileNav(false);
  };

  const page = useMemo(() => {
    if (activePage === 'overview') return <Dashboard machines={machines} onNavigate={navigate} onTrigger={triggerReading} />;
    if (activePage === 'assets') return <Assets machines={machines} selectedId={selectedMachine} onSelect={setSelectedMachine} onTrigger={triggerReading} onReset={resetMachine} />;
    if (activePage === 'telemetry') return <Telemetry machines={machines} onSelect={(id) => navigate('assets', id)} onTrigger={triggerReading} />;
    if (activePage === 'work-orders') return <WorkOrders workOrders={workOrders} onCreate={handleCreateWorkOrder} />;
    if (activePage === 'inventory') return <Inventory partsData={partsState} />;
    if (activePage === 'suppliers') return <Suppliers suppliersData={suppliersState} />;
    if (activePage === 'ai') return <AiDiagnosis machines={machines} onCreate={handleCreateWorkOrder} onDiagnose={handleDiagnose} />;
    return <Settings />;
  }, [activePage, machines, selectedMachine, workOrders, partsState, suppliersState, dataMode]);

  if (!authChecked) return <div className="page">Loading…</div>;

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 360, margin: '80px auto' }}>
        <h1>Sign in</h1>
        <form onSubmit={handleLogin}>
          <input placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
          <input placeholder="Password" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
          <button className="primary-btn" type="submit">Log in</button>
        </form>
        {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
      </div>
    );
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Icon name="grid" size={19} /></button>
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>sentinel</strong><small>OPERATIONS</small></div></div>
      <div className="top-search"><Icon name="search" size={16} /><input placeholder="Search assets, work orders, suppliers..." /><kbd>⌘ K</kbd></div>
      <div className="top-actions">
        <span className="environment-pill"><span className={`live-pulse ${dataMode === 'fallback' ? 'offline-pulse' : ''}`} />{dataMode === 'live' ? 'Live API' : dataMode === 'connecting' ? 'Connecting' : 'Simulation'}</span>
        <button className="top-icon" onClick={() => { setNoticeCount(0); notify('You’re all caught up', 'success'); }}><Icon name="bell" size={18} />{noticeCount > 0 && <b>{noticeCount}</b>}</button>
        <span className="top-divider" />
        <button className="profile"><span className="avatar">AR</span><span><strong>Asad Raqib</strong><small>Administrator</small></span><Icon name="down" size={13} /></button>
        <button className="logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    </header>
    <div className="body-layout"><aside className={`sidebar ${mobileNav ? 'open' : ''}`}><div className="workspace-switcher"><span className="workspace-icon">S</span><div><strong>Sentinel Manufacturing</strong><span>Plant 01 · Workspace</span></div><Icon name="down" size={14} /></div><nav>{['Workspace', 'Operations', 'Intelligence', 'System'].map((group) => <div className="nav-group" key={group}><span className="nav-label">{group}</span>{nav.filter((item) => item.group === group).map((item) => <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.live && <span className="nav-live" />}{item.ai && <span className="nav-ai">AI</span>}{item.count && <em>{item.count}</em>}</button>)}</div>)}</nav><div className="sidebar-footer"><div className="data-status"><span className={`live-pulse ${streamStatus === 'error' ? 'offline-pulse' : ''}`} /><div><strong>{dataMode === 'live' ? 'Gateway connected' : dataMode === 'fallback' ? 'Demo mode active' : 'All services healthy'}</strong><small>{dataMode === 'live' ? `WebSocket · ${streamStatus}` : dataMode === 'fallback' ? 'Set VITE_API_BASE_URL to connect' : 'Local simulated telemetry'}</small></div></div><div className="sidebar-help"><div className="help-icon">?</div><div><strong>Need a hand?</strong><span>Open help center</span></div><Icon name="arrow" size={14} /></div></div></aside><main className="main-content">{page}</main></div>
    {toast && <div className={`toast ${toast.tone}`}><div className="toast-icon"><Icon name={toast.tone === 'warning' ? 'alert' : 'check'} size={17} /></div><div><strong>{toast.tone === 'warning' ? 'Predictive alert' : 'Action completed'}</strong><span>{toast.message}</span></div><button onClick={() => setToast(null)}>×</button></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);