-- Allow anon users to read feedback_forms (for public feedback page)
CREATE POLICY "Anon read feedback_forms"
ON public.feedback_forms
FOR SELECT
TO anon
USING (true);

-- Allow anon users to read feedback_responses (not strictly needed but consistent)
-- Already has anon insert, add anon select for completeness is NOT needed for this fix