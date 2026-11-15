# Test rules
- Live-database tests connect with prepare:false and a 30s timeout. Why: pooled connections drop prepared statements and slow under parallel runs.
- Live-database fixtures run CLEAN_TEMP_SCHEMA_SQL (tempSchemaCleanup.ts) before creating temp objects. Why: pooled backend sessions keep temp functions/tables leaked by earlier runs, so plain CREATE collides.
