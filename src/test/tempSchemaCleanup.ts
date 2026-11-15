// Pooled database connections can reuse backend sessions that still hold
// temp functions/tables leaked by earlier runs. Drop them before fixtures
// create their own, so CREATE FUNCTION pg_temp.* never collides.
export const CLEAN_TEMP_SCHEMA_SQL = `DO $$ DECLARE r record; BEGIN IF pg_my_temp_schema() = 0 THEN RETURN; END IF; FOR r IN SELECT p.proname AS n, pg_get_function_identity_arguments(p.oid) AS a FROM pg_proc p WHERE p.pronamespace = pg_my_temp_schema() LOOP EXECUTE format('DROP FUNCTION pg_temp.%I(%s)', r.n, r.a); END LOOP; FOR r IN SELECT c.relname AS n FROM pg_class c WHERE c.relnamespace = pg_my_temp_schema() AND c.relkind = 'r' LOOP EXECUTE format('DROP TABLE pg_temp.%I CASCADE', r.n); END LOOP; END $$`;
