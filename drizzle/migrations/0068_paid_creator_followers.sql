CREATE TABLE public.creator_paid_followers (creator_id uuid NOT NULL, customer_id uuid NOT NULL, first_transaction_id uuid NOT NULL REFERENCES public.transactions(id), first_paid_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(creator_id,customer_id));
GRANT SELECT ON public.creator_paid_followers TO authenticated;
GRANT ALL ON public.creator_paid_followers TO service_role;
ALTER TABLE public.creator_paid_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY creator_reads_paid_followers ON public.creator_paid_followers FOR SELECT TO authenticated USING (creator_id=auth.uid() AND public.has_role(auth.uid(),'creator'));
CREATE TABLE public.creator_paid_follower_totals (creator_id uuid PRIMARY KEY, followers bigint NOT NULL DEFAULT 0 CHECK(followers>=0));
GRANT SELECT ON public.creator_paid_follower_totals TO authenticated;
GRANT ALL ON public.creator_paid_follower_totals TO service_role;
ALTER TABLE public.creator_paid_follower_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY creator_reads_paid_total ON public.creator_paid_follower_totals FOR SELECT TO authenticated USING(creator_id=auth.uid() AND public.has_role(auth.uid(),'creator'));
DROP TRIGGER IF EXISTS start_power_week_on_heart ON public.creator_hearts;
CREATE OR REPLACE FUNCTION public.maybe_start_power_week() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n bigint; milestone integer;
BEGIN
 n:=NEW.followers; milestone:=(floor(n/100000)*100000)::integer;
 IF milestone>=100000 AND NOT EXISTS(SELECT 1 FROM public.power_weeks WHERE creator_id=NEW.creator_id AND milestone_followers>=milestone) THEN
 INSERT INTO public.power_weeks(creator_id,milestone_followers,started_at,ends_at,split_creator,split_platform,active) VALUES(NEW.creator_id,milestone,now(),now()+interval '7 days',95,5,true);
 INSERT INTO public.creator_split_settings(creator_id,creator_split_tier,custom_vault_split,power_week_active,power_week_expires_at) VALUES(NEW.creator_id,'MILESTONE_100K',.92,true,now()+interval '7 days') ON CONFLICT(creator_id) DO UPDATE SET custom_vault_split=.92,power_week_active=true,power_week_expires_at=EXCLUDED.power_week_expires_at,creator_split_tier=CASE WHEN public.creator_split_settings.vip_pass_purchased='NONE' THEN 'MILESTONE_100K'::public.creator_split_tier ELSE public.creator_split_settings.creator_split_tier END,updated_at=now();
 END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.maybe_start_power_week() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.record_paid_creator_follower() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE added integer;
BEGIN
 IF NEW.status IS DISTINCT FROM 'completed' OR NEW.buyer_id IS NULL OR NEW.buyer_id=NEW.creator_id OR NEW.amount_usd<>20 OR (NEW.payment_id NOT LIKE 'unlock-%' AND NEW.payment_id NOT LIKE 'autorenew-%') OR NEW.payment_id IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.token_purchases p WHERE p.id=NEW.purchase_id AND p.user_id=NEW.buyer_id AND p.status='finished' AND p.amount_usd>0 AND p.tokens_credited>0) THEN RETURN NEW; END IF;
 INSERT INTO public.creator_paid_followers(creator_id,customer_id,first_transaction_id,first_paid_at) VALUES(NEW.creator_id,NEW.buyer_id,NEW.id,NEW.created_at) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS added=ROW_COUNT;
 IF added=1 THEN INSERT INTO public.creator_paid_follower_totals(creator_id,followers) VALUES(NEW.creator_id,1) ON CONFLICT(creator_id) DO UPDATE SET followers=public.creator_paid_follower_totals.followers+1; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_paid_creator_follower() FROM PUBLIC,anon,authenticated;
REVOKE INSERT ON public.transactions FROM authenticated,anon;
DROP POLICY IF EXISTS "Authenticated can insert transactions" ON public.transactions;
INSERT INTO public.creator_paid_followers(creator_id,customer_id,first_transaction_id,first_paid_at)
SELECT DISTINCT ON(t.creator_id,t.buyer_id) t.creator_id,t.buyer_id,t.id,t.created_at FROM public.transactions t JOIN public.token_purchases p ON p.id=t.purchase_id AND p.user_id=t.buyer_id AND p.status='finished' AND p.amount_usd>0 AND p.tokens_credited>0 WHERE t.status='completed' AND t.amount_usd=20 AND t.buyer_id IS NOT NULL AND t.buyer_id<>t.creator_id AND (t.payment_id LIKE 'unlock-%' OR t.payment_id LIKE 'autorenew-%') ORDER BY t.creator_id,t.buyer_id,t.created_at,t.id;
INSERT INTO public.creator_paid_follower_totals(creator_id,followers) SELECT creator_id,count(*) FROM public.creator_paid_followers GROUP BY creator_id;
CREATE TRIGGER paid_follower_milestone AFTER INSERT OR UPDATE OF followers ON public.creator_paid_follower_totals FOR EACH ROW EXECUTE FUNCTION public.maybe_start_power_week();
CREATE TRIGGER record_paid_follower AFTER INSERT OR UPDATE OF status ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.record_paid_creator_follower();