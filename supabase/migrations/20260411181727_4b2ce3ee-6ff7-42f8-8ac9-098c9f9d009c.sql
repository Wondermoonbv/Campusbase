-- Anon can read event_inschrijvingen (needed to show signup status per ambassador)
CREATE POLICY "Anon read event_inschrijvingen"
ON public.event_inschrijvingen
FOR SELECT
TO anon
USING (true);

-- Anon can update event_inschrijvingen (needed for cancellation from portal)
CREATE POLICY "Anon update event_inschrijvingen"
ON public.event_inschrijvingen
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Add missing SELECT policy for contacten
CREATE POLICY "Auth read contacten"
ON public.contacten
FOR SELECT
TO authenticated
USING (true);
