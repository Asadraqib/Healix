import type { Asset, AssetStatus } from '../types';
import type { TelemetryMessage } from './liveApi';

// Display filtering only: raw server faults are never inferred from smoothed values.
export const TELEMETRY_CONFIG = {
  displayIntervalMs: 2000,
  staleAfterMs: 15000,
  recoverySamples: 3,
  alpha: 0.2,
  healthAlpha: 0.15,
  healthRatePerSecond: 1,
};
const policies: Record<string, { min: number; max: number; threshold: number; rate: number; jump: number }> = {
  temperature: { min: -50, max: 500, threshold: 0.1, rate: 0.25, jump: 8 },
  vibration: { min: 0, max: 100, threshold: 0.02, rate: 0.05, jump: 2 },
  load: { min: 0, max: 100, threshold: 0.5, rate: 1, jump: 15 },
  power: { min: 0, max: 10000, threshold: 0.1, rate: 0.2, jump: 5 },
};
Object.assign(policies, {
  pressure: { min: 0, max: 10000, threshold: .01, rate: 2, jump: 30 },
  speed: { min: 0, max: 30000, threshold: 1, rate: 40, jump: 1000 },
  torque: { min: 0, max: 10000, threshold: .1, rate: 2, jump: 30 },
  position: { min: 0, max: 100, threshold: .0001, rate: .005, jump: .03 },
  current: { min: 0, max: 10000, threshold: .1, rate: 1, jump: 10 },
  voltage: { min: 0, max: 10000, threshold: .1, rate: 1, jump: 10 },
  flow: { min: 0, max: 10000, threshold: .1, rate: 1, jump: 10 },
  production: { min: 0, max: Number.MAX_SAFE_INTEGER, threshold: 1, rate: 100, jump: 10000 },
});
interface Channel {
  rawValue?: number;
  target: number;
  displayed: number;
  lastPacket: number;
  receivedAt: number;
  displayedAt: number;
  candidate?: number;
  candidateCount: number;
}
interface Health {
  target: number;
  displayed: number;
  status: AssetStatus;
  recovery: number;
  lastPacket: number;
  receivedAt: number;
  displayedAt: number;
}
const severity = { HEALTHY: 0, DEGRADED: 1, DOWN: 2 };
const statusOf = (status: string): AssetStatus | undefined => {
  switch (status.toLowerCase()) {
    case 'fault': case 'down': case 'critical': return 'DOWN';
    case 'warning': case 'degraded': return 'DEGRADED';
    case 'running': case 'healthy': return 'HEALTHY';
    default: return undefined;
  }
};
const move = (from: number, target: number, maxStep: number) =>
  from + Math.max(-maxStep, Math.min(maxStep, target - from));

export class TelemetryStabilizer {
  private channels = new Map<string, Channel>();
  private health = new Map<string, Health>();
  private lastReceived = 0;

  private config: typeof TELEMETRY_CONFIG;

  constructor(config = TELEMETRY_CONFIG) { this.config = config; }

  seed(assets: Asset[], now = Date.now()) {
    this.channels.clear();
    this.health.clear();
    this.lastReceived = now;
    for (const asset of assets) {
      this.health.set(asset.id, { target: asset.healthScore, displayed: asset.healthScore,
        status: asset.status, recovery: 0, lastPacket: 0, receivedAt: asset.lastSeenAt ? Date.parse(asset.lastSeenAt) : now, displayedAt: now });
      for (const sensor of asset.sensors) {
        if (!Number.isFinite(sensor.currentValue)) continue;
        this.channels.set(`${asset.id}:${sensor.type.toLowerCase()}`, {
          target: sensor.currentValue, displayed: sensor.currentValue, lastPacket: 0,
          receivedAt: now, displayedAt: now, candidateCount: 0,
        });
      }
    }
  }

  ingest(message: TelemetryMessage, now = Date.now()): AssetStatus | undefined {
    if (!message || typeof message.machineId !== 'string' || typeof message.sensorType !== 'string'
      || typeof message.status !== 'string' || typeof message.recordedAt !== 'string') return;
    const packetAt = Date.parse(message.recordedAt);
    const policy = policies[message.sensorType.toLowerCase()];
    const channel = this.channels.get(`${message.machineId}:${message.sensorType.toLowerCase()}`);
    const health = this.health.get(message.machineId);
    const status = statusOf(message.status);
    if (!channel || !policy || !health || !status || !Number.isFinite(packetAt)
      || packetAt > now + 30000 || now - packetAt > this.config.staleAfterMs
      || packetAt <= channel.lastPacket || !Number.isFinite(message.value)
      || message.value < policy.min || message.value > policy.max
      || !Number.isFinite(message.healthScore) || message.healthScore < 0 || message.healthScore > 100) return;
    channel.rawValue = message.value;
    channel.lastPacket = packetAt;
    channel.receivedAt = now;
    this.lastReceived = now;

    // A single large spike is held; three consistent samples confirm a step.
    if (Math.abs(message.value - channel.target) > policy.jump) {
      const consistent = channel.candidate !== undefined && Math.abs(message.value - channel.candidate) <= policy.jump / 2;
      channel.candidateCount = consistent ? channel.candidateCount + 1 : 1;
      channel.candidate = message.value;
      if (channel.candidateCount >= 3) {
        channel.target += this.config.alpha * (message.value - channel.target);
      }
    } else {
      channel.candidateCount = 0;
      channel.candidate = undefined;
      channel.target += this.config.alpha * (message.value - channel.target);
    }

    // Multiple sensor messages from one timestamp count as one health sample.
    if (packetAt > health.lastPacket) {
      health.lastPacket = packetAt;
      health.receivedAt = now;
      health.target += this.config.healthAlpha * (message.healthScore - health.target);
      if (severity[status] >= severity[health.status]) {
        health.status = status;
        health.recovery = 0;
      } else if (++health.recovery >= this.config.recoverySamples) {
        health.status = status;
        health.recovery = 0;
      }
      if (status === 'DOWN') {
        health.target = message.healthScore;
        health.displayed = Math.min(health.displayed, message.healthScore);
        return 'DOWN';
      }
      if (status === 'DEGRADED') return health.status;
    }
  }

  isFresh(now = Date.now()) {
    return now - this.lastReceived <= this.config.staleAfterMs;
  }

  flush(assets: Asset[], now = Date.now()): Asset[] {
    let fleetChanged = false;
    const result = assets.map(asset => {
      const health = this.health.get(asset.id);
      if (!health) return asset;
      if (now - health.receivedAt <= this.config.staleAfterMs) {
        const dt = Math.min((now - health.displayedAt) / 1000, this.config.displayIntervalMs / 1000);
        health.displayed = move(health.displayed, health.target, this.config.healthRatePerSecond * Math.max(0, dt));
      }
      health.displayedAt = now;
      let changed = false;
      const age = now - health.receivedAt;
      const connectionState: Asset['connectionState'] = age > 45000 ? 'DISCONNECTED' : age > this.config.staleAfterMs ? 'DELAYED' : 'CONNECTED';
      const lastSeenAt = new Date(health.lastPacket || health.receivedAt).toISOString();
      const sensors = asset.sensors.map(sensor => {
        const key = sensor.type.toLowerCase();
        const channel = this.channels.get(`${asset.id}:${key}`);
        const policy = policies[key];
        if (!channel || !policy || now - channel.receivedAt > this.config.staleAfterMs) return sensor;
        const dt = Math.min((now - channel.displayedAt) / 1000, this.config.displayIntervalMs / 1000);
        const next = move(channel.displayed, channel.target, policy.rate * Math.max(0, dt));
        channel.displayedAt = now;
        if (Math.abs(next - channel.displayed) < policy.threshold && sensor.rawValue === channel.rawValue) return sensor;
        channel.displayed = Number(next.toFixed(2));
        changed = true;
        return { ...sensor, currentValue: channel.displayed, rawValue: channel.rawValue, lastSeenAt: new Date(channel.lastPacket).toISOString(),
          history: [...sensor.history.slice(-29), channel.displayed] };
      });
      const score = Number(health.displayed.toFixed(1));
      const scoreStatus: AssetStatus = score < 60 ? 'DOWN' : score < 85 ? 'DEGRADED' : 'HEALTHY';
      const displayedStatus = severity[scoreStatus] > severity[health.status] ? scoreStatus : health.status;
      if (!changed && score === asset.healthScore && displayedStatus === asset.status && asset.connectionState === connectionState && asset.lastSeenAt === lastSeenAt) return asset;
      fleetChanged = true;
      return { ...asset, sensors, healthScore: score, status: displayedStatus, connectionState, lastSeenAt };
    });
    return fleetChanged ? result : assets;
  }
}
