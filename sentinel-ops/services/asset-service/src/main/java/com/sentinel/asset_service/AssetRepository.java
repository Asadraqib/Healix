package com.sentinel.asset_service;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AssetRepository {
    private final JdbcClient jdbc;

    public AssetRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String COLUMNS = """
            id, name, type, model, location, status, health, temperature, vibration,
            load_pct, power_kw, accent, metric_label, secondary_label, secondary_value, production,
            rpm, production_count, last_seen_at, telemetry_source, base_temperature, base_vibration,
            base_load_pct, base_power_kw, base_rpm, base_health
            """;

    public List<AssetRow> findAll() {
        return jdbc.sql("SELECT " + COLUMNS + " FROM assets ORDER BY id")
                .query(AssetRow.class).list();
    }

    public Optional<AssetRow> findById(String id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM assets WHERE id = :id")
                .param("id", id).query(AssetRow.class).optional();
    }

    public void updateTelemetry(String id, double temp, double vib, int load, double power, int rpm,
            long productionCount, int health, String status, String telemetrySource, java.time.Instant observedAt) {
        jdbc.sql("""
                UPDATE assets SET temperature=:t, vibration=:v, load_pct=:l, power_kw=:p,
                  rpm=:rpm, production_count=:production, health=:h, status=:s, last_seen_at=:observedAt, telemetry_source=:source
                WHERE id=:id
                """)
                .param("t", temp).param("v", vib).param("l", load).param("p", power)
                .param("rpm", rpm).param("production", productionCount)
                .param("h", health).param("s", status).param("source", telemetrySource).param("observedAt", java.sql.Timestamp.from(observedAt)).param("id", id)
                .update();
    }

    public AssetRow insert(AssetRow row) {
        jdbc.sql("INSERT INTO assets(id,name,type,model,location,status,health,temperature,vibration,load_pct,power_kw,accent,metric_label,secondary_label,secondary_value,production,rpm,production_count,last_seen_at,telemetry_source,base_temperature,base_vibration,base_load_pct,base_power_kw,base_rpm,base_health) VALUES(:id,:name,:type,:model,:location,:status,:health,:temperature,:vibration,:load,:power,:accent,:metric,:secondaryLabel,:secondary,:production,:rpm,:productionCount,now(),'CONNECTED_MACHINE',:temperature,:vibration,:load,:power,:rpm,:health)")
            .param("id",row.id()).param("name",row.name()).param("type",row.type()).param("model",row.model())
            .param("location",row.location()).param("status",row.status()).param("health",row.health())
            .param("temperature",row.temperature()).param("vibration",row.vibration()).param("load",row.loadPct())
            .param("power",row.powerKw()).param("accent",row.accent()).param("metric",row.metricLabel())
            .param("secondaryLabel",row.secondaryLabel()).param("secondary",row.secondaryValue()).param("production",row.production())
            .param("rpm",row.rpm()).param("productionCount",row.productionCount()).update();
        return row;
    }

    public void appendHistory(AssetState state) {
        for (var sensor : AssetTelemetryCatalog.from(state)) {
            jdbc.sql("INSERT INTO telemetry_readings(asset_id,sensor_type,sensor_name,value,unit,status,source,recorded_at) VALUES(:asset,:type,:name,:value,:unit,:status,:source,:at)")
                .param("asset", state.id).param("type", sensor.type().toLowerCase()).param("name", sensor.name())
                .param("value", sensor.currentValue()).param("unit", sensor.unit()).param("status", state.status)
                .param("source", state.telemetrySource).param("at", java.sql.Timestamp.from(state.lastSeenAt)).update();
        }
    }

    public List<Double> history(String assetId, String sensorName, int limit) {
        return jdbc.sql("SELECT value FROM (SELECT value,recorded_at FROM telemetry_readings WHERE asset_id=:asset AND sensor_name=:name ORDER BY recorded_at DESC LIMIT :limit) readings ORDER BY recorded_at")
            .param("asset",assetId).param("name",sensorName).param("limit",limit)
            .query(Double.class).list();
    }

    public List<Map<String,Object>> readings(String assetId, int limit) {
        return jdbc.sql("SELECT sensor_type,sensor_name,value,unit,status,source,recorded_at FROM telemetry_readings WHERE asset_id=:asset ORDER BY recorded_at DESC LIMIT :limit")
            .param("asset",assetId).param("limit",limit).query((rs,n) -> Map.<String,Object>of(
                "sensorType",rs.getString("sensor_type"),"sensorName",rs.getString("sensor_name"),"value",rs.getBigDecimal("value"),
                "unit",rs.getString("unit"),"status",rs.getString("status"),"source",rs.getString("source"),"recordedAt",rs.getTimestamp("recorded_at").toInstant().toString())).list();
    }

    public void pruneHistory() {
        jdbc.sql("DELETE FROM telemetry_readings WHERE recorded_at < now() - interval '30 days'").update();
    }

}
