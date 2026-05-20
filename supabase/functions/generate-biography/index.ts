import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all insights for this user
    const { data: insights, error: insightsError } = await supabase
      .from("insights")
      .select("*, reports!inner(file_name, created_at, id)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (insightsError) throw insightsError;

    if (!insights || insights.length === 0) {
      // No insights left — clear biography
      await supabase
        .from("summaries")
        .upsert(
          { user_id: userId, narrative: "", last_generated_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      return new Response(
        JSON.stringify({ success: true, cleared: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const insightsSummary = insights.map((i: any) => ({
      label: i.label,
      value: i.value,
      unit: i.unit,
      category: i.category,
      reportName: i.reports.file_name,
      reportId: i.reports.id,
      date: i.reports.created_at,
    }));

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medical biographer. Generate a clear, readable health narrative from the patient's medical data.

RULES:
1. Write in third person ("The patient...")
2. Organize chronologically
3. For every medical fact you mention, create a hyperlink using markdown format: [fact text](report_id)
   - The report_id should be the UUID of the report that contains this fact
4. Be concise but thorough
5. Group related findings together (e.g., all blood work, all imaging)
6. Highlight trends if values appear multiple times
7. Use paragraph breaks between sections
8. Do NOT use markdown headers — just plain paragraphs with hyperlinks
9. Use medical terminology but keep it accessible`,
          },
          {
            role: "user",
            content: `Generate a health biography from these medical insights:\n\n${JSON.stringify(insightsSummary, null, 2)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) throw new Error("Rate limited. Please try again later.");
      if (aiResponse.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const narrative = aiData.choices?.[0]?.message?.content || "";

    // Upsert into summaries table
    const { error: upsertError } = await supabase
      .from("summaries")
      .upsert(
        {
          user_id: userId,
          narrative,
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-biography error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
