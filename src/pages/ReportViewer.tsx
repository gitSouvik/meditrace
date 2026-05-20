import { useParams, Link } from "react-router-dom";
import { useReport, useInsights, useReportFileUrl } from "@/hooks/useReports";
import { Loader2, ArrowLeft, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useEffect } from "react";

const categoryColors: Record<string, string> = {
  lab_result: "bg-badge-blue text-badge-blue-foreground",
  diagnosis: "bg-badge-red text-badge-red-foreground",
  medication: "bg-badge-green text-badge-green-foreground",
  vital_sign: "bg-badge-yellow text-badge-yellow-foreground",
  procedure: "bg-badge-blue text-badge-blue-foreground",
  imaging: "bg-badge-yellow text-badge-yellow-foreground",
  other: "bg-muted text-muted-foreground",
};

export default function ReportViewer() {
  const { reportId } = useParams<{ reportId: string }>();
  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useReport(reportId);
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
  } = useInsights(reportId);
  const { data: fileUrl, error: fileUrlError } = useReportFileUrl(
    report?.file_path,
  );
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "documents">(
    "insights",
  );
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!activeInsight) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 700);
    return () => clearTimeout(t);
  }, [activeInsight]);

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reportError) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-red-500">
          Failed to load report:{" "}
          {reportError instanceof Error
            ? reportError.message
            : String(reportError)}
        </p>
        <Link to="/reports">
          <Button variant="outline" className="mt-4">
            Back to reports
          </Button>
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Link to="/reports">
          <Button variant="outline" className="mt-4">
            Back to reports
          </Button>
        </Link>
      </div>
    );
  }

  const activeBox = insights?.find((i) => i.id === activeInsight)?.bounding_box;
  const isImage = report.file_type?.startsWith("image/");

  const handleDownload = async () => {
    if (!fileUrl) return;
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = report.file_name || "report";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    } catch (e) {
      const _err = e;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/reports">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {report.file_name}
            </h1>
            <p className="text-xs text-muted-foreground">{report.status}</p>
          </div>
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "insights" | "documents")}
          className="ml-4 md:hidden"
        >
          <TabsList className="h-9">
            <TabsTrigger value="insights" className="px-3">
              Insights
            </TabsTrigger>
            <TabsTrigger value="documents" className="px-3">
              Documents
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Insights (large) */}
        <div
          className={`${
            activeTab === "insights" ? "block" : "hidden"
          } md:block flex-1 overflow-auto bg-card`}
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Insights</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click an insight to highlight its source
            </p>
          </div>

          {/* Summary */}
          {report.ai_summary && (
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                Summary
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {report.ai_summary}
              </p>
            </div>
          )}

          {insightsError ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-red-500">
                Failed to load insights:{" "}
                {insightsError instanceof Error
                  ? insightsError.message
                  : String(insightsError)}
              </p>
            </div>
          ) : insightsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !insights?.length ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {report.status === "processing"
                  ? "Extracting insights..."
                  : "No insights found"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {insights.map((insight) => (
                <button
                  key={insight.id}
                  onClick={() => {
                    setActiveInsight(
                      activeInsight === insight.id ? null : insight.id,
                    );
                    setActiveTab("documents");
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    activeInsight === insight.id
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-accent/50 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {insight.label}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        categoryColors[insight.category || "other"]
                      }`}
                    >
                      {insight.category?.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {insight.value}
                    {insight.unit && (
                      <span className="text-muted-foreground ml-1">
                        {insight.unit}
                      </span>
                    )}
                  </p>
                  {insight.source_snippet && (
                    <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                      "{insight.source_snippet}"
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Rightmost: Documents */}
        <div
          className={`${
            activeTab === "documents" ? "block" : "hidden"
          } md:block w-full md:w-96 md:border-l border-border bg-card overflow-auto shrink-0`}
        >
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Documents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click View to open the document in a new tab
            </p>
          </div>
          <div className="p-4">
            {!isImage && activeInsight && (
              <div className="text-xs text-muted-foreground mb-2">
                Source highlighting is available for images.
              </div>
            )}
            {fileUrlError && (
              <div className="text-xs text-red-500 mb-2">
                Failed to load file:{" "}
                {fileUrlError instanceof Error
                  ? fileUrlError.message
                  : String(fileUrlError)}
              </div>
            )}
            <div className="border border-border rounded-md bg-background p-3">
              <div className="relative w-full h-64 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                {fileUrl && isImage ? (
                  <img
                    ref={imageRef}
                    src={fileUrl}
                    alt={report.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : fileUrl && report.file_type === "application/pdf" ? (
                  <iframe
                    src={fileUrl}
                    className="w-full h-full border-0 rounded-md"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="text-muted-foreground text-sm text-center px-4">
                    {report.status === "processing"
                      ? "Document is being processed..."
                      : "Preview not available"}
                  </div>
                )}
                {fileUrl && isImage && activeBox && (
                  <div
                    className={`absolute border-2 border-highlight-overlay bg-highlight-overlay/20 rounded-sm pointer-events-none transition-all duration-200 ${pulse ? "animate-pulse" : ""}`}
                    style={{
                      left: `${activeBox.x}%`,
                      top: `${activeBox.y}%`,
                      width: `${activeBox.w}%`,
                      height: `${activeBox.h}%`,
                    }}
                  />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!fileUrl}
                  className="gap-1"
                  onClick={() => {
                    if (fileUrl)
                      window.open(fileUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  disabled={!fileUrl}
                  aria-label="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
