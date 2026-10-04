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

    @org.springframework.transaction.annotation.Transactional
    public void persistDemoSnapshots(List<AssetState> snapshot) {
        var states=snapshot.stream().filter(s -> "GENERATED_DEMO".equals(s.telemetrySource)).toList();
        if(states.isEmpty()) return;
        var parameters=new java.util.LinkedHashMap<String,Object>();
        var values=new java.util.StringJoiner(",");
        for(int i=0;i<states.size();i++) {
            var s=states.get(i);String n=Integer.toString(i);
            values.add("(:id"+n+",:temp"+n+",:vib"+n+",:load"+n+",:power"+n+",:rpm"+n+",:production"+n+",:health"+n+",:status"+n+",:source"+n+",CAST(:at"+n+" AS timestamptz))");
            parameters.put("id"+n,s.id);parameters.put("temp"+n,s.temperature);parameters.put("vib"+n,s.vibration);parameters.put("load"+n,s.load);parameters.put("power"+n,s.power);parameters.put("rpm"+n,s.rpm);parameters.put("production"+n,s.productionCount);parameters.put("health"+n,s.health);parameters.put("status"+n,s.status);parameters.put("source"+n,s.telemetrySource);parameters.put("at"+n,java.sql.Timestamp.from(s.lastSeenAt));
        }
        jdbc.sql("UPDATE assets a SET temperature=v.temp,vibration=v.vib,load_pct=v.load_value,power_kw=v.power,rpm=v.rpm,production_count=v.production,health=v.health,status=v.status,telemetry_source=v.source,last_seen_at=v.at FROM (VALUES "+values+") AS v(id,temp,vib,load_value,power,rpm,production,health,status,source,at) WHERE a.id=v.id AND a.telemetry_source <> 'CONNECTED_MACHINE' AND a.last_seen_at <= v.at").params(parameters).update();
        appendHistoryBatch(states);
    }

    public void appendHistory(AssetState state) { appendHistoryBatch(List.of(state)); }
    private void appendHistoryBatch(List<AssetState> states) {
        var parameters=new java.util.LinkedHashMap<String,Object>();
        var values=new java.util.StringJoiner(",");int i=0;
        for(var state:states) for(var sensor:AssetTelemetryCatalog.from(state)) {
            String n=Integer.toString(i++);
            values.add("(:asset"+n+",:type"+n+",:name"+n+",:value"+n+",:unit"+n+",:status"+n+",:source"+n+",CAST(:at"+n+" AS timestamptz))");
            parameters.put("asset"+n,state.id);parameters.put("type"+n,sensor.type().toLowerCase());parameters.put("name"+n,sensor.name());parameters.put("value"+n,sensor.currentValue());parameters.put("unit"+n,sensor.unit());parameters.put("status"+n,state.status);parameters.put("source"+n,state.telemetrySource);parameters.put("at"+n,java.sql.Timestamp.from(state.lastSeenAt));
        }
        if(i>0)jdbc.sql("INSERT INTO telemetry_readings(asset_id,sensor_type,sensor_name,value,unit,status,source,recorded_at) VALUES "+values).params(parameters).update();
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
