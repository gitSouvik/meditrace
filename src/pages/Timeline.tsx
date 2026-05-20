import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Upload,
  FileText,
  TrendingUp,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  useReports,
  useInsights,
  type Report,
  type Insight,
} from "@/hooks/useReports";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { KeyFeaturesList } from "@/components/KeyFeatures";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  processed: "bg-badge-green text-badge-green-foreground",
  processing: "bg-badge-yellow text-badge-yellow-foreground",
  failed: "bg-badge-red text-badge-red-foreground",
};

export default function Timeline() {
  const { user } = useAuth();
  const { data: reports, isLoading: reportsLoading } = useReports();
  const { data: insights } = useInsights();
  const [ascending, setAscending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(false);
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sortedReports = [...(reports || [])].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });

  const getInsightsForReport = (reportId: string) =>
    (insights || []).filter((i) => i.report_id === reportId);

  const filteredReports = sortedReports.filter((report) => {
    const qParam = new URLSearchParams(location.search).get("q") || "";
    const raw = qParam.trim();
    if (!raw) return true;
    const parts = raw
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    const nameQ = (parts[0] || "").toLowerCase();
    const yearQ = (parts[1] || "").toLowerCase();
    const monthQ = (parts[2] || "").toLowerCase();
    const d = new Date(report.created_at);
    const yearStr = String(d.getFullYear()).toLowerCase();
    const monthNames = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthName = monthNames[d.getMonth()];
    const monthNum = String(d.getMonth() + 1);
    const nameOk =
      !nameQ ||
      report.file_name?.toLowerCase().includes(nameQ) ||
      (report.ai_summary || "").toLowerCase().includes(nameQ) ||
      getInsightsForReport(report.id).some(
        (i) =>
          i.label?.toLowerCase().includes(nameQ) ||
          i.value?.toLowerCase().includes(nameQ),
      );
    const yearOk = !yearQ || yearStr.includes(yearQ);
    const monthOk =
      !monthQ ||
      monthName.includes(monthQ) ||
      monthNum === monthQ ||
      monthNum.padStart(2, "0") === monthQ;
    return nameOk && yearOk && monthOk;
  });

  const handleDelete = async (report: Report) => {
    try {
      await supabase.storage.from("medical-reports").remove([report.file_path]);
      await supabase.from("insights").delete().eq("report_id", report.id);
      await supabase.from("ocr_results").delete().eq("report_id", report.id);
      await supabase.from("reports").delete().eq("id", report.id);

      // Trigger re-summarization
      if (user) {
        supabase.functions
          .invoke("generate-biography", {
            body: { userId: user.id },
          })
          .catch(console.error);
      }

      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["biography"] });
      toast({
        title: "Report deleted",
        description: "Report removed and biography queued for regeneration.",
      });
    } catch (error: unknown) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const uniqueCategories = new Set(
    (insights || []).map((i) => i.category).filter(Boolean),
  );

  return (
    <div
      className="px-4 sm:px-6 py-6 sm:py-8 min-h-screen md:h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-3.5rem)]"
      onTouchStart={(e) => {
        const isMobile =
          (window.matchMedia &&
            window.matchMedia("(max-width: 767px)").matches) ||
          window.innerWidth < 768;
        const isTouch =
          "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
        if (!(isMobile && isTouch)) return;
        const t = e.touches[0];
        touchStartX.current = t.clientX;
        touchStartY.current = t.clientY;
      }}
      onTouchEnd={(e) => {
        const isMobile =
          (window.matchMedia &&
            window.matchMedia("(max-width: 767px)").matches) ||
          window.innerWidth < 768;
        const isTouch =
          "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
        if (!(isMobile && isTouch)) return;
        if (touchStartX.current == null || touchStartY.current == null) return;
        const startX = touchStartX.current;
        const startY = touchStartY.current;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        touchStartX.current = null;
        touchStartY.current = null;
        const deltaX = endX - startX;
        const deltaY = Math.abs(endY - startY);
        if (deltaX < -80 && deltaY < 80) {
          setRightOpen(true);
        }
      }}
    >
      <div className="flex flex-col md:flex-row gap-6 md:items-stretch md:h-full">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-baseline justify-between">
              <h1 className="text-2xl font-semibold md:text-foreground text-muted-foreground dark:text-foreground/90 dark:md:text-foreground">
                Timeline
              </h1>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Mobile: icon-only sort */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  onClick={() => setAscending(!ascending)}
                  aria-label="Toggle sort order"
                  title={ascending ? "Oldest first" : "Newest first"}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
                {/* Desktop: sort with label */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex h-8 text-xs gap-1.5"
                  onClick={() => setAscending(!ascending)}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {ascending ? "Oldest first" : "Newest first"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex h-8 text-xs gap-1.5"
                  onClick={() => {
                    if (!user) return;
                    supabase.functions
                      .invoke("generate-biography", {
                        body: { userId: user.id },
                      })
                      .catch(console.error);
                    toast({
                      title: "Re-summarization queued",
                      description:
                        "The patient biography is being regenerated.",
                    });
                  }}
                >
                  Re-summarize
                </Button>
                <div className="relative">
                  <Link to="/upload">
                    <Button className="h-8 text-xs gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <p className="hidden md:block text-sm text-muted-foreground mt-1">
              Your chronological health record
            </p>
          </div>

          <div className="mb-6">
            <div className="md:hidden border border-border rounded-md bg-card p-3">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Reports
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-muted-foreground">
                    {String(reports?.length || 0)}
                  </div>
                </div>
                <div className="px-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Insights
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-muted-foreground">
                    {String(insights?.length || 0)}
                  </div>
                </div>
                <div className="px-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Categories
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-muted-foreground">
                    {String(uniqueCategories.size)}
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 md:grid-cols-3 gap-4 mt-0">
              {[
                {
                  label: "Reports",
                  value: String(reports?.length || 0),
                  icon: FileText,
                },
                {
                  label: "Insights",
                  value: String(insights?.length || 0),
                  icon: TrendingUp,
                },
                {
                  label: "Categories",
                  value: String(uniqueCategories.size),
                  icon: BookOpen,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="border border-border rounded-md bg-card p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                  <span className="text-2xl font-semibold text-foreground">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {reportsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="border border-border rounded-md bg-card p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium md:text-foreground text-muted-foreground mb-2">
                No activity yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                Upload your first medical report to start building your health
                timeline.
              </p>
              <div className="relative inline-block">
                <Link to="/upload">
                  <Button className="h-9 text-sm gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Report
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1.5 md:left-6 top-0 bottom-0 w-px bg-timeline-line" />

              <div className="space-y-0.5">
                {filteredReports.map((report, index) => {
                  const reportInsights = getInsightsForReport(report.id);
                  const isExpanded = expandedId === report.id;

                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <div
                        className="relative flex items-center gap-2 md:gap-4 py-3 px-1 group cursor-pointer"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : report.id)
                        }
                      >
                        {/* Timeline dot */}
                        <div
                          className={`relative z-10 w-7 h-7 md:w-10 md:h-10 rounded-full bg-card border-2 flex items-center justify-center shrink-0 transition-colors -ml-3 md:ml-0 ${
                            report.status === "processed"
                              ? "border-badge-green"
                              : report.status === "failed"
                                ? "border-badge-red"
                                : report.status === "processing"
                                  ? "border-badge-yellow"
                                  : "border-border"
                          }`}
                        >
                          {report.status === "processing" ? (
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 text-badge-yellow-foreground animate-spin" />
                          ) : report.status === "processed" ? (
                            <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-badge-green-foreground" />
                          ) : report.status === "failed" ? (
                            <XCircle className="w-3 h-3 md:w-4 md:h-4 text-badge-red-foreground" />
                          ) : (
                            <Upload className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                          )}
                          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] leading-none text-muted-foreground bg-background px-0.5 z-20">
                            {new Date(report.created_at).getFullYear()}
                          </span>
                        </div>
                        <div
                          className="pointer-events-none absolute md:hidden bg-background z-[5] w-0.5 left-[0.125rem]"
                          style={{
                            top: "calc(50% - 1.2rem)",
                            height: "3.6rem",
                          }}
                        />
                        <div
                          className="pointer-events-none absolute hidden md:block bg-background z-[5] w-0.5 md:left-5"
                          style={{
                            top: "calc(50% - 1.6rem)",
                            height: "4.6rem",
                          }}
                        />

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div
                            className={`border rounded-md p-3 ${
                              report.status === "processed"
                                ? "border-badge-green"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-0.5">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <Link
                                to={`/reports/${report.id}`}
                                className="text-base md:text-sm font-medium text-link truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {report.file_name}
                              </Link>
                              <span
                                className={`hidden md:inline-flex text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                  report.status === "processed" &&
                                  reportInsights.length === 0
                                    ? "bg-badge-red text-badge-red-foreground"
                                    : statusColors[report.status] ||
                                      "bg-muted text-muted-foreground"
                                }`}
                              >
                                {report.status === "processed" &&
                                reportInsights.length === 0
                                  ? "no data"
                                  : report.status}
                              </span>
                              {reportInsights.length > 0 && (
                                <span className="hidden md:inline text-xs text-muted-foreground shrink-0">
                                  {reportInsights.length} insight
                                  {reportInsights.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {report.ai_summary && (
                              <p className="text-sm text-muted-foreground ml-5 line-clamp-2 md:line-clamp-1">
                                {report.ai_summary}
                              </p>
                            )}
                            <div className="md:hidden flex items-center justify-between ml-5 mt-2 text-xs">
                              <span
                                className={
                                  report.status === "processed" &&
                                  reportInsights.length === 0
                                    ? "text-badge-red-foreground"
                                    : report.status === "processed"
                                      ? "text-badge-green-foreground"
                                      : report.status === "failed"
                                        ? "text-badge-red-foreground"
                                        : report.status === "processing"
                                          ? "text-badge-yellow-foreground"
                                          : "text-muted-foreground"
                                }
                              >
                                {report.status === "processed" &&
                                reportInsights.length === 0
                                  ? "no data"
                                  : report.status}
                              </span>
                              {reportInsights.length > 0 && (
                                <span className="text-muted-foreground">
                                  {reportInsights.length} insight
                                  {reportInsights.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 ml-5 mt-1">
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(
                                  new Date(report.created_at),
                                  "MMM d, yyyy",
                                )}
                                {" · "}
                                {formatDistanceToNow(
                                  new Date(report.created_at),
                                  {
                                    addSuffix: true,
                                  },
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hidden md:flex h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0 mt-1"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              aria-label="Delete report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogTitle>Delete report?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove the document and all
                              extracted insights. This action cannot be undone.
                            </AlertDialogDescription>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(report)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Expanded insights */}
                      <AnimatePresence>
                        {isExpanded && reportInsights.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-10 md:ml-16 mb-2"
                          >
                            <div className="border border-border rounded-md bg-card overflow-hidden">
                              {reportInsights.map((insight, j) => (
                                <div
                                  key={insight.id}
                                  className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0 text-sm"
                                >
                                  <span className="font-medium md:text-foreground text-muted-foreground font-mono text-xs">
                                    {insight.label}
                                  </span>
                                  <span className="md:text-foreground text-muted-foreground font-mono text-xs">
                                    {insight.value}
                                    {insight.unit && (
                                      <span className="text-muted-foreground ml-0.5">
                                        {insight.unit}
                                      </span>
                                    )}
                                  </span>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded font-medium ml-auto ${
                                      insight.category === "lab_result"
                                        ? "bg-badge-blue text-badge-blue-foreground"
                                        : insight.category === "diagnosis"
                                          ? "bg-badge-red text-badge-red-foreground"
                                          : insight.category === "medication"
                                            ? "bg-badge-green text-badge-green-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {insight.category?.replace("_", " ")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <aside className="hidden md:block md:w-60 md:shrink-0 md:border-l border-border md:pl-4 md:h-[calc(100vh-3.5rem)] space-y-4">
          <div className="border border-border rounded-md p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Key Features
            </h3>
            <KeyFeaturesList />
          </div>
          <div className="border border-border rounded-md p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Quick Links
            </h3>
            <ul className="text-sm space-y-1">
              <li>
                <Link to="/reports" className="text-link">
                  All Reports
                </Link>
              </li>
              <li>
                <Link to="/biography" className="text-link">
                  Health Biography
                </Link>
              </li>
              <li>
                <Link to="/trends" className="text-link">
                  Trends
                </Link>
              </li>
              <li>
                <Link to="/upload" className="text-link">
                  Upload New Report
                </Link>
              </li>
            </ul>
          </div>
        </aside>
        <Sheet open={rightOpen} onOpenChange={setRightOpen}>
          <SheetContent
            side="right"
            className="p-0 w-4/5 sm:max-w-xs"
            hideClose
          >
            <div
              className="p-3 space-y-3 h-full"
              onTouchStart={(e) => {
                if (window.innerWidth >= 768) return;
                const t = e.touches[0];
                touchStartX.current = t.clientX;
                touchStartY.current = t.clientY;
              }}
              onTouchEnd={(e) => {
                if (touchStartX.current == null || touchStartY.current == null)
                  return;
                const startX = touchStartX.current;
                const startY = touchStartY.current;
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                touchStartX.current = null;
                touchStartY.current = null;
                const deltaX = endX - startX;
                const deltaY = Math.abs(endY - startY);
                if (deltaX > 40 && deltaY < 30) {
                  setRightOpen(false);
                }
              }}
            >
              <div className="border border-border rounded-md p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Key Features
                </h3>
                <KeyFeaturesList />
              </div>
              <div className="border border-border rounded-md p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Quick Links
                </h3>
                <ul className="text-sm space-y-1">
                  <li>
                    <Link to="/reports" className="text-link">
                      All Reports
                    </Link>
                  </li>
                  <li>
                    <Link to="/biography" className="text-link">
                      Health Biography
                    </Link>
                  </li>
                  <li>
                    <Link to="/trends" className="text-link">
                      Trends
                    </Link>
                  </li>
                  <li>
                    <Link to="/upload" className="text-link">
                      Upload New Report
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
