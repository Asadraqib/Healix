-- Remove only identifiable, unchanged V1 sample tickets, retaining an audit copy.
CREATE TABLE IF NOT EXISTS archived_seed_records (
 record_type TEXT NOT NULL, record_id TEXT NOT NULL, payload JSONB NOT NULL,
 archived_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(record_type,record_id)
);
INSERT INTO archived_seed_records(record_type,record_id,payload)
SELECT 'work_order',id,to_jsonb(w) FROM work_orders w
WHERE description IS NULL AND source IN ('AI diagnosis','Maintenance plan','Work order')
AND (id,title,owner,status) IN (
 ('WO-1042','Inspect conveyor drive bearing','R. Silva','In progress'),
 ('WO-1041','Replace spindle coolant filter','J. Alvarez','Scheduled'),
 ('WO-1039','Quarterly hydraulic fluid check','M. Chen','Scheduled'),
 ('WO-1035','Recalibrate joint 2 encoder','R. Silva','Completed'))
ON CONFLICT DO NOTHING;
DELETE FROM notifications WHERE work_order_id IN
 (SELECT record_id FROM archived_seed_records WHERE record_type='work_order');
DELETE FROM work_orders WHERE id IN
 (SELECT record_id FROM archived_seed_records WHERE record_type='work_order');
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS incident_id BIGINT REFERENCES alarms(id);
CREATE UNIQUE INDEX IF NOT EXISTS one_work_order_per_incident ON work_orders(incident_id) WHERE incident_id IS NOT NULL;
DROP INDEX IF EXISTS one_open_auto_work_order_per_asset;
