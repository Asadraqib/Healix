package com.sentinel.asset_service;

import java.math.BigDecimal;

public record AssetRow(
  String id,
  String name,
  String type,
  String model,
  String location,
  String status,
  int health,
  BigDecimal temperature,
  BigDecimal vibration,
  int loadPct,
  BigDecimal powerKw,
  String accent,
  String metricLabel,
  String secondaryLabel,
  String secondaryValue,
  String production,
  int rpm,
  long productionCount,
  java.time.Instant lastSeenAt,
  String telemetrySource,
  BigDecimal baseTemperature,
  BigDecimal baseVibration,
  int baseLoadPct,
  BigDecimal basePowerKw,
  int baseRpm,
  int baseHealth
) {}
