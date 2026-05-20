import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Report {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  status: string;
  report_date: string | null;
  ocr_data: any;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  report_id: string;
  user_id: string;
  label: string;
  value: string;
  unit: string | null;
  category: string | null;
  source_snippet: string | null;
  bounding_box: any;
  is_numerical: boolean | null;
  numerical_value: number | null;
  insight_date: string | null;
  created_at: string;
}

export function useReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Report[];
    },
    enabled: !!user,
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId!)
        .single();
      if (error) throw error;
      return data as unknown as Report;
    },
    enabled: !!reportId,
  });
}

export function useInsights(reportId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["insights", reportId || "all", user?.id],
    queryFn: async () => {
      let query = supabase
        .from("insights")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (reportId) query = query.eq("report_id", reportId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Insight[];
    },
    enabled: !!user,
  });
}

export function useNumericalInsights() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["numerical-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*, reports!inner(created_at)")
        .eq("is_numerical", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as (Insight & {
        reports: { created_at: string };
      })[];
    },
    enabled: !!user,
  });
}

export function useReportFileUrl(filePath: string | undefined) {
  return useQuery({
    queryKey: ["report-file-url", filePath],
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("medical-reports")
        .createSignedUrl(filePath!, 3600);
      return data?.signedUrl || null;
    },
    enabled: !!filePath,
    staleTime: 1000 * 60 * 30,
  });
}
