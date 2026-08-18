-- Smart College Event Seat Allotment & QR Entry System
-- PostgreSQL / Supabase schema - equivalent to database/schema.sql (MySQL),
-- for the Supabase + Vercel serverless deployment track (backend-serverless/).
--
-- Run this in the Supabase SQL editor, or via psql against your connection
-- string. Supabase already provisions a "postgres" database for you, so
-- there's no CREATE DATABASE statement here - everything lives in the
-- default "public" schema.

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  roll_no        VARCHAR(50) UNIQUE,
  department     VARCHAR(100),
  year           VARCHAR(20),
  phone          VARCHAR(20),
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(10) NOT NULL DEFAULT 'STUDENT'
                   CHECK (role IN ('STUDENT', 'ADMIN', 'SCANNER')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  venue               VARCHAR(200),
  event_date          TIMESTAMP NOT NULL,
  capacity            INTEGER NOT NULL,
  registration_start  TIMESTAMP NOT NULL,
  registration_end    TIMESTAMP NOT NULL,
  status              VARCHAR(10) NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED')),
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- SEATS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seats (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section      VARCHAR(20) NOT NULL,
  row_label    VARCHAR(10) NOT NULL,
  seat_number  INTEGER NOT NULL,
  category     VARCHAR(12) NOT NULL DEFAULT 'STUDENT'
                 CHECK (category IN ('STUDENT', 'GUEST', 'FACULTY', 'ORGANIZER', 'MANAGEMENT')),
  status       VARCHAR(10) NOT NULL DEFAULT 'AVAILABLE'
                 CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'BLOCKED')),
  UNIQUE (event_id, section, row_label, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seats_alloc ON seats (event_id, category, status);

-- ---------------------------------------------------------------------------
-- REGISTRATIONS
-- One row per (event, user) - reused across cancel / re-register, same
-- reasoning as the MySQL schema.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  seat_id        INTEGER REFERENCES seats(id),
  status         VARCHAR(11) NOT NULL DEFAULT 'WAITLISTED'
                   CHECK (status IN ('CONFIRMED', 'WAITLISTED', 'CANCELLED')),
  registered_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_status ON registrations (event_id, status, registered_at);

-- MySQL's "ON UPDATE CURRENT_TIMESTAMP" has no direct Postgres equivalent,
-- so a trigger keeps updated_at current on every row change.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON registrations;
CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- TICKETS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_id  INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  token            VARCHAR(64) NOT NULL UNIQUE,
  status           VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
                     CHECK (status IN ('ACTIVE', 'USED', 'CANCELLED')),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  used_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_token ON tickets (token);

-- ---------------------------------------------------------------------------
-- CHECK-INS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS check_ins (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id   INTEGER NOT NULL REFERENCES tickets(id),
  scanner_id  INTEGER NOT NULL REFERENCES users(id),
  scanned_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- EMAIL OTPS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_otps (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       VARCHAR(150) NOT NULL,
  otp_code    VARCHAR(10) NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON email_otps (email);

-- No hard-coded admin/scanner accounts here (same reasoning as the MySQL
-- schema) - run `npm run seed` from backend-serverless/ after this.
