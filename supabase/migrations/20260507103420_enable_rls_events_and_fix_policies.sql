
-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Fix INSERT policy (missing WITH CHECK)
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
CREATE POLICY "Users can insert own events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix memories INSERT policy (missing WITH CHECK)
DROP POLICY IF EXISTS "Users can insert their memories" ON public.memories;
CREATE POLICY "Users can insert their memories"
ON public.memories FOR INSERT
WITH CHECK (auth.uid() = user_id);
;
