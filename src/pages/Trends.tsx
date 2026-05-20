import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { useNumericalInsights } from "@/hooks/useReports";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyFeaturesList } from "@/components/KeyFeatures";

function Sparkline({ data }: { data: { value: number }[] }) {
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="url(#sparkGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendIndicator({ data }: { data: { value: number }[] }) {
  if (data.length < 2)
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  const last = data[data.length - 1].value;
  const prev = data[data.length - 2].value;
  const pct = (((last - prev) / prev) * 100).toFixed(1);

  if (last > prev) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-badge-red-foreground">
        <TrendingUp className="w-3.5 h-3.5" />+{pct}%
      </span>
    );
  } else if (last < prev) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-badge-green-foreground">
        <TrendingDown className="w-3.5 h-3.5" />
        {pct}%
      </span>
    );
  }
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function fmt(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

function fmtSigned(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  const val = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `${val >= 0 ? "+" : ""}${val}`;
}

export default function Trends() {
  const { data: insights, isLoading } = useNumericalInsights();

  const groupedByLabel = useMemo(() => {
    if (!insights) return {};
    const groups: Record<string, { date: string; value: number }[]> = {};
    for (const insight of insights) {
      if (!insight.numerical_value) continue;
      const label = `${insight.label}${insight.unit ? ` (${insight.unit})` : ""}`;
      if (!groups[label]) groups[label] = [];
      const date =
        (insight as unknown as { reports?: { created_at: string } }).reports
          ?.created_at || insight.created_at;
      groups[label].push({
        date: new Date(date).toLocaleDateString(),
        value: insight.numerical_value,
      });
    }
    return groups;
  }, [insights]);

  const labels = Object.keys(groupedByLabel);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const activeLabel = selectedLabel ?? labels[0] ?? null;

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
          <div className="mb-10 md:mb-8">
            <h1 className="text-2xl font-semibold md:text-foreground text-muted-foreground dark:text-foreground/90 dark:md:text-foreground">
              Health Trends
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your health metrics over time
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : labels.length === 0 ? (
            <div className="border border-border rounded-md bg-card p-8 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">
                No trend data yet
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upload reports with numerical health data (blood pressure,
                HbA1c, cholesterol) to see automated trend charts appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {labels.map((label) => {
                  const data = groupedByLabel[label];
                  const latest = data[data.length - 1];
                  const prev =
                    data.length > 1 ? data[data.length - 2] : undefined;
                  const deltaAbs = prev ? latest.value - prev.value : undefined;
                  const min = data.reduce(
                    (m, d) => Math.min(m, d.value),
                    Number.POSITIVE_INFINITY,
                  );
                  const max = data.reduce(
                    (m, d) => Math.max(m, d.value),
                    Number.NEGATIVE_INFINITY,
                  );
                  return (
                    <div
                      key={label}
                      className="border border-border rounded-md bg-card p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {label}
                        </span>
                        <TrendIndicator data={data} />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-semibold text-foreground font-mono">
                          {fmt(latest.value)}
                        </span>
                        <Sparkline data={data} />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div>
                          Prev:{" "}
                          <span className="text-foreground">
                            {fmt(prev?.value)}
                          </span>
                        </div>
                        <div className="text-right">
                          Δ:{" "}
                          <span className="text-foreground">
                            {fmtSigned(deltaAbs)}
                          </span>
                        </div>
                        <div>
                          Range:{" "}
                          <span className="text-foreground">
                            {fmt(min)}–{fmt(max)}
                          </span>
                        </div>
                        <div className="text-right">
                          Points:{" "}
                          <span className="text-foreground">{data.length}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Select
                    value={activeLabel || undefined}
                    onValueChange={(v) => setSelectedLabel(v)}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {labels.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeLabel && (
                  <div className="border border-border rounded-md bg-card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {activeLabel}
                      </h3>
                      <TrendIndicator data={groupedByLabel[activeLabel]} />
                    </div>
                    <div className="mb-3 text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                      {(() => {
                        const series = groupedByLabel[activeLabel];
                        const last = series[series.length - 1];
                        const prev =
                          series.length > 1
                            ? series[series.length - 2]
                            : undefined;
                        const deltaAbs = prev
                          ? last.value - prev.value
                          : undefined;
                        const min = series.reduce(
                          (m, d) => Math.min(m, d.value),
                          Number.POSITIVE_INFINITY,
                        );
                        const max = series.reduce(
                          (m, d) => Math.max(m, d.value),
                          Number.NEGATIVE_INFINITY,
                        );
                        return (
                          <>
                            <div>
                              Latest:{" "}
                              <span className="text-foreground">
                                {fmt(last.value)}
                              </span>
                            </div>
                            <div className="text-right">
                              Δ:{" "}
                              <span className="text-foreground">
                                {fmtSigned(deltaAbs)}
                              </span>
                            </div>
                            <div>
                              Range:{" "}
                              <span className="text-foreground">
                                {fmt(min)}–{fmt(max)}
                              </span>
                            </div>
                            <div className="text-right">
                              Points:{" "}
                              <span className="text-foreground">
                                {series.length}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={groupedByLabel[activeLabel]}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{
                              fontSize: 11,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <YAxis
                            tick={{
                              fontSize: 11,
                              fill: "hsl(var(--muted-foreground))",
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "6px",
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))", r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
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
