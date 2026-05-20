import { BookOpen, Loader2, RefreshCw } from "lucide-react";
import { useReports, useInsights } from "@/hooks/useReports";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { KeyFeaturesList } from "@/components/KeyFeatures";

export default function Biography() {
  const { user } = useAuth();
  const { data: reports } = useReports();
  const { data: insights } = useInsights();
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: biography, isLoading: bioLoading } = useQuery({
    queryKey: ["biography", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("summaries" as any)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const handleGenerate = async () => {
    if (!user || !insights?.length) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-biography",
        {
          body: { userId: user.id },
        },
      );

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["biography"] });
      toast({
        title: "Biography updated",
        description: "Your health narrative has been regenerated.",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Parse biography for hyperlinks - format: [text](report_id)
  const renderNarrative = (text: string) => {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return (
          <Link
            key={i}
            to={`/reports/${match[2]}`}
            className="text-link font-medium"
          >
            {match[1]}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const [rightOpen, setRightOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  return (
    <div
      className="px-4 sm:px-6 py-8 min-h-screen md:h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-3.5rem)]"
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
                Health Biography
              </h1>
              {insights && insights.length > 0 && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  variant="outline"
                  className="h-9 text-sm gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${generating ? "animate-spin" : ""}`}
                  />
                  {biography ? "Regenerate" : "Generate"}
                </Button>
              )}
            </div>
            <p className="hidden md:block text-sm text-muted-foreground mt-1">
              AI-generated narrative of your complete medical history
            </p>
          </div>

          {bioLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : biography?.narrative ? (
            <div className="border border-border rounded-md bg-card p-6">
              <div className="max-w-none text-foreground leading-relaxed">
                {biography.narrative
                  .split("\n\n")
                  .map((paragraph: string, i: number) => (
                    <p
                      key={i}
                      className="mb-4 last:mb-0 text-sm leading-relaxed"
                    >
                      {renderNarrative(paragraph)}
                    </p>
                  ))}
              </div>
              {biography.last_generated_at && (
                <p className="text-xs text-muted-foreground mt-6 border-t border-border pt-3">
                  Last generated:{" "}
                  {new Date(biography.last_generated_at).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-md bg-card p-8 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                No biography yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {insights && insights.length > 0
                  ? 'Click "Generate" to create your health biography from extracted insights.'
                  : "Upload medical reports to begin generating your health biography."}
              </p>
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
