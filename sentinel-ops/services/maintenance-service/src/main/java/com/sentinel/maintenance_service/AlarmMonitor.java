package com.sentinel.maintenance_service;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Component
public class AlarmMonitor {

  private final JdbcClient db;
  private final WorkflowService workflow;
  private final RestClient client;

  public AlarmMonitor(
    JdbcClient db,
    WorkflowService workflow,
    @Value("${ASSET_SERVICE_URL:http://localhost:8081}") String url
  ) {
    this.db = db;
    this.workflow = workflow;
    this.client = RestClient.builder().baseUrl(url).build();
  }

  @Scheduled(fixedDelay = 4000)
  @Transactional
  public void scan() {
    List<Map<String, Object>> assets;
    try {
      assets = client
        .get()
        .uri("/api/assets")
        .retrieve()
        .body(
          new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {}
        );
    } catch (Exception error) {
      return;
    }
    if (assets == null) return;
    for (var asset : assets) {
      String assetId = String.valueOf(asset.get("id"));
      Object timestamp = asset.get("lastSeenAt");
      if (
        timestamp == null ||
        java.time.Instant.parse(timestamp.toString()).isBefore(
          java.time.Instant.now().minusSeconds(15)
        )
      ) continue;
      if (!(asset.get("sensors") instanceof List<?> sensors)) continue;
      for (Object raw : sensors) {
        if (!(raw instanceof Map<?, ?> sensor)) continue;
        if (
          !(sensor.get("currentValue") instanceof Number) ||
          !(sensor.get("baseline") instanceof Number) ||
          !(sensor.get("criticalThreshold") instanceof Number)
        ) continue;
        double reading = ((Number) sensor.get("currentValue")).doubleValue(),
          baseline = ((Number) sensor.get("baseline")).doubleValue(),
          critical = ((Number) sensor.get("criticalThreshold")).doubleValue();
        double ratio = AlarmPolicy.ratio(reading, baseline, critical);
        if (!Double.isFinite(ratio)) continue;
        String sensorId = sensor.get("id").toString();
        if (ratio < 0.65) {
          int resolved = db
            .sql(
              "UPDATE alarms SET resolved_at=now() WHERE asset_id=:asset AND sensor_id=:sensor AND resolved_at IS NULL"
            )
            .param("asset", assetId)
            .param("sensor", sensorId)
            .update();
          if (resolved > 0) workflow.notify(
            "ALERT",
            "Alarm resolved: " + asset.get("name"),
            sensor.get("name") + " returned below the warning threshold",
            assetId,
            null,
            null
          );
          continue;
        }
        String severity = ratio >= 1 ? "CRITICAL" : "WARNING";
        String message =
          sensor.get("name") +
          " = " +
          reading +
          " " +
          sensor.get("unit") +
          "; " +
          severity +
          " limit " +
          (ratio >= 1 ? critical : baseline + (critical - baseline) * 0.65);
        var existing = db
          .sql(
            "SELECT severity FROM alarms WHERE asset_id=:asset AND sensor_id=:sensor AND resolved_at IS NULL"
          )
          .param("asset", assetId)
          .param("sensor", sensorId)
          .query(String.class)
          .optional();
        boolean changed = existing.isEmpty() || !existing.get().equals(severity);
        long incidentId = db
          .sql(
            "INSERT INTO alarms(asset_id,sensor_id,severity,reading,threshold,message) VALUES(:asset,:sensor,:severity,:value,:threshold,:message) ON CONFLICT(asset_id,sensor_id) WHERE resolved_at IS NULL DO UPDATE SET severity=EXCLUDED.severity,reading=EXCLUDED.reading,message=EXCLUDED.message,threshold=EXCLUDED.threshold RETURNING id"
          )
          .param("asset", assetId)
          .param("sensor", sensorId)
          .param("severity", severity)
          .param("value", reading)
          .param("threshold", ratio >= 1 ? critical : baseline + (critical - baseline) * 0.65)
          .param("message", message)
          .query(Long.class)
          .single();
        if (changed) workflow.notify(
          "ALERT",
          severity + " alarm: " + asset.get("name"),
          message,
          assetId,
          null,
          null
        );
        if (ratio >= 1) {
          String id = "WO-" + UUID.randomUUID().toString().substring(0, 12);
          int inserted = db
            .sql(
              "INSERT INTO work_orders(id,asset_id,title,priority,status,owner,source,description,trigger_readings,recommended_action,incident_id) VALUES(:id,:asset,:title,'CRITICAL','AUTO_GENERATED','Unassigned','Automatic alarm',:message,jsonb_build_object(CAST(:sensor AS text),CAST(:reading AS double precision)),:action,:incident) ON CONFLICT DO NOTHING"
            )
            .param("id", id)
            .param("asset", assetId)
            .param("title", "Inspect " + sensor.get("name"))
            .param("message", message)
            .param("sensor", sensorId)
            .param("reading", reading)
            .param("incident", incidentId)
            .param(
              "action",
              "Verify sensor and operating conditions; inspect equipment using approved isolation and maintenance procedures."
            )
            .update();
          if (inserted > 0) workflow.notify(
            "WORK_ORDER",
            "Automatic work order created",
            message,
            assetId,
            id,
            null
          );
        }
      }
    }
  }
}
