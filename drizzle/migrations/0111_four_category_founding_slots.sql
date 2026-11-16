ALTER TABLE public.founding_creators DROP CONSTRAINT founding_creators_vault_side_check;
ALTER TABLE public.founding_creators ADD CONSTRAINT founding_creators_vault_side_check CHECK (vault_side IN ('women','men','trans_women','trans_men'));

CREATE OR REPLACE FUNCTION public.claim_founding_slot(_creator_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _c text; _s text; _slot integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('founding-creator:' || _creator_id::text));
  IF EXISTS (SELECT 1 FROM public.founding_creators WHERE creator_id=_creator_id) THEN RETURN; END IF;
  SELECT v.residence_country,p.vault_side INTO _c,_s
  FROM public.creator_verifications v JOIN public.profiles p ON p.user_id=v.user_id
  WHERE v.user_id=_creator_id AND v.status='approved' AND v.identity_confirmed
    AND v.residence_id_confirmed AND v.residence_reviewed_by IS NOT NULL
    AND v.residence_reviewed_at IS NOT NULL AND v.document_expires_on>=current_date
    AND p.verification_status='approved' AND public.has_role(_creator_id,'creator')
    AND cardinality(p.content_labels)>0
    AND p.content_labels <@ ARRAY['dance','twerking','fitness','cosplay','solo','multiple-performers','non-explicit','penis-visible','vulva-visible','no-genitals-visible']::text[]
    AND array_position(p.content_labels,NULL) IS NULL
  ORDER BY v.reviewed_at DESC,v.id LIMIT 1;
  IF _c IS NULL OR _c !~ '^[A-Z]{2}$' OR _s IS NULL OR _s NOT IN ('women','men','trans_women','trans_men') THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('founding:' || _c || ':' || _s));
  IF (SELECT count(*) FROM public.founding_creators WHERE country=_c AND vault_side=_s)>=5 THEN RETURN; END IF;
  SELECT n INTO _slot FROM generate_series(1,5) n
    WHERE NOT EXISTS (SELECT 1 FROM public.founding_creators f WHERE f.country=_c AND f.vault_side=_s AND f.slot=n)
    ORDER BY n LIMIT 1;
  IF _slot IS NULL THEN RETURN; END IF;
  INSERT INTO public.founding_creators(creator_id,country,vault_side,slot,split_creator,split_platform,ends_at)
  VALUES (_creator_id,_c,_s,_slot,91,9,'9999-12-31 00:00:00+00') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_founding_slot(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founding_slot(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_founding_slot_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.verification_status='approved' AND public.has_role(NEW.user_id,'creator') THEN
    PERFORM public.claim_founding_slot(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.claim_founding_slot_trigger() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS claim_founding_slot_on_profile ON public.profiles;
CREATE TRIGGER claim_founding_slot_on_profile
AFTER INSERT OR UPDATE OF verification_status,role,country,vault_side,content_labels ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_founding_slot_trigger();
COMMENT ON FUNCTION public.claim_founding_slot(uuid) IS 'Server-only, verified onboarding: five lifetime founder slots per country in each of four self-selected categories; existing awards never reallocated.';