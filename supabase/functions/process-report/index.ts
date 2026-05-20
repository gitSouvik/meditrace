import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fuzzy match: find the best bounding box match for a source snippet in OCR words
function fuzzyMatchBoundingBox(
  sourceSnippet: string,
  ocrWords: Array<{ text: string; bbox: { x: number; y: number; w: number; h: number } }>
): { x: number; y: number; w: number; h: number } | null {
  if (!sourceSnippet || !ocrWords || ocrWords.length === 0) return null;

  const snippetLower = sourceSnippet.toLowerCase().trim();
  const snippetWords = snippetLower.split(/\s+/);

  let bestMatch: { startIdx: number; endIdx: number; score: number } | null = null;

  // Sliding window approach
  for (let i = 0; i < ocrWords.length; i++) {
    for (let len = 1; len <= Math.min(snippetWords.length + 3, ocrWords.length - i); len++) {
      const windowWords = ocrWords.slice(i, i + len).map((w) => w.text.toLowerCase());
      const windowText = windowWords.join(" ");

      // Calculate similarity score
      let score = 0;
      if (windowText.includes(snippetLower)) {
        score = snippetLower.length / windowText.length;
      } else if (snippetLower.includes(windowText)) {
        score = windowText.length / snippetLower.length;
      } else {
        // Count matching words
        const matchingWords = snippetWords.filter((sw) =>
          windowWords.some((ww) => ww.includes(sw) || sw.includes(ww))
        );
        score = matchingWords.length / snippetWords.length;
      }

      if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { startIdx: i, endIdx: i + len - 1, score };
      }
    }
  }

  if (!bestMatch) return null;

  // Compute bounding box that encompasses all matched words
  const matchedWords = ocrWords.slice(bestMatch.startIdx, bestMatch.endIdx + 1);
  const minX = Math.min(...matchedWords.map((w) => w.bbox.x));
  const minY = Math.min(...matchedWords.map((w) => w.bbox.y));
  const maxX = Math.max(...matchedWords.map((w) => w.bbox.x + w.bbox.w));
  const maxY = Math.max(...matchedWords.map((w) => w.bbox.y + w.bbox.h));

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();
    if (!reportId) throw new Error("reportId is required");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) throw new Error("Report not found");

    // Download the file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("medical-reports")
      .download(report.file_path);

    if (fileError || !fileData) throw new Error("Failed to download file");

    // Convert file to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      base64 += String.fromCharCode(...uint8Array.slice(i, i + chunkSize));
    }
    base64 = btoa(base64);
    const mimeType = report.file_type || "image/jpeg";

    // Check if Google Cloud Vision API key is available
    const GCV_API_KEY = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
    let ocrWords: Array<{ text: string; bbox: { x: number; y: number; w: number; h: number } }> = [];
    let ocrFullText = "";
    let ocrProvider = "gemini";

    if (GCV_API_KEY && mimeType.startsWith("image/")) {
      // Use Google Cloud Vision for OCR
      ocrProvider = "google_cloud_vision";
      console.log("Using Google Cloud Vision for OCR");

      const gcvResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GCV_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64 },
                features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
              },
            ],
          }),
        }
      );

      if (!gcvResponse.ok) {
        console.error("GCV error:", await gcvResponse.text());
        throw new Error("Google Cloud Vision API call failed");
      }

      const gcvData = await gcvResponse.json();
      const annotations = gcvData.responses?.[0]?.textAnnotations;

      if (annotations && annotations.length > 0) {
        ocrFullText = annotations[0].description || "";

        // Skip first annotation (full text), process individual words
        // We need image dimensions to compute percentages
        // GCV returns pixel coordinates; we'll store as-is and compute percentages from bounding poly
        const fullTextBounds = annotations[0].boundingPoly?.vertices || [];
        const imgWidth = fullTextBounds.length > 0
          ? Math.max(...fullTextBounds.map((v: any) => v.x || 0))
          : 1000;
        const imgHeight = fullTextBounds.length > 0
          ? Math.max(...fullTextBounds.map((v: any) => v.y || 0))
          : 1000;

        for (let i = 1; i < annotations.length; i++) {
          const ann = annotations[i];
          const vertices = ann.boundingPoly?.vertices || [];
          if (vertices.length >= 4) {
            const x = Math.min(...vertices.map((v: any) => v.x || 0));
            const y = Math.min(...vertices.map((v: any) => v.y || 0));
            const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
            const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

            ocrWords.push({
              text: ann.description || "",
              bbox: {
                x: (x / imgWidth) * 100,
                y: (y / imgHeight) * 100,
                w: ((maxX - x) / imgWidth) * 100,
                h: ((maxY - y) / imgHeight) * 100,
              },
            });
          }
        }
      }
    }

    // Step 2: AI Insight Extraction (always Gemini)
    const aiMessages: any[] = [
      {
        role: "system",
        content: `You are a medical document analyzer. Given a medical report, extract structured medical insights.

${ocrFullText ? "OCR text has already been extracted. Use it for context." : "You must also extract the text from the image."}

Return a JSON object with this exact structure:
{
  ${!ocrFullText ? '"ocr_text": "full extracted text",' : ''}
  ${!ocrFullText ? '"ocr_words": [{"text": "word", "bbox": {"x": 10, "y": 20, "w": 5, "h": 3}}],' : ''}
  "insights": [
    {
      "label": "HbA1c",
      "value": "6.2",
      "unit": "%",
      "category": "lab_result",
      "source_snippet": "HbA1c: 6.2%",
      "is_numerical": true,
      "numerical_value": 6.2
    }
  ],
  "summary": "Brief one-paragraph summary of the report"
}

Categories: lab_result, diagnosis, medication, vital_sign, procedure, imaging, other.
IMPORTANT: Return ONLY valid JSON, no markdown formatting.`,
      },
    ];

    if (ocrFullText) {
      // GCV already did OCR, just send text
      aiMessages.push({
        role: "user",
        content: `Analyze this medical report text and extract medical insights:\n\n${ocrFullText}`,
      });
    } else {
      // Gemini does both OCR + extraction
      aiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: "text", text: "Analyze this medical report. Extract all text with bounding boxes and identify medical insights." },
        ],
      });
    }

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) throw new Error("Rate limited. Please try again later.");
      if (aiResponse.status === 402) throw new Error("AI credits exhausted. Please add credits.");
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response content");

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis");
    }

    // If Gemini did OCR (no GCV), use its OCR data
    if (!ocrFullText) {
      ocrFullText = parsed.ocr_text || "";
      ocrWords = parsed.ocr_words || [];
      ocrProvider = "gemini";
    }

    // Store OCR results in dedicated table
    await supabase.from("ocr_results").insert({
      report_id: reportId,
      user_id: report.user_id,
      full_text: ocrFullText,
      words: ocrWords,
      raw_response: GCV_API_KEY ? null : { words: parsed.ocr_words },
      provider: ocrProvider,
    });

    // Update report with summary
    await supabase
      .from("reports")
      .update({
        ocr_data: { words: ocrWords, full_text: ocrFullText },
        ai_summary: parsed.summary || "",
        status: "processed",
      })
      .eq("id", reportId);

    // Citation matching: match AI source snippets to OCR bounding boxes
    if (parsed.insights && parsed.insights.length > 0) {
      const insightRows = parsed.insights.map((insight: any) => {
        // Fuzzy match the source snippet against OCR words to find bounding box
        let bbox = insight.bbox || null;
        if (insight.source_snippet && ocrWords.length > 0) {
          const matchedBbox = fuzzyMatchBoundingBox(insight.source_snippet, ocrWords);
          if (matchedBbox) bbox = matchedBbox;
        }

        return {
          report_id: reportId,
          user_id: report.user_id,
          label: insight.label,
          value: insight.value,
          unit: insight.unit || null,
          category: insight.category || "other",
          source_snippet: insight.source_snippet || "",
          bounding_box: bbox,
          is_numerical: insight.is_numerical || false,
          numerical_value: insight.numerical_value || null,
        };
      });

      const { error: insightsError } = await supabase.from("insights").insert(insightRows);
      if (insightsError) console.error("Failed to insert insights:", insightsError);
    }

    return new Response(
      JSON.stringify({ success: true, insights: parsed.insights?.length || 0, ocrProvider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-report error:", e);

    // Try to mark report as failed
    try {
      const { reportId } = await (e as any)._req?.json?.() || {};
    } catch {}

    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
