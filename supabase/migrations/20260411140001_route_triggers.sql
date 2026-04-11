-- ============================================================
-- FleetGo Route Triggers Migration
-- Version: 20260411140001
-- Description: updated_at triggers for route tables
-- Prerequisites: 20260410120001_core_triggers.sql (handle_updated_at function)
--               20260411140000_route_schema.sql (route tables)
-- ============================================================

-- ============================================================
-- UPDATED_AT TRIGGERS FOR ROUTE TABLES
-- ============================================================
-- Reuses handle_updated_at() function from core_triggers
-- No duplicate function definition needed

-- Trigger for stations table
CREATE TRIGGER set_stations_updated_at
    BEFORE UPDATE ON stations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

COMMENT ON TRIGGER set_stations_updated_at ON stations IS 'Automatically update updated_at column on row modification';

-- Trigger for routes table
CREATE TRIGGER set_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

COMMENT ON TRIGGER set_routes_updated_at ON routes IS 'Automatically update updated_at column on row modification';

-- Note: No trigger for route_stops (junction table has no updated_at column)
