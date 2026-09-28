CREATE TABLE assets (
  id              VARCHAR(20) PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(30)  NOT NULL,
  model           VARCHAR(60),
  location        VARCHAR(80),
  status          VARCHAR(20)  NOT NULL DEFAULT 'Running',
  health          INT          NOT NULL DEFAULT 100,
  temperature     NUMERIC(6,1) NOT NULL,
  vibration       NUMERIC(5,2) NOT NULL,
  load_pct        INT          NOT NULL,
  power_kw        NUMERIC(6,1) NOT NULL,
  accent          VARCHAR(9)   NOT NULL,
  metric_label    VARCHAR(30)  NOT NULL DEFAULT 'Temperature',
  secondary_label VARCHAR(30),
  secondary_value VARCHAR(30),
  production      VARCHAR(20),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO assets (id,name,type,model,location,status,health,temperature,vibration,load_pct,power_kw,accent,secondary_label,secondary_value,production) VALUES
('CNC-001','SINUMERIK Machining Center','CNC','840D sl','Line A · Bay 01','Running',96,67.4,2.8,71,12.7,'#1677c8','Vibration','2.8 mm/s','184'),
('ROB-001','SIMATIC Robotic Arm','Robot','S-1500','Line A · Bay 02','Running',92,42.1,1.2,58,8.4,'#0c8b82','Cycle count','1,284','96'),
('DRV-001','SINAMICS Conveyor Drive','Drive','G120X','Line B · Bay 01','Warning',74,74.8,4.4,86,18.2,'#c67b08','Motor load','86%','72'),
('PRS-001','Hydraulic Press','Press','HPR-400','Line B · Bay 03','Running',88,62.3,1.9,63,14.1,'#7068b6','Pressure','118 bar','61'),
('CMP-001','Compressor Unit','Compressor','SICOMP CP','Utilities · East','Running',90,58.6,2.1,49,10.3,'#6a889d','Air pressure','8.2 bar','—');