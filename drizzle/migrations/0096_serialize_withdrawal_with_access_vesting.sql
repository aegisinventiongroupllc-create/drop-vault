DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.record_creator_withdrawal(uuid,text,text)'::regprocedure) INTO definition;
 definition:=replace(definition,'BEGIN','BEGIN'||chr(10)||' PERFORM pg_advisory_xact_lock(hashtextextended(_creator::text,0));');
 EXECUTE definition;
END
$migration$;