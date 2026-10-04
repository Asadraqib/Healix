package com.sentinel.asset_service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Component;

/**
 * Generates replaceable demo telemetry for assets not connected to a real
 * adapter.
 */
@Component
public class SimulationEngine {

  private static final int HISTORY_LIMIT = 60;
  private final AssetRepository repo;
  private final Map<String, AssetState> states = new ConcurrentHashMap<>();
  private final java.util.Deque<Integer> fleetHealthHistory = new ConcurrentLinkedDeque<>();
  private long tickCount;

  public SimulationEngine(AssetRepository repo) {
    this.repo = repo;
  }

  @PostConstruct
  public void load() {
    for (AssetRow row : repo.findAll()) {
      AssetState s = new AssetState();
      s.id = row.id();
      s.temperature = row.temperature().doubleValue();
      s.baseTemperature = row.baseTemperature().doubleValue();
      s.vibration = row.vibration().doubleValue();
      s.baseVibration = row.baseVibration().doubleValue();
      s.load = row.loadPct();
      s.baseLoad = row.baseLoadPct();
      s.power = row.powerKw().doubleValue();
      s.basePower = row.basePowerKw().doubleValue();
      s.rpm = row.rpm();
      s.baseRpm = row.baseRpm();
      s.productionCount = s.baseProductionCount = row.productionCount();
      s.health = row.health();
      s.baseHealth = row.baseHealth();
      s.status = row.status();
      s.telemetrySource = row.telemetrySource() == null ? "GENERATED_DEMO" : row.telemetrySource();
      s.lastSeenAt = row.lastSeenAt() == null ? Instant.now() : row.lastSeenAt();
      states.put(s.id, s);
    }
  }

  public synchronized Collection<AssetState> all() {
    return snapshots();
  }

  public synchronized List<AssetState> snapshots() {
    return states
      .values()
      .stream()
      .map(source -> {
        AssetState copy = new AssetState();
        copy.id = source.id;
        copy.temperature = source.temperature;
        copy.vibration = source.vibration;
        copy.load = source.load;
        copy.power = source.power;
        copy.rpm = source.rpm;
        copy.productionCount = source.productionCount;
        copy.health = source.health;
        copy.status = source.status;
        copy.telemetrySource = source.telemetrySource;
        copy.lastSeenAt = source.lastSeenAt;
        return copy;
      })
      .toList();
  }

  /** One step, called by the scheduler every four seconds. */
  public synchronized List<AssetState> tick() {
    tickCount++;
    Instant now = Instant.now();
    for (AssetState s : states.values()) {
      // Real adapters own connected assets; the demo generator must not overwrite
      // them.
      if ("CONNECTED_MACHINE".equalsIgnoreCase(s.telemetrySource)) continue;

      if (!now.isBefore(s.holdUntil)) {
        s.temperature = drift(s.temperature, s.baseTemperature, 0.12, 3.0, -50, 500);
        s.vibration = drift(s.vibration, s.baseVibration, 0.015, 0.35, 0, 100);
        s.load = clampInt(drift(s.load, s.baseLoad, 0.7, 4.0, 0, 100), 0, 100);
        s.power = drift(s.power, s.basePower, 0.04, 0.8, 0, 10000);
        if (s.baseRpm > 0) s.rpm = clampInt(drift(s.rpm, s.baseRpm, 18, 300, 0, 30000), 0, 30000);
        if (s.load > 5 && ThreadLocalRandom.current().nextDouble() < 0.15) s.productionCount++;
      }

      updateHealth(s);
      s.telemetrySource = "GENERATED_DEMO";
      s.lastSeenAt = now;
    }

    int average = (int) states
      .values()
      .stream()
      .mapToInt(s -> s.health)
      .average()
      .orElse(0);
    fleetHealthHistory.addLast(average);
    while (fleetHealthHistory.size() > HISTORY_LIMIT) fleetHealthHistory.pollFirst();
    return List.copyOf(states.values());
  }

  public List<Integer> healthHistory() {
    return List.copyOf(fleetHealthHistory);
  }

  public synchronized void override(String id, double value, int holdSeconds) {
    AssetState s = states.get(id);
    if (s == null) return;
    if (!Double.isFinite(value) || value < -50 || value > 500) throw new IllegalArgumentException(
      "Temperature override must be between -50 and 500 °C"
    );
    if (holdSeconds < 0 || holdSeconds > 86400) throw new IllegalArgumentException(
      "Override duration must be between 0 and 86400 seconds"
    );
    s.temperature = value;
    s.holdUntil = Instant.now().plusSeconds(holdSeconds);
    s.lastSeenAt = Instant.now();
    updateHealth(s);
  }

  public synchronized void reset(String id) {
    AssetState s = states.get(id);
    if (s == null) return;
    if ("CONNECTED_MACHINE".equals(s.telemetrySource)) throw new IllegalArgumentException(
      "Connected equipment cannot be reset through the demo controls"
    );
    s.temperature = s.baseTemperature;
    s.vibration = s.baseVibration;
    s.load = s.baseLoad;
    s.power = s.basePower;
    s.rpm = s.baseRpm;
    s.productionCount = s.baseProductionCount;
    s.health = s.baseHealth;
    s.status = "Running";
    s.telemetrySource = "GENERATED_DEMO";
    s.lastSeenAt = Instant.now();
    s.holdUntil = Instant.EPOCH;
    updateHealth(s);
  }

  private double drift(
    double current,
    double baseline,
    double noise,
    double envelope,
    double min,
    double max
  ) {
    double next =
      current + (baseline - current) * 0.12 + ThreadLocalRandom.current().nextGaussian() * noise;
    if (Math.abs(current - baseline) <= envelope) next = Math.max(
      baseline - envelope,
      Math.min(baseline + envelope, next)
    );
    return Math.max(min, Math.min(max, next));
  }

  private void updateHealth(AssetState s) {
    double severity = AssetTelemetryCatalog.from(s)
      .stream()
      .mapToDouble(
        sensor ->
          (sensor.currentValue() - sensor.baseline()) /
          (sensor.criticalThreshold() - sensor.baseline())
      )
      .max()
      .orElse(0);
    boolean fault = severity >= 1;
    int penalty = (int) (Math.abs(s.temperature - s.baseTemperature) * 0.5 +
      Math.abs(s.vibration - s.baseVibration) * 2);
    int target = clampInt(s.baseHealth - penalty, 30, 100);
    if (fault) s.health = Math.min(s.health, 45);
    else s.health += Integer.compare(target, s.health);
    s.status = fault ? "Fault" : severity >= 0.65 ? "Warning" : "Running";
  }

  public synchronized void ingest(String id, TelemetryIngestRequest request) {
    AssetState s = states.get(id);
    if (s == null) throw new org.springframework.web.server.ResponseStatusException(
      org.springframework.http.HttpStatus.NOT_FOUND,
      "Asset not found"
    );
    double value = request.value();
    Instant at = request.recordedAt() == null ? Instant.now() : request.recordedAt();
    if (
      !Double.isFinite(value) ||
      at.isAfter(Instant.now().plusSeconds(30)) ||
      !at.isAfter(s.lastSeenAt)
    ) throw new org.springframework.web.server.ResponseStatusException(
      org.springframework.http.HttpStatus.BAD_REQUEST,
      "Invalid or out-of-order reading"
    );
    String channel = request.sensorType().toLowerCase();
    double max = switch (channel) {
      case "temperature" -> 500;
      case "vibration", "load" -> 100;
      case "power" -> 10000;
      case "rpm", "speed" -> 30000;
      case "production" -> Long.MAX_VALUE;
      default -> -1;
    };
    if (
      max < 0 || value < (channel.equals("temperature") ? -50 : 0) || value > max
    ) throw new org.springframework.web.server.ResponseStatusException(
      org.springframework.http.HttpStatus.BAD_REQUEST,
      "Unknown channel or reading out of range"
    );
    switch (channel) {
      case "temperature" -> s.temperature = value;
      case "vibration" -> s.vibration = value;
      case "load" -> s.load = (int) value;
      case "power" -> s.power = value;
      case "rpm", "speed" -> s.rpm = (int) value;
      case "production" -> s.productionCount = (long) value;
    }
    s.lastSeenAt = at;
    s.telemetrySource = "CONNECTED_MACHINE";
    updateHealth(s);
    repo.updateTelemetry(
      s.id,
      s.temperature,
      s.vibration,
      s.load,
      s.power,
      s.rpm,
      s.productionCount,
      s.health,
      s.status,
      s.telemetrySource,
      at
    );
    repo.appendHistory(s);
  }

  private static int clampInt(double value, int min, int max) {
    return (int) Math.max(min, Math.min(max, value));
  }
}
