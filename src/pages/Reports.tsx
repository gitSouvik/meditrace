import { FileText, Loader2, Trash2, Clock, Upload } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useReports, useInsights } from "@/hooks/useReports";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

export default function Reports() {
  const { data: reports, isLoading } = useReports();
  const { data: insights } = useInsights();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [rightOpen, setRightOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const filtered = (reports || []).filter((r) => {
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
    const d = new Date(r.created_at);
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
      r.file_name?.toLowerCase().includes(nameQ) ||
      (r.ai_summary || "").toLowerCase().includes(nameQ);
    const yearOk = !yearQ || yearStr.includes(yearQ);
    const monthOk =
      !monthQ ||
      monthName.includes(monthQ) ||
      monthNum === monthQ ||
      monthNum.padStart(2, "0") === monthQ;
    return nameOk && yearOk && monthOk;
  });

  const handleDelete = async (reportId: string, filePath: string) => {
    try {
      await supabase.storage.from("medical-reports").remove([filePath]);
      await supabase.from("insights").delete().eq("report_id", reportId);
      await supabase.from("reports").delete().eq("id", reportId);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      toast({
        title: "Report deleted",
        description: "Report and its insights have been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
          <div className="mb-6 md:mb-8">
            <div className="flex items-baseline justify-between">
              <h1 className="text-2xl font-semibold md:text-foreground text-muted-foreground dark:text-foreground/90 dark:md:text-foreground">
                All Reports
              </h1>
              <Link to="/upload">
                <Button className="h-8 text-xs gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </Button>
              </Link>
            </div>
            <p className="hidden md:block text-sm text-muted-foreground mt-1">
              Browse and manage your uploaded medical documents
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered?.length ? (
            <div className="border border-border rounded-md bg-card p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                No reports uploaded
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your uploaded medical reports will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-2">
                {filtered.map((report, i) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border border-border rounded-lg bg-card p-3"
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => navigate(`/reports/${report.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-medium text-link truncate">
                          {report.file_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            report.status === "processed" &&
                            !(insights || []).some((i) => i.report_id === report.id)
                              ? "bg-badge-red text-badge-red-foreground"
                              : statusColors[report.status] ||
                                "bg-muted text-muted-foreground"
                          }`}
                        >
                          {report.status === "processed" &&
                          !(insights || []).some((i) => i.report_id === report.id)
                            ? "no data"
                            : report.status}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(report.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
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
                                This will permanently remove the document and all extracted insights. This action cannot be undone.
                              </AlertDialogDescription>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(report.id, report.file_path)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
              <div className="hidden md:block border border-border rounded-md bg-card overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_140px_80px] gap-4 px-4 py-2.5 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Name</span>
                  <span>Status</span>
                  <span>Uploaded</span>
                  <span className="text-right">Actions</span>
                </div>
                {filtered.map((report, i) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-[1fr_120px_140px_80px] gap-4 px-4 py-3 border-b border-border last:border-0 items-center hover:bg-accent/30 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/reports/${report.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/reports/${report.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate text-link">
                        {report.file_name}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                        report.status === "processed" &&
                        !(insights || []).some((i) => i.report_id === report.id)
                          ? "bg-badge-red text-badge-red-foreground"
                          : statusColors[report.status] ||
                            "bg-muted text-muted-foreground"
                      }`}
                    >
                      {report.status === "processed" &&
                      !(insights || []).some((i) => i.report_id === report.id)
                        ? "no data"
                        : report.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(report.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
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
                            This will permanently remove the document and all extracted insights. This action cannot be undone.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(report.id, report.file_path)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
        <aside className="hidden md:block md:w-60 md:shrink-0 md:border-l border-border md:pl-4 md:h-full space-y-4">
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
