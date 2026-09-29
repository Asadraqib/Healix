CREATE TABLE users (
  id            VARCHAR(20)  PRIMARY KEY,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'VIEWER',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);