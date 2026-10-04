package com.sentinel.asset_service;

import java.time.Instant;

public class AssetState {

  public String id;
  public double temperature;
  public double vibration;
  public int load;
  public double power;
  public int rpm;
  public long productionCount;
  public java.time.Instant lastSeenAt = java.time.Instant.now();
  public String telemetrySource = "GENERATED_DEMO";
  public int health;
  public int baseHealth;
  public String status;
  public Instant holdUntil = Instant.EPOCH; // manual override expiry

  // remembered so Reset can restore exactly what Neon had at startup
  public double baseTemperature;
  public double baseVibration;
  public int baseLoad;
  public double basePower;
  public int baseRpm;
  public long baseProductionCount;
}
