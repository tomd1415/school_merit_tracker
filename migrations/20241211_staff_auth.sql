-- migrations/20241211_staff_auth.sql
-- Scaffold tables for staff authentication and role management.
-- Safe to run alongside existing schema; does not modify current tables.

CREATE TABLE IF NOT EXISTS staff_users (
  staff_user_id    SERIAL PRIMARY KEY,
  username         TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at    TIMESTAMPTZ,
  last_password_change_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS staff_roles (
  role_id     SERIAL PRIMARY KEY,
  role_name   TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS staff_user_roles (
  staff_user_id INTEGER NOT NULL REFERENCES staff_users(staff_user_id) ON DELETE CASCADE,
  role_id       INTEGER NOT NULL REFERENCES staff_roles(role_id) ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_user_id, role_id)
);

CREATE TABLE IF NOT EXISTS staff_audit_logs (
  audit_id    BIGSERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES staff_users(staff_user_id),
  action      TEXT NOT NULL,
  subject_id  INTEGER,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed basic roles
INSERT INTO staff_roles (role_name, description) VALUES
  ('admin',  'Full access to user administration and configuration'),
  ('staff',  'Standard staff access')
ON CONFLICT (role_name) DO NOTHING;
