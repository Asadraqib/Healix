-- Keep the backend fleet identical to the browser demonstration fleet.
-- The descriptive machine families exceed V1's 30-character type limit.
ALTER TABLE assets ALTER COLUMN type TYPE VARCHAR(100);

UPDATE assets SET id = 'ast-sinumerik-01', name = 'SINUMERIK 840D CNC Center', type = '5-Axis CNC Milling Center', model = 'SINUMERIK', location = 'Bay 3 - Nuremberg Plant', accent = '#1677c8', metric_label = 'Spindle RPM', secondary_label = 'Vibration', secondary_value = '2.8 mm/s', production = '184'
WHERE id = 'CNC-001';
UPDATE assets SET id = 'ast-simatic-02', name = 'SIMATIC 6-Axis Industrial Robot', type = 'Automated Arc Welding Manipulator', model = 'SIMATIC', location = 'Welding Cell B - Plant 04', accent = '#0c8b82', metric_label = 'Cycle count', secondary_label = 'Joint torque', secondary_value = '142.5 Nm', production = '1284'
WHERE id = 'ROB-001';
UPDATE assets SET id = 'ast-sinamics-03', name = 'SINAMICS S120 High-Inertia Drive', type = 'Synchronous Multi-Axis Drive', model = 'SINAMICS', location = 'Assembly Conveyor Line 1', accent = '#c67b08', metric_label = 'Motor load', secondary_label = 'Output current', secondary_value = '48.2 A', production = '72'
WHERE id = 'DRV-001';
UPDATE assets SET id = 'ast-hydraulic-04', name = '500-Ton Hydraulic Cold Press', type = 'Heavy Forging & Stamping Press', model = 'HYDRAULIC', location = 'Forging Bay A', accent = '#7068b6', metric_label = 'Pressure', secondary_label = 'Fluid temperature', secondary_value = '51.5 °C', production = '61'
WHERE id = 'PRS-001';
UPDATE assets SET id = 'ast-chiller-05', name = 'CryoCooler Industrial Chiller 40kW', type = 'Refrigerated Process Fluid Chiller', model = 'CHILLER', location = 'HVAC Mezzanine Roof', accent = '#6a889d', metric_label = 'Cooling capacity', secondary_label = 'Head pressure', secondary_value = '16.4 bar', production = '—'
WHERE id = 'CMP-001';

ALTER TABLE assets ADD COLUMN IF NOT EXISTS rpm INT NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS production_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE assets ADD COLUMN IF NOT EXISTS telemetry_source VARCHAR(30) NOT NULL DEFAULT 'GENERATED_DEMO';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS base_temperature NUMERIC(6,1) NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS base_vibration NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS base_load_pct INT NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS base_power_kw NUMERIC(6,1) NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS base_rpm INT NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS base_health INT NOT NULL DEFAULT 100;

UPDATE assets SET rpm = CASE id
  WHEN 'ast-sinumerik-01' THEN 12050 WHEN 'ast-simatic-02' THEN 142
  WHEN 'ast-sinamics-03' THEN 1480 WHEN 'ast-hydraulic-04' THEN 0 ELSE 0 END;
UPDATE assets SET production_count = CASE id
  WHEN 'ast-sinumerik-01' THEN 184 WHEN 'ast-simatic-02' THEN 1284
  WHEN 'ast-sinamics-03' THEN 72 WHEN 'ast-hydraulic-04' THEN 61 ELSE 0 END;

UPDATE assets SET temperature=48.4,vibration=1.82,load_pct=71,power_kw=12.7,rpm=12050,production_count=184 WHERE id='ast-sinumerik-01';
UPDATE assets SET temperature=61.2,vibration=1.42,load_pct=58,power_kw=8.4,rpm=142,production_count=1284 WHERE id='ast-simatic-02';
UPDATE assets SET temperature=78.8,vibration=4.4,load_pct=86,power_kw=18.2,rpm=1480,production_count=72 WHERE id='ast-sinamics-03';
UPDATE assets SET temperature=51.5,vibration=1.9,load_pct=63,power_kw=14.1,rpm=0,production_count=61 WHERE id='ast-hydraulic-04';
UPDATE assets SET temperature=6.8,vibration=0.4,load_pct=71,power_kw=40.0,rpm=0,production_count=0 WHERE id='ast-chiller-05';
UPDATE assets SET health=94 WHERE id='ast-sinumerik-01';
UPDATE assets SET health=89 WHERE id='ast-simatic-02';
UPDATE assets SET health=76 WHERE id='ast-sinamics-03';
UPDATE assets SET health=96 WHERE id='ast-hydraulic-04';
UPDATE assets SET health=92 WHERE id='ast-chiller-05';
UPDATE assets SET base_temperature=temperature,base_vibration=vibration,base_load_pct=load_pct,
  base_power_kw=power_kw,base_rpm=rpm,base_health=health;
