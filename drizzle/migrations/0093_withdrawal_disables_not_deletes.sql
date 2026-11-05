ALTER TABLE public.bunny_video_deliveries DROP CONSTRAINT bunny_video_deliveries_state_check;
ALTER TABLE public.bunny_video_deliveries ADD CONSTRAINT bunny_video_deliveries_state_check CHECK (state IN ('uploading','processing','ready','failed','deleting','withdrawn'));
COMMENT ON COLUMN public.creator_consent_withdrawals.provider_removed IS 'Number of streaming copies disabled (archived, not deleted).';
COMMENT ON COLUMN public.creator_consent_withdrawals.provider_failed IS 'Streaming copies that could not be confirmed disabled.';

CREATE FUNCTION public.keep_withdrawn_delivery_archived() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF OLD.state = 'withdrawn' THEN RAISE EXCEPTION 'Withdrawn video copies are archived and cannot be changed or deleted'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER keep_withdrawn_delivery_archived BEFORE UPDATE OR DELETE ON public.bunny_video_deliveries FOR EACH ROW EXECUTE FUNCTION public.keep_withdrawn_delivery_archived();

CREATE OR REPLACE FUNCTION public.record_creator_withdrawal(_creator uuid, _kind text, _reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid; n integer;
BEGIN
 IF _kind NOT IN ('withdraw','delete_account') THEN RAISE EXCEPTION 'invalid kind'; END IF;
 SELECT count(*) INTO n FROM public.creator_media WHERE creator_id = _creator;
 INSERT INTO public.creator_consent_withdrawals(creator_id,kind,reason,media_count,account_deletion_status)
 VALUES (_creator,_kind,left(_reason,1000),n,CASE WHEN _kind='delete_account' THEN 'pending_admin' ELSE 'not_requested' END)
 ON CONFLICT (creator_id) DO UPDATE SET kind = CASE WHEN EXCLUDED.kind='delete_account' THEN 'delete_account' ELSE creator_consent_withdrawals.kind END,
   account_deletion_status = CASE WHEN EXCLUDED.kind='delete_account' AND creator_consent_withdrawals.account_deletion_status='not_requested' THEN 'pending_admin' ELSE creator_consent_withdrawals.account_deletion_status END
 RETURNING id INTO wid;
 INSERT INTO public.creator_compliance_archive(withdrawal_id,creator_id,snapshot) VALUES (wid,_creator,jsonb_build_object(
  'verifications',(SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM public.creator_verifications v WHERE v.user_id=_creator),
  'manifests',(SELECT coalesce(jsonb_agg(to_jsonb(m)),'[]') FROM public.content_manifests m WHERE m.creator_id=_creator),
  'participants',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM public.content_participants p WHERE p.creator_id=_creator),
  'consents',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]') FROM public.participant_consents c JOIN public.content_manifests m ON m.id=c.manifest_id WHERE m.creator_id=_creator),
  'performer_index',(SELECT coalesce(jsonb_agg(to_jsonb(i)),'[]') FROM public.content_performer_index i WHERE i.creator_id=_creator),
  'media',(SELECT coalesce(jsonb_agg(to_jsonb(cm)),'[]') FROM public.creator_media cm WHERE cm.creator_id=_creator),
  'stream_copies',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]') FROM public.bunny_video_deliveries b WHERE b.creator_id=_creator)));
 UPDATE public.creator_media SET active_until = now() WHERE creator_id=_creator AND (active_until IS NULL OR active_until > now());
 UPDATE public.bunny_video_deliveries SET state='withdrawn' WHERE creator_id=_creator AND state <> 'withdrawn';
 RETURN wid;
END $$;
REVOKE ALL ON FUNCTION public.record_creator_withdrawal(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_creator_withdrawal(uuid,text,text) TO service_role;