DROP POLICY "Users can update their memories" ON public.memories;

CREATE POLICY "Users can update their memories"
ON public.memories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);;
