package com.sentinel.asset_service;
import java.math.BigDecimal;
import java.util.List;

public record AssetResponse(String id, String name, String type, String model, String location,
    String status, int health, BigDecimal temperature, BigDecimal vibration, int load,
    BigDecimal power, String accent, String metricLabel, BigDecimal metric,
    String secondaryLabel, String secondary, String production, List<BigDecimal> trend) {

  static AssetResponse from(AssetRow r) {
    return new AssetResponse(r.id(), r.name(), r.type(), r.model(), r.location(), r.status(),
        r.health(), r.temperature(), r.vibration(), r.loadPct(), r.powerKw(), r.accent(),
        r.metricLabel(), r.temperature(), r.secondaryLabel(), r.secondaryValue(),
        r.production(), List.of(r.temperature()));   // trend must not be empty for the sparkline
  }
}