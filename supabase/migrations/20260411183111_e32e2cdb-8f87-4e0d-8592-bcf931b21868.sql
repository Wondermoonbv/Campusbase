CREATE POLICY "Anon read scholen"
ON public.scholen
FOR SELECT
TO anon
USING (true);