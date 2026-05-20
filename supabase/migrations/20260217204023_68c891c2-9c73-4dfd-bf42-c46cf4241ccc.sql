
-- Drop overly permissive service role policies
DROP POLICY "Service role can manage reports" ON public.reports;
DROP POLICY "Service role can manage insights" ON public.insights;
