REVOKE ALL ON public.content_participants,public.content_manifests,public.participant_consents,public.participant_invitations,public.content_review_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.content_participants,public.content_manifests,public.participant_consents,public.participant_invitations TO service_role;
REVOKE UPDATE,DELETE,TRUNCATE ON public.content_review_events FROM service_role;
GRANT SELECT,INSERT ON public.content_review_events TO service_role;