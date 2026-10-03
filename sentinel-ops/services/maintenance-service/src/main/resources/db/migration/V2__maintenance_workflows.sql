ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS part_id VARCHAR(20) REFERENCES parts(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS trigger_readings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS recommended_action TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE parts ADD COLUMN IF NOT EXISTS sku VARCHAR(40);
ALTER TABLE parts ADD COLUMN IF NOT EXISTS category VARCHAR(80);
ALTER TABLE parts ADD COLUMN IF NOT EXISTS compatible_assets TEXT[] NOT NULL DEFAULT '{}';

UPDATE parts SET id='PRT-001', name='Spindle Bearing 6205-2RS (Ceramic Hybrid)', unit_cost=340.00, on_hand=3, reorder_level=5,
  sku='SKF-6205-2RSH-C3', category='Mechanical / Bearings', compatible_assets=ARRAY['ast-sinumerik-01'] WHERE id='PRT-01';
UPDATE parts SET id='PRT-002', name='Hydraulic High-Pressure Seal Kit V-2', unit_cost=125.00, on_hand=14, reorder_level=8,
  sku='BOSCH-SEAL-500T', category='Hydraulics & Seals', compatible_assets=ARRAY['ast-hydraulic-04'] WHERE id='PRT-02';
UPDATE work_orders SET asset_id=CASE asset_id
  WHEN 'CNC-001' THEN 'ast-sinumerik-01' WHEN 'ROB-001' THEN 'ast-simatic-02'
  WHEN 'DRV-001' THEN 'ast-sinamics-03' WHEN 'PRS-001' THEN 'ast-hydraulic-04'
  WHEN 'CMP-001' THEN 'ast-chiller-05' ELSE asset_id END;
UPDATE suppliers SET name='Siemens Industry Direct (sample record)', contact='Sample record — verify before use', phone=NULL WHERE id='SUP-01';
UPDATE suppliers SET name='SKF Group Bearings & Seals (sample record)', contact='Sample record — verify before use', phone=NULL WHERE id='SUP-02';
UPDATE suppliers SET rating=4.95 WHERE id='SUP-01';
UPDATE suppliers SET rating=4.88 WHERE id='SUP-02';
INSERT INTO suppliers(id,name,contact,phone,rating) VALUES
 ('SUP-03','Bosch Rexroth Hydraulics (sample record)','Sample record — verify before use',NULL,4.82),
 ('SUP-04','Festo Pneumatics & Lubrication (sample record)','Sample record — verify before use',NULL,4.91)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,contact=EXCLUDED.contact,phone=NULL;
INSERT INTO parts(id,name,on_hand,reorder_level,unit_cost,supplier_id,sku,category,compatible_assets) VALUES
 ('PRT-003','SINAMICS S120 Bus Capacitor Kit',2,4,680.00,'SUP-01','6SL3040-1MA01-0AA0','Electronics / Inverters',ARRAY['ast-sinamics-03']),
 ('PRT-004','Synthetic Grease Mobilith SHC (1kg Cartridge)',32,10,45.00,'SUP-04','MOBIL-SHC-460','Lubricants & Fluids',ARRAY['ast-simatic-02','ast-sinumerik-01']),
 ('PRT-005','High-Precision RTD Thermal Sensor Probe',8,6,92.00,'SUP-01','SIEMENS-TEMP-PT1000','Instrumentation',ARRAY['ast-sinumerik-01','ast-sinamics-03','ast-chiller-05'])
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,on_hand=EXCLUDED.on_hand,reorder_level=EXCLUDED.reorder_level,
 unit_cost=EXCLUDED.unit_cost,supplier_id=EXCLUDED.supplier_id,sku=EXCLUDED.sku,category=EXCLUDED.category,compatible_assets=EXCLUDED.compatible_assets;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  part_id VARCHAR(20) NOT NULL REFERENCES parts(id),
  quantity_delta INT NOT NULL,
  reason VARCHAR(40) NOT NULL,
  work_order_id VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS supplier_orders (
  id BIGSERIAL PRIMARY KEY,
  part_id VARCHAR(20) NOT NULL REFERENCES parts(id),
  supplier_id VARCHAR(20) REFERENCES suppliers(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  estimated_cost NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SUGGESTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_suggested_supplier_order_per_part
  ON supplier_orders(part_id) WHERE status='SUGGESTED';
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  event_key VARCHAR(120) UNIQUE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  asset_id VARCHAR(20),
  work_order_id VARCHAR(20),
  part_id VARCHAR(20),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_auto_work_order_per_asset
  ON work_orders(asset_id, source) WHERE source = 'Automatic alarm' AND status NOT IN ('Completed','Resolved');
