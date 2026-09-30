const apiEnv = import.meta.env.VITE_API_BASE_URL;
const wsEnv = import.meta.env.VITE_WS_URL;

export const liveApiEnabled = import.meta.env.VITE_ENABLE_LIVE_API === 'true' || Boolean(apiEnv);
export const apiBaseUrl = (apiEnv || '/api').replace(/\/$/, '');

function toWsUrl() {
  if (wsEnv) return wsEnv;
  if (apiEnv) return apiEnv.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws/simulation';
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/simulation`;
}

export const wsUrl = toWsUrl();

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function listFrom(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function normalizeMachine(raw) {
  const status = raw.status || raw.state || 'Running';
  const type = raw.type || raw.assetType || 'CNC';
  const metric = raw.metric ?? raw.temperature ?? raw.currentTemperature ?? 0;
  return {
    id: raw.id || raw.machineId || raw.assetId,
    name: raw.name || raw.displayName || raw.model || 'Industrial asset',
    type,
    model: raw.model || raw.manufacturer || 'Connected asset',
    location: raw.location || raw.line || 'Plant floor',
    status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
    health: Number(raw.health ?? raw.healthScore ?? 100),
    temperature: Number(raw.temperature ?? raw.currentTemperature ?? metric ?? 0),
    vibration: Number(raw.vibration ?? raw.vibrationRms ?? 0),
    load: Number(raw.load ?? raw.motorLoad ?? 0),
    power: Number(raw.power ?? raw.powerDraw ?? 0),
    unit: raw.unit || '°C',
    accent: raw.accent || '#1677c8',
    trend: raw.trend || [Number(metric || 0)],
    metricLabel: raw.metricLabel || 'Temperature',
    metric: Number(metric || 0).toFixed(1),
    secondaryLabel: raw.secondaryLabel || 'Load',
    secondary: raw.secondary || `${Number(raw.load || 0)}%`,
    production: raw.production || raw.productionCount || '—',
    icon: raw.icon || type.toLowerCase(),
  };
}

function normalizeWorkOrder(raw) {
  return {
    id: raw.id || raw.workOrderId || raw.number,
    asset: raw.asset || raw.assetId || raw.machineId || '—',
    title: raw.title || raw.description || raw.summary || 'Maintenance work order',
    priority: raw.priority || 'Medium',
    status: raw.status || 'Scheduled',
    owner: raw.owner || raw.assignedTechnician || 'Unassigned',
    due: raw.due || raw.dueAt || raw.scheduledFor || 'Not scheduled',
    source: raw.source || raw.createdBy || 'Maintenance service',
  };
}

export async function loadGatewaySnapshot() {
  const endpoints = [
    ['machines', '/assets'],
    ['workOrders', '/work-orders'],
    ['parts', '/parts'],
    ['suppliers', '/suppliers'],
  ];

  const results = await Promise.allSettled(endpoints.map(([, path]) => request(path)));
  const snapshot = {};

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const [key] = endpoints[index];
    if (key === 'machines') snapshot.machines = listFrom(result.value, ['assets', 'machines']).map(normalizeMachine);
    if (key === 'workOrders') snapshot.workOrders = listFrom(result.value, ['workOrders', 'items']).map(normalizeWorkOrder);
    if (key === 'parts') snapshot.parts = listFrom(result.value, ['parts', 'items']);
    if (key === 'suppliers') snapshot.suppliers = listFrom(result.value, ['suppliers', 'items']);
  });

  if (!snapshot.machines?.length) {
    throw new Error('The gateway responded, but no assets were returned from GET /assets.');
  }

  return snapshot;
}

export function loadDashboardSummary() {
  return request('/dashboard/summary');
}

export function loadWorkOrdersForAsset(assetId) {
  return request(`/work-orders?assetId=${encodeURIComponent(assetId)}`)
    .then((data) => listFrom(data, ['workOrders', 'items']).map(normalizeWorkOrder));
}

export function postOverride(machineId, value, holdSeconds = 30) {
  return request(`/simulation/${encodeURIComponent(machineId)}/override`, {
    method: 'POST',
    body: { value, holdSeconds },
  });
}

export function resetSimulation(machineId) {
  return request(`/simulation/${encodeURIComponent(machineId)}/reset`, { method: 'POST' });
}

export function createWorkOrder(payload) {
  return request('/work-orders', { method: 'POST', body: payload });
}

export function diagnoseAsset(payload) {
  return request('/ai/diagnose', { method: 'POST', body: payload });
}

export function subscribeToTelemetry(onReading, onStatus) {
  if (!liveApiEnabled || typeof WebSocket === 'undefined') return () => { };

  let socket;
  let reconnectTimer;
  let closed = false;

  const connect = () => {
    if (closed) return;
    onStatus?.('connecting');
    socket = new WebSocket(wsUrl);
    socket.onopen = () => onStatus?.('connected');
    socket.onmessage = (event) => {
      try {
        const reading = JSON.parse(event.data);
        onReading(reading);
      } catch {
        onStatus?.('error');
      }
    };
    socket.onerror = () => onStatus?.('error');
    socket.onclose = () => {
      if (!closed) {
        onStatus?.('reconnecting');
        reconnectTimer = window.setTimeout(connect, 3000);
      }
    };
  };

  connect();
  return () => {
    closed = true;
    window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}

export function mergeTelemetryReading(machine, reading) {
  const value = Number(reading.value ?? reading.temperature ?? reading.currentValue);
  if (!Number.isFinite(value)) return machine;
  const sensorType = (reading.sensorType || reading.metric || 'temperature').toLowerCase();
  const next = { ...machine, trend: [...(machine.trend || []).slice(-8), value] };
  if (sensorType.includes('temp')) {
    next.temperature = value;
    next.metric = value.toFixed(1);
  }
  if (sensorType.includes('vibr')) next.vibration = value;
  if (sensorType.includes('load')) next.load = value;
  if (sensorType.includes('power')) next.power = value;
  if (reading.healthScore != null) next.health = Number(reading.healthScore);
  if (reading.status) next.status = String(reading.status).charAt(0).toUpperCase() + String(reading.status).slice(1).toLowerCase();
  return next;
}