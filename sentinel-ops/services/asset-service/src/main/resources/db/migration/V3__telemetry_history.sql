CREATE TABLE telemetry_readings (
  id BIGSERIAL PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sensor_type VARCHAR(30) NOT NULL,
  sensor_name VARCHAR(100) NOT NULL,
  value NUMERIC(14,4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  source VARCHAR(30) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX telemetry_readings_asset_time ON telemetry_readings(asset_id, recorded_at DESC);
