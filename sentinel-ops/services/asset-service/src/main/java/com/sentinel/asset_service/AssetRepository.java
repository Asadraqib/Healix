package com.sentinel.asset_service;

import java.util.List;
import java.util.Optional;
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
            load_pct, power_kw, accent, metric_label, secondary_label, secondary_value, production
            """;

    public List<AssetRow> findAll() {
        return jdbc.sql("SELECT " + COLUMNS + " FROM assets ORDER BY id")
                .query(AssetRow.class).list();
    }

    public Optional<AssetRow> findById(String id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM assets WHERE id = :id")
                .param("id", id).query(AssetRow.class).optional();
    }

    public void updateTelemetry(String id, double temp, double vib, int load, double power, int health, String status) {
        jdbc.sql("""
                UPDATE assets SET temperature=:t, vibration=:v, load_pct=:l, power_kw=:p, health=:h, status=:s
                WHERE id=:id
                """)
                .param("t", temp).param("v", vib).param("l", load).param("p", power)
                .param("h", health).param("s", status).param("id", id)
                .update();
    }
}