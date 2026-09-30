package com.sentinel.asset_service;

import java.util.Collection;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class SimulationEngine {
  private final AssetRepository repo;
  private final Map<String, AssetState> states = new ConcurrentHashMap<>();
  private final java.util.Random random = new java.util.Random();
  private int tickCount = 0;
  private final java.util.Deque<Integer> fleetHealthHistory = new java.util.concurrent.ConcurrentLinkedDeque<>();
  private static final int HISTORY_LIMIT = 60; // ~4 minutes of ticks — enough for a live-looking trend

  public SimulationEngine(AssetRepository repo) {
    this.repo = repo;
  }

  @jakarta.annotation.PostConstruct
  public void load() {
    for (AssetRow row : repo.findAll()) {
      AssetState s = new AssetState();
      s.id = row.id();
      s.temperature = s.baseTemperature = row.temperature().doubleValue();
      s.vibration = s.baseVibration = row.vibration().doubleValue();
      s.load = s.baseLoad = row.loadPct();
      s.power = s.basePower = row.powerKw().doubleValue();
      s.health = row.health();
      s.status = row.status();
      states.put(s.id, s);
    }
  }

  public Collection<AssetState> all() {
    return states.values();
  }

  /** One simulation step. Called every 4s by the scheduler. */
  public List<AssetState> tick() {
    tickCount++;
    for (AssetState s : states.values()) {
      if (Instant.now().isBefore(s.holdUntil))
        continue; // manual override active, skip drift

      double driftScale = "DRV-001".equals(s.id) ? 1.6 : 0.8; // conveyor drive drifts harder → shows Warning
      s.temperature += (random.nextGaussian()) * driftScale;
      s.vibration = Math.max(0, s.vibration + random.nextGaussian() * 0.15);
      s.load = clampInt(s.load + (int) (random.nextGaussian() * 3), 20, 98);
      s.power = Math.max(1, s.power + random.nextGaussian() * 0.3);

      double tempDelta = Math.abs(s.temperature - s.baseTemperature);
      double vibDelta = Math.abs(s.vibration - s.baseVibration);
      int loadPenalty = Math.max(0, s.load - 85);
      int health = (int) clampInt(100 - (int) (tempDelta * 2) - (int) (vibDelta * 4) - loadPenalty, 30, 100);
      s.health = health;
      s.status = health < 60 ? "Fault" : health < 85 ? "Warning" : "Running";
    }

    if (tickCount % 3 == 0) { // persist every ~12s so live values survive a service restart
      for (AssetState s : states.values()) {
        repo.updateTelemetry(s.id, s.temperature, s.vibration, s.load, s.power, s.health, s.status);
      }
    }
    int avgHealth = (int) states.values().stream().mapToInt(s -> s.health).average().orElse(0);
    fleetHealthHistory.addLast(avgHealth);
    while (fleetHealthHistory.size() > HISTORY_LIMIT)
      fleetHealthHistory.pollFirst();
    return List.copyOf(states.values());
  }

  public java.util.List<Integer> healthHistory() {
    return java.util.List.copyOf(fleetHealthHistory);
  }

  public void override(String id, double value, int holdSeconds) {
    AssetState s = states.get(id);
    if (s == null)
      return;
    s.temperature = value;
    s.holdUntil = Instant.now().plusSeconds(holdSeconds);
  }

  public void reset(String id) {
    AssetState s = states.get(id);
    if (s == null)
      return;
    s.temperature = s.baseTemperature;
    s.vibration = s.baseVibration;
    s.load = s.baseLoad;
    s.power = s.basePower;
    s.health = 95;
    s.status = "Running";
    s.holdUntil = Instant.EPOCH;
  }

  private static int clampInt(double v, int min, int max) {
    return (int) Math.max(min, Math.min(max, v));
  }
}