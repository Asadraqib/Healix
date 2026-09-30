package com.sentinel.asset_service;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DashboardController {
  private final SimulationEngine engine;
  public DashboardController(SimulationEngine engine) { this.engine = engine; }

  @GetMapping("/api/dashboard/summary")
  public Map<String, Object> summary() {
    var states = engine.all();
    int total = states.size();
    long alarms = states.stream().filter(s -> "Warning".equals(s.status) || "Fault".equals(s.status)).count();
    int avgHealth = (int) states.stream().mapToInt(s -> s.health).average().orElse(0);
    return Map.of(
        "assetsOnline", total,
        "assetsTotal", total,
        "fleetHealth", avgHealth,
        "activeAlarms", alarms,
        "healthTrend", engine.healthHistory()
    );
  }
}