CREATE TABLE work_orders (
  id           VARCHAR(20)  PRIMARY KEY,
  asset_id     VARCHAR(20)  NOT NULL,
  title        VARCHAR(200) NOT NULL,
  priority     VARCHAR(10)  NOT NULL DEFAULT 'Medium',
  status       VARCHAR(20)  NOT NULL DEFAULT 'Scheduled',
  owner        VARCHAR(80)  NOT NULL DEFAULT 'Unassigned',
  due          VARCHAR(40),
  source       VARCHAR(60)  NOT NULL DEFAULT 'Maintenance service',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE parts (
  id            VARCHAR(20)  PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  on_hand       INT          NOT NULL DEFAULT 0,
  reorder_level INT          NOT NULL DEFAULT 0,
  unit_cost     NUMERIC(10,2),
  supplier_id   VARCHAR(20)
);

CREATE TABLE suppliers (
  id      VARCHAR(20)  PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  contact VARCHAR(120),
  phone   VARCHAR(40),
  rating  NUMERIC(2,1)
);

INSERT INTO work_orders (id, asset_id, title, priority, status, owner, due, source) VALUES
('WO-1042','DRV-001','Inspect conveyor drive bearing','High','In progress','R. Silva','Today · 3:00 PM','AI diagnosis'),
('WO-1041','CNC-001','Replace spindle coolant filter','Medium','Scheduled','J. Alvarez','Tomorrow','Maintenance plan'),
('WO-1039','PRS-001','Quarterly hydraulic fluid check','Low','Scheduled','M. Chen','Fri, Oct 3','Maintenance plan'),
('WO-1035','ROB-001','Recalibrate joint 2 encoder','Medium','Completed','R. Silva','Completed Sep 24','Work order');

INSERT INTO suppliers (id, name, contact, phone, rating) VALUES
('SUP-01','Siemens Parts Direct','orders@siemens-parts.example','+1 555 0101',4.8),
('SUP-02','Nordic Bearings Co.','sales@nordicbearings.example','+1 555 0102',4.5);

INSERT INTO parts (id, name, on_hand, reorder_level, unit_cost, supplier_id) VALUES
('PRT-01','Conveyor drive bearing (6205-2RS)',3,5,18.40,'SUP-02'),
('PRT-02','Spindle coolant filter',12,10,9.75,'SUP-01');