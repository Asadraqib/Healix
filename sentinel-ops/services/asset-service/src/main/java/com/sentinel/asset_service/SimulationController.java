package com.sentinel.asset_service;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulation")
public class SimulationController {

  private final SimulationEngine engine;

  public SimulationController(SimulationEngine engine) {
    this.engine = engine;
  }

  @PostMapping("/{machineId}/override")
  public Map<String, Object> override(
    @PathVariable String machineId,
    @RequestBody Map<String, Object> body
  ) {
    double value = ((Number) body.getOrDefault("value", 0)).doubleValue();
    int hold = ((Number) body.getOrDefault("holdSeconds", 30)).intValue();
    engine.override(machineId, value, hold);
    return Map.of("machineId", machineId, "value", value, "holdSeconds", hold);
  }

  @PostMapping("/{machineId}/reset")
  public Map<String, Object> reset(@PathVariable String machineId) {
    engine.reset(machineId);
    return Map.of("machineId", machineId, "reset", true);
  }
}
