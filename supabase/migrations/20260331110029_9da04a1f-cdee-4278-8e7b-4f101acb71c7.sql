-- Allow anon users to read evenementen (for public registration page)
CREATE POLICY "Anon read evenementen"
ON public.evenementen
FOR SELECT
TO anon
USING (true);