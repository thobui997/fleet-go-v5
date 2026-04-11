-- ============================================================
-- FleetGo Route Schema Migration
-- Version: 20260411140000
-- Description: Route tables for stations, routes, and route stops
-- Prerequisites: 20260410120000_core_schema.sql must be applied first
-- ============================================================

-- ============================================================
-- STATIONS TABLE
-- ============================================================
-- Represents bus stations/terminals with location data

CREATE TABLE IF NOT EXISTS stations (
    -- Primary key
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Station information
    name text NOT NULL UNIQUE,
    code text UNIQUE,

    -- Location data
    address text,
    city text NOT NULL,
    province text,

    -- GPS coordinates
    latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),

    -- Status
    is_active boolean NOT NULL DEFAULT true,

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Ensure name is not empty or whitespace-only
    CONSTRAINT stations_name_not_empty CHECK (trim(name) <> '')
);

COMMENT ON TABLE stations IS 'Bus stations and terminals with GPS coordinates';
COMMENT ON COLUMN stations.id IS 'Unique station identifier';
COMMENT ON COLUMN stations.name IS 'Station display name (e.g., "Ben xe Giap Bat")';
COMMENT ON COLUMN stations.code IS 'Short station code for system reference (e.g., "HN-GB")';
COMMENT ON COLUMN stations.address IS 'Street address of the station';
COMMENT ON COLUMN stations.city IS 'City name where station is located';
COMMENT ON COLUMN stations.province IS 'Province/region name';
COMMENT ON COLUMN stations.latitude IS 'GPS latitude coordinate (-90 to 90)';
COMMENT ON COLUMN stations.longitude IS 'GPS longitude coordinate (-180 to 180)';
COMMENT ON COLUMN stations.is_active IS 'Whether the station is currently operational';
COMMENT ON COLUMN stations.created_at IS 'Timestamp when station record was created';
COMMENT ON COLUMN stations.updated_at IS 'Timestamp when station record was last updated';

-- Indexes for common query patterns
CREATE INDEX idx_stations_city ON stations(city);
CREATE INDEX idx_stations_is_active ON stations(is_active);
CREATE INDEX idx_stations_province ON stations(province);

-- ============================================================
-- ROUTES TABLE
-- ============================================================
-- Represents bus routes with origin, destination, and pricing

CREATE TABLE IF NOT EXISTS routes (
    -- Primary key
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Route information
    name text NOT NULL UNIQUE,
    origin_station_id uuid NOT NULL,
    destination_station_id uuid NOT NULL,

    -- Route metrics
    distance_km numeric(8,2) NOT NULL,
    estimated_duration interval NOT NULL,
    base_price numeric(12,2) NOT NULL,

    -- Status
    is_active boolean NOT NULL DEFAULT true,

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Foreign keys
    CONSTRAINT routes_origin_station_fk
        FOREIGN KEY (origin_station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,

    CONSTRAINT routes_destination_station_fk
        FOREIGN KEY (destination_station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT routes_distance_positive CHECK (distance_km > 0),
    CONSTRAINT routes_duration_positive CHECK (estimated_duration > '0'::interval),
    CONSTRAINT routes_base_price_non_negative CHECK (base_price >= 0),
    CONSTRAINT routes_different_origin_destination CHECK (origin_station_id != destination_station_id),
    CONSTRAINT routes_name_not_empty CHECK (trim(name) <> '')
);

COMMENT ON TABLE routes IS 'Bus routes with origin/destination stations and pricing';
COMMENT ON COLUMN routes.id IS 'Unique route identifier';
COMMENT ON COLUMN routes.name IS 'Route display name (e.g., "Ha Noi → Da Nang")';
COMMENT ON COLUMN routes.origin_station_id IS 'Starting station reference';
COMMENT ON COLUMN routes.destination_station_id IS 'Ending station reference';
COMMENT ON COLUMN routes.distance_km IS 'Total distance in kilometers';
COMMENT ON COLUMN routes.estimated_duration IS 'Estimated travel time';
COMMENT ON COLUMN routes.base_price IS 'Base ticket price in VND';
COMMENT ON COLUMN routes.is_active IS 'Whether the route is currently operational';
COMMENT ON COLUMN routes.created_at IS 'Timestamp when route record was created';
COMMENT ON COLUMN routes.updated_at IS 'Timestamp when route record was last updated';

-- Indexes for common query patterns
CREATE INDEX idx_routes_origin_station_id ON routes(origin_station_id);
CREATE INDEX idx_routes_destination_station_id ON routes(destination_station_id);
CREATE INDEX idx_routes_is_active ON routes(is_active);

-- ============================================================
-- ROUTE_STOPS TABLE
-- ============================================================
-- Junction table for ordered intermediate stops on a route

CREATE TABLE IF NOT EXISTS route_stops (
    -- Composite primary key (a route cannot stop at same station twice)
    route_id uuid NOT NULL,
    station_id uuid NOT NULL,

    -- Ordering
    stop_order int NOT NULL,

    -- Stop details
    estimated_arrival interval,
    pickup_allowed boolean NOT NULL DEFAULT true,
    dropoff_allowed boolean NOT NULL DEFAULT true,

    -- Composite primary key
    PRIMARY KEY (route_id, station_id),

    -- Foreign keys
    CONSTRAINT route_stops_route_fk
        FOREIGN KEY (route_id)
        REFERENCES routes(id)
        ON DELETE CASCADE,

    CONSTRAINT route_stops_station_fk
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE RESTRICT,

    -- Constraints
    CONSTRAINT route_stops_stop_order_positive CHECK (stop_order > 0),
    CONSTRAINT route_stops_arrival_positive CHECK (estimated_arrival IS NULL OR estimated_arrival > '0'::interval),

    -- Unique constraint: one stop per position on a route
    UNIQUE (route_id, stop_order)
);

COMMENT ON TABLE route_stops IS 'Intermediate stops on routes with ordering and pickup/dropoff rules';
COMMENT ON COLUMN route_stops.route_id IS 'Route reference';
COMMENT ON COLUMN route_stops.station_id IS 'Station reference for this stop';
COMMENT ON COLUMN route_stops.stop_order IS 'Position of this stop on the route (1 = first intermediate stop)';
COMMENT ON COLUMN route_stops.estimated_arrival IS 'Time offset from route departure to this stop';
COMMENT ON COLUMN route_stops.pickup_allowed IS 'Whether passengers can board at this stop';
COMMENT ON COLUMN route_stops.dropoff_allowed IS 'Whether passengers can disembark at this stop';

-- Index for reverse lookup (which routes pass through a station)
CREATE INDEX idx_route_stops_station_id ON route_stops(station_id);
