ALTER TABLE public.fan_messages ADD COLUMN IF NOT EXISTS fan_id uuid;
UPDATE public.fan_messages SET fan_id = sender_id WHERE fan_id IS NULL AND sender_id <> creator_id;
CREATE INDEX IF NOT EXISTS idx_fan_messages_thread ON public.fan_messages (creator_id, fan_id, created_at);
DROP POLICY IF EXISTS "Top fans and creator can read messages" ON public.fan_messages;
DROP POLICY IF EXISTS "Top fans and creator can send messages" ON public.fan_messages;
CREATE POLICY "Fan and creator read their private thread" ON public.fan_messages FOR SELECT TO authenticated
USING (fan_id IS NOT NULL AND (auth.uid() = fan_id OR auth.uid() = creator_id) AND public.is_top_fan(creator_id, fan_id) AND fan_id <> creator_id);
CREATE POLICY "Fan and creator send in their private thread" ON public.fan_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND fan_id IS NOT NULL AND fan_id <> creator_id AND (auth.uid() = fan_id OR auth.uid() = creator_id) AND public.is_top_fan(creator_id, fan_id));