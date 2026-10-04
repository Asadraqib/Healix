/** Presentation-only telemetry filtering. Raw backend/simulation values are retained separately. */
export const LIVE_DATA_CONFIG = {
  displayUpdateIntervalMs: 750,
  staleAfterMs: 5_000,
  chartWindowSize: 30,
  metrics: {
    temperature: {
      alpha: 0.16,
      minChange: 0.08,
      maxRatePerSecond: 2.5,
      outlierDelta: 24,
      min: -40,
      max: 250,
    },
    pressure: {
      alpha: 0.28,
      minChange: 0.1,
      maxRatePerSecond: 18,
      outlierDelta: 80,
      min: 0,
      max: 2_000,
    },
    rpm: {
      alpha: 0.38,
      minChange: 1,
      maxRatePerSecond: 1_200,
      outlierDelta: 4_000,
      min: 0,
      max: 100_000,
    },
    power: {
      alpha: 0.28,
      minChange: 0.1,
      maxRatePerSecond: 100,
      outlierDelta: 500,
      min: 0,
      max: 100_000,
    },
    utilization: {
      alpha: 0.18,
      minChange: 0.2,
      maxRatePerSecond: 16,
      outlierDelta: 45,
      min: 0,
      max: 100,
    },
    vibration: {
      alpha: 0.3,
      minChange: 0.03,
      maxRatePerSecond: 8,
      outlierDelta: 30,
      min: 0,
      max: 500,
    },
    production: {
      alpha: 1,
      minChange: 1,
      maxRatePerSecond: Infinity,
      outlierDelta: Infinity,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      monotonic: true,
    },
  },
} as const;

type MetricName = keyof typeof LIVE_DATA_CONFIG.metrics;
type MetricConfig = {
  alpha: number;
  minChange: number;
  maxRatePerSecond: number;
  outlierDelta: number;
  min: number;
  max: number;
  monotonic?: boolean;
};

interface ProcessorState {
  value: number;
  timestamp: number;
}
export interface ProcessedReading {
  value: number;
  rawValue: number;
  anomaly: boolean;
}

const metricName = (type: string): MetricName => {
  const normalized = type.toLowerCase();
  if (normalized.includes('temp')) return 'temperature';
  if (normalized.includes('press')) return 'pressure';
  if (normalized.includes('rpm') || normalized.includes('speed')) return 'rpm';
  if (normalized.includes('power') || normalized.includes('energy')) return 'power';
  if (normalized.includes('load') || normalized.includes('util')) return 'utilization';
  if (normalized.includes('vibr')) return 'vibration';
  if (normalized.includes('production') || normalized.includes('count')) return 'production';
  return 'power';
};

export class TelemetryProcessor {
  private readonly states = new Map<string, ProcessorState>();

  reset() {
    this.states.clear();
  }

  process(
    key: string,
    type: string,
    rawValue: number,
    timestamp = Date.now(),
    urgent = false,
  ): ProcessedReading | null {
    if (!Number.isFinite(rawValue)) return null;
    const config = LIVE_DATA_CONFIG.metrics[metricName(type)] as MetricConfig;
    const boundedRaw = Math.min(config.max, Math.max(config.min, rawValue));
    const previous = this.states.get(key);
    if (!previous || urgent) {
      this.states.set(key, { value: boundedRaw, timestamp });
      return { value: boundedRaw, rawValue, anomaly: false };
    }

    const elapsedSeconds = Math.max(0.1, (timestamp - previous.timestamp) / 1_000);
    const anomaly = Math.abs(boundedRaw - previous.value) > config.outlierDelta;
    let next = config.monotonic
      ? Math.max(previous.value, boundedRaw)
      : previous.value + (boundedRaw - previous.value) * config.alpha;

    if (!config.monotonic) {
      const maxStep = config.maxRatePerSecond * elapsedSeconds;
      next = Math.min(previous.value + maxStep, Math.max(previous.value - maxStep, next));
      if (Math.abs(next - previous.value) < config.minChange) next = previous.value;
    }

    this.states.set(key, { value: next, timestamp });
    return { value: Number(next.toFixed(2)), rawValue, anomaly };
  }
}
