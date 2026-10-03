CREATE TABLE IF NOT EXISTS alarms (
 id BIGSERIAL PRIMARY KEY, asset_id VARCHAR(20) NOT NULL, sensor_id VARCHAR(80) NOT NULL,
 severity VARCHAR(10) NOT NULL, reading DOUBLE PRECISION NOT NULL, threshold DOUBLE PRECISION NOT NULL,
 message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_alarm ON alarms(asset_id,sensor_id) WHERE resolved_at IS NULL;
ALTER TABLE suppliers ALTER COLUMN rating TYPE NUMERIC(4,2);
ALTER TABLE parts ADD CONSTRAINT nonnegative_stock CHECK(on_hand >= 0);
