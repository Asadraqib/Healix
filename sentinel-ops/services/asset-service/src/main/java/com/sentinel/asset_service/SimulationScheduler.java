package com.sentinel.asset_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SimulationScheduler {
  private final SimulationEngine engine;
  private final TelemetryWebSocketHandler socket;
  private final ObjectMapper mapper = new ObjectMapper();

  public SimulationScheduler(SimulationEngine engine, TelemetryWebSocketHandler socket) {
    this.engine = engine;
    this.socket = socket;
  }

  @Scheduled(fixedRate = 4000)
  public void pushReadings() {
    for (AssetState s : engine.tick()) {
      Map<String, Object> reading = new LinkedHashMap<>();
      reading.put("machineId", s.id);
      reading.put("sensorType", "temperature");
      reading.put("value", Math.round(s.temperature * 10) / 10.0);
      reading.put("healthScore", s.health);
      reading.put("status", s.status);
      reading.put("recordedAt", Instant.now().toString());
      try {
        socket.broadcast(mapper.writeValueAsString(reading));
      } catch (Exception ignored) {
      }
    }
  }
}