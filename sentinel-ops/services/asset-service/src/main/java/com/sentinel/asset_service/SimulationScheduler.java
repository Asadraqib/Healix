package com.sentinel.asset_service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SimulationScheduler {
  private final SimulationEngine engine;
  private final TelemetryWebSocketHandler socket;
  private final ObjectMapper mapper = new ObjectMapper();
  private final boolean generatorEnabled;

  public SimulationScheduler(SimulationEngine engine, TelemetryWebSocketHandler socket,
      @Value("${telemetry.generator.enabled:true}") boolean generatorEnabled) {
    this.engine = engine;
    this.socket = socket;
    this.generatorEnabled = generatorEnabled;
  }

  @Scheduled(fixedRate = 4000)
  public void pushReadings() {
    if (!generatorEnabled) return;
    for (AssetState s : engine.tick()) {
      for (AssetTelemetryCatalog.Sensor sensor : AssetTelemetryCatalog.from(s)) {
        Map<String, Object> reading = new LinkedHashMap<>();
        reading.put("machineId", s.id);
        reading.put("sensorId", sensor.id());
        reading.put("sensorName", sensor.name());
        reading.put("sensorType", sensor.type());
        reading.put("value", sensor.currentValue());
        reading.put("unit", sensor.unit());
        reading.put("healthScore", s.health);
        reading.put("status", s.status);
        reading.put("source", s.telemetrySource);
        reading.put("recordedAt", s.lastSeenAt == null ? Instant.now().toString() : s.lastSeenAt.toString());
        try {
          socket.broadcast(mapper.writeValueAsString(reading));
        } catch (Exception ignored) {
          // A temporarily disconnected websocket client must not stop telemetry generation.
        }
      }
    }
  }
}
