/*
# Bus Fare Comparison Platform — Core Schema

## Overview
Creates the foundational schema for a bus fare comparison platform (meta-search).
Users search routes, view unified bus listings aggregated from multiple OTAs,
and click through to the OTA via affiliate deep links. No booking/payment on-platform.

## New Tables

1. `routes` — travel route (origin → destination). Unique on (origin_city, destination_city).
2. `bus_listings` — bus offerings from OTAs for a route + date. Indexed on (route_id, travel_date).
3. `click_logs` — affiliate-redirect click tracking for analytics/postback foundation.
4. `search_logs` — search tracking for admin analytics.
5. `profiles` — lightweight public mirror of auth.users (email, full_name, role).

## Security (RLS)
- `routes`, `bus_listings`: public read (anon + authenticated), no client writes.
- `click_logs`, `search_logs`: anyone can INSERT; users read own; admins read all.
- `profiles`: users read/update own; admins read all.
- Admin role determined by `profiles.role = 'admin'` (checked via subquery).

## Notes
1. Multi-user app with auth — owner-scoped policies use auth.uid().
2. click_logs/search_logs allow anon INSERT (unauthenticated users can search/click).
3. Auto-creates profile row on signup via trigger.
*/

-- ===== ROUTES =====
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  distance_km integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE (origin_city, destination_city)
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_routes" ON routes;
CREATE POLICY "public_read_routes" ON routes FOR SELECT
  TO anon, authenticated USING (true);

-- ===== BUS_LISTINGS =====
CREATE TABLE IF NOT EXISTS bus_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  bus_type text NOT NULL DEFAULT 'seater' CHECK (bus_type IN ('sleeper', 'semi-sleeper', 'seater')),
  ac_status text NOT NULL DEFAULT 'ac' CHECK (ac_status IN ('ac', 'non-ac')),
  bus_model text NOT NULL DEFAULT 'other' CHECK (bus_model IN ('volvo', 'bharatbenz', 'other')),
  seat_position text CHECK (seat_position IN ('window', 'front', 'middle', 'back') OR seat_position IS NULL),
  berth_level text CHECK (berth_level IN ('upper', 'lower') OR berth_level IS NULL),
  price numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  ota_source text NOT NULL,
  rating numeric(2, 1) CHECK (rating >= 0 AND rating <= 5),
  deep_link_url text NOT NULL,
  travel_date date NOT NULL,
  departure_time text NOT NULL,
  arrival_time text NOT NULL,
  duration_mins integer NOT NULL,
  available_seats integer NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_listings_route_date ON bus_listings (route_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_bus_listings_price ON bus_listings (price);
CREATE INDEX IF NOT EXISTS idx_bus_listings_ota ON bus_listings (ota_source);

ALTER TABLE bus_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_bus_listings" ON bus_listings;
CREATE POLICY "public_read_bus_listings" ON bus_listings FOR SELECT
  TO anon, authenticated USING (true);

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    role = 'admin' AND id = auth.uid()
  );

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ===== CLICK_LOGS =====
CREATE TABLE IF NOT EXISTS click_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id uuid NOT NULL REFERENCES bus_listings(id) ON DELETE CASCADE,
  ota_source text NOT NULL,
  session_id text,
  clicked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_click_logs_user ON click_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_click_logs_clicked_at ON click_logs (clicked_at);

ALTER TABLE click_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert_click_logs" ON click_logs;
CREATE POLICY "anyone_insert_click_logs" ON click_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_click_logs" ON click_logs;
CREATE POLICY "users_read_own_click_logs" ON click_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_read_all_click_logs" ON click_logs;
CREATE POLICY "admin_read_all_click_logs" ON click_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ===== SEARCH_LOGS =====
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  travel_date date NOT NULL,
  session_id text,
  results_count integer DEFAULT 0,
  searched_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_searched_at ON search_logs (searched_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_user ON search_logs (user_id);

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_insert_search_logs" ON search_logs;
CREATE POLICY "anyone_insert_search_logs" ON search_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_search_logs" ON search_logs;
CREATE POLICY "users_read_own_search_logs" ON search_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_read_all_search_logs" ON search_logs;
CREATE POLICY "admin_read_all_search_logs" ON search_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ===== TRIGGER: Auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();