export interface LiveAssetDto {
  id: string;
  name: string;
  type: string;
  model: string;
  location: string;
  status: string;
  health: number;
  temperature: number;
  vibration: number;
  load: number;
  power: number;
  accent: string;
  metricLabel: string;
  metric: number;
  secondaryLabel: string;
  secondary: string;
  production: string;
  trend: number[];
}

export interface LiveWorkOrderDto {
  id: string;
  asset: string;
  title: string;
  priority: string;
  status: string;
  owner: string;
  due: string;
  source: string;
}

export interface LivePartDto {
  id: string;
  name: string;
  onHand: number;
  reorderLevel: number;
  unitCost: number;
  supplierId: string;
}

export interface LiveSupplierDto {
  id: string;
  name: string;
  contact: string;
  phone: string;
  rating: number;
}

export interface LiveUserDto {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface LiveSnapshot {
  assets: LiveAssetDto[];
  workOrders: LiveWorkOrderDto[];
  parts: LivePartDto[];
  suppliers: LiveSupplierDto[];
}

export interface LiveDashboardSummary {
  assetsOnline: number;
  assetsTotal: number;
  fleetHealth: number;
  activeAlarms: number;
  healthTrend: number[];
}

export interface TelemetryMessage {
  machineId: string;
  sensorType: string;
  value: number;
  healthScore: number;
  status: string;
  recordedAt: string;
}

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const apiBaseUrl = configuredApiBaseUrl.replace(/\/api$/, '');
const telemetryUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws/simulation';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    const body = await response.text();
    if (response.status === 401) message = 'Sign in is required to access the live services.';
    try {
      const payload = JSON.parse(body) as { message?: string; error?: string };
      if (response.status !== 401) message = payload.message || payload.error || message;
    } catch {
      if (body && response.status !== 401) message = body;
    }
    throw new Error(message);
  }

  const body = await response.text();
  return body ? JSON.parse(body) as T : undefined as T;
}

export const liveApi = {
  getCurrentUser() {
    return request<LiveUserDto>('/api/auth/me');
  },

  login(email: string, password: string) {
    return request<LiveUserDto>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  register(name: string, email: string, password: string) {
    return request<LiveUserDto>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  logout() {
    return request<void>('/api/auth/logout', { method: 'POST' });
  },

  async getSnapshot(): Promise<LiveSnapshot> {
    const [assets, workOrders, parts, supplierEnvelope] = await Promise.all([
      request<LiveAssetDto[]>('/api/assets'),
      request<LiveWorkOrderDto[]>('/api/work-orders'),
      request<LivePartDto[]>('/api/parts'),
      request<{ suppliers: { items: LiveSupplierDto[] } }>('/api/suppliers')
    ]);

    return { assets, workOrders, parts, suppliers: supplierEnvelope.suppliers.items };
  },

  getDashboardSummary() {
    return request<LiveDashboardSummary>('/api/dashboard/summary');
  },

  createWorkOrder(input: { assetId: string; title: string; priority?: string; owner?: string; due?: string }) {
    return request<LiveWorkOrderDto>('/api/work-orders', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  override(machineId: string, value: number, holdSeconds = 30) {
    return request<{ machineId: string; value: number; holdSeconds: number }>(
      `/api/simulation/${encodeURIComponent(machineId)}/override`,
      { method: 'POST', body: JSON.stringify({ value, holdSeconds }) }
    );
  },

  resetAsset(machineId: string) {
    return request<{ machineId: string; reset: boolean }>(
      `/api/simulation/${encodeURIComponent(machineId)}/reset`,
      { method: 'POST' }
    );
  },

  diagnose(machineId: string, question: string) {
    return request<{ answer: string; machineId: string; sources: string[] }>(
      '/api/ai/diagnose',
      { method: 'POST', body: JSON.stringify({ machineId, question }) }
    );
  },

  connectTelemetry(onMessage: (message: TelemetryMessage) => void, onStatus?: (connected: boolean) => void) {
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(telemetryUrl);
      socket.onopen = () => onStatus?.(true);
      socket.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data) as TelemetryMessage);
        } catch {
          onStatus?.(false);
        }
      };
      socket.onclose = () => {
        onStatus?.(false);
        if (!closed) retryTimer = window.setTimeout(connect, 3000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }
};