
-- Create dedicated ocr_results table
CREATE TABLE public.ocr_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL DEFAULT '',
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_response JSONB,
  provider TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ocr_results" ON public.ocr_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ocr_results" ON public.ocr_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ocr_results" ON public.ocr_results FOR DELETE USING (auth.uid() = user_id);

-- Rename health_biography to summaries for spec compliance
ALTER TABLE public.health_biography RENAME TO summaries;
