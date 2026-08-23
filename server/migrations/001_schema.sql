-- =============================================================
-- Last-Mile Delivery Tracker — Full Schema + Seed
-- Run: psql $DATABASE_URL -f 001_schema.sql
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------
-- 1. Users
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        VARCHAR(10) NOT NULL CHECK (role IN ('customer','agent','admin')),
  phone       VARCHAR(20),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 2. Zones
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zones (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL
);

-- ---------------------------------------------------------------
-- 3. Zone Areas (pincodes → zone mapping)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zone_areas (
  id               SERIAL PRIMARY KEY,
  zone_id          INT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  pincode_or_area  VARCHAR(20) NOT NULL,
  UNIQUE (pincode_or_area)
);

-- ---------------------------------------------------------------
-- 4. Rate Cards (B2B/B2C × intra/inter)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_cards (
  id            SERIAL PRIMARY KEY,
  order_type    VARCHAR(3) NOT NULL CHECK (order_type IN ('B2B','B2C')),
  zone_relation VARCHAR(5) NOT NULL CHECK (zone_relation IN ('intra','inter')),
  rate_per_kg   NUMERIC(10,2) NOT NULL,
  base_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (order_type, zone_relation)
);

-- ---------------------------------------------------------------
-- 5. COD Surcharge Config
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cod_surcharge_config (
  id               SERIAL PRIMARY KEY,
  order_type       VARCHAR(3) NOT NULL CHECK (order_type IN ('B2B','B2C')),
  surcharge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (order_type)
);

-- ---------------------------------------------------------------
-- 6. Agents
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id      INT NOT NULL REFERENCES zones(id),
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- 7. Orders
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  customer_id        INT NOT NULL REFERENCES users(id),
  pickup_address     TEXT NOT NULL,
  drop_address       TEXT NOT NULL,
  pickup_pincode     VARCHAR(20) NOT NULL,
  drop_pincode       VARCHAR(20) NOT NULL,
  pickup_zone_id     INT REFERENCES zones(id),
  drop_zone_id       INT REFERENCES zones(id),
  length             NUMERIC(10,2) NOT NULL,
  breadth            NUMERIC(10,2) NOT NULL,
  height             NUMERIC(10,2) NOT NULL,
  actual_weight      NUMERIC(10,2) NOT NULL,
  volumetric_weight  NUMERIC(10,2) NOT NULL,
  billable_weight    NUMERIC(10,2) NOT NULL,
  order_type         VARCHAR(3) NOT NULL CHECK (order_type IN ('B2B','B2C')),
  payment_type       VARCHAR(10) NOT NULL CHECK (payment_type IN ('Prepaid','COD')),
  charge_breakdown   JSONB,
  charge_total       NUMERIC(10,2) NOT NULL,
  current_status     VARCHAR(30) NOT NULL DEFAULT 'Created',
  assigned_agent_id  INT REFERENCES agents(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 8. Order Status Log (APPEND-ONLY — no UPDATE, no DELETE)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_log (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id),
  status     VARCHAR(30) NOT NULL,
  actor_id   INT REFERENCES users(id),
  actor_role VARCHAR(10),
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect the audit table with a rule that prevents UPDATEs and DELETEs
CREATE OR REPLACE RULE order_status_log_no_update AS
  ON UPDATE TO order_status_log DO INSTEAD NOTHING;

CREATE OR REPLACE RULE order_status_log_no_delete AS
  ON DELETE TO order_status_log DO INSTEAD NOTHING;

-- ---------------------------------------------------------------
-- 9. Reschedule Requests
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id             SERIAL PRIMARY KEY,
  order_id       INT NOT NULL REFERENCES orders(id),
  requested_date DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SEED DATA
-- =============================================================

-- Admin user (password: Admin@1234)
INSERT INTO users (name, email, password_hash, role, phone)
VALUES (
  'Platform Admin',
  'admin@delivery.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- "password"
  'admin',
  '9000000000'
) ON CONFLICT (email) DO NOTHING;

-- Sample Zones
INSERT INTO zones (name) VALUES ('North Zone') ON CONFLICT (name) DO NOTHING;
INSERT INTO zones (name) VALUES ('South Zone') ON CONFLICT (name) DO NOTHING;
INSERT INTO zones (name) VALUES ('East Zone')  ON CONFLICT (name) DO NOTHING;
INSERT INTO zones (name) VALUES ('West Zone')  ON CONFLICT (name) DO NOTHING;

-- Sample Pincodes
INSERT INTO zone_areas (zone_id, pincode_or_area)
SELECT z.id, p.pin FROM zones z
JOIN (VALUES
  ('North Zone','110001'),('North Zone','110002'),('North Zone','110003'),
  ('North Zone','110004'),('North Zone','110005'),
  ('South Zone','600001'),('South Zone','600002'),('South Zone','600017'),
  ('East Zone', '700001'),('East Zone', '700002'),('East Zone', '700012'),
  ('West Zone', '400001'),('West Zone', '400002'),('West Zone', '400051')
) AS p(zone_name, pin) ON z.name = p.zone_name
ON CONFLICT (pincode_or_area) DO NOTHING;

-- Rate Cards (all 4 combinations)
INSERT INTO rate_cards (order_type, zone_relation, rate_per_kg, base_price) VALUES
  ('B2C', 'intra', 30.00, 50.00),
  ('B2C', 'inter', 50.00, 80.00),
  ('B2B', 'intra', 20.00, 100.00),
  ('B2B', 'inter', 35.00, 150.00)
ON CONFLICT (order_type, zone_relation) DO NOTHING;

-- COD Surcharge
INSERT INTO cod_surcharge_config (order_type, surcharge_amount) VALUES
  ('B2C', 25.00),
  ('B2B', 50.00)
ON CONFLICT (order_type) DO NOTHING;

-- Sample Agent Users
INSERT INTO users (name, email, password_hash, role, phone) VALUES
  ('Ravi Kumar',    'ravi@delivery.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent', '9111111111'),
  ('Priya Sharma',  'priya@delivery.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent', '9222222222'),
  ('Amit Singh',    'amit@delivery.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent', '9333333333')
ON CONFLICT (email) DO NOTHING;

-- Assign agents to zones
INSERT INTO agents (user_id, zone_id, is_available)
SELECT u.id, z.id, TRUE FROM users u, zones z
WHERE (u.email = 'ravi@delivery.com'  AND z.name = 'North Zone')
   OR (u.email = 'priya@delivery.com' AND z.name = 'South Zone')
   OR (u.email = 'amit@delivery.com'  AND z.name = 'East Zone')
ON CONFLICT DO NOTHING;

-- Sample Customer
INSERT INTO users (name, email, password_hash, role, phone) VALUES
  ('Test Customer', 'customer@test.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', '9444444444')
ON CONFLICT (email) DO NOTHING;
