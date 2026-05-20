import { AppSidebar, navItems } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  Menu,
  Pill,
  Clock,
  Search,
  FileText,
  CornerUpLeft,
  X as ClearIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useReports } from "@/hooks/useReports";
import { useTheme } from "@/hooks/useTheme";

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [desktopListOpen, setDesktopListOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [showThemeTip, setShowThemeTip] = useState(false);
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("q") || "";
  });
  const { data: reports } = useReports();
  const { toggleTheme } = useTheme();
  const suggestions = useMemo(() => {
    const list = reports || [];
    const q = (query || "").trim().toLowerCase();
    if (!q) return list.slice(0, 50);
    const scored = list
      .map((r) => {
        const base = (r.file_name || "").toLowerCase().replace(/\.[^/.]+$/, "");
        const starts = base.startsWith(q);
        const contains = !starts && base.includes(q);
        const score = starts ? 0 : contains ? 1 : 2;
        return { r, score };
      })
      .filter((s) => s.score < 2)
      .sort((a, b) => a.score - b.score)
      .map((s) => s.r);
    return scored.slice(0, 50);
  }, [reports, query]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const current = params.get("q") || "";
    setQuery(current);
  }, [location.search]);

  const updateQuery = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(location.search);
    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    navigate({ search: params.toString() }, { replace: true });
  };

  const setQueryLocal = (value: string) => {
    setQuery(value);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          if (window.innerWidth < 768) {
            setSearchOpen(true);
            // Focus after sheet opens
            setTimeout(() => searchRef.current?.focus(), 50);
          } else {
            searchRef.current?.focus();
          }
        }
      }
      if (e.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          (document.activeElement as HTMLElement)?.blur();
        }
        if (searchOpen) {
          setSearchOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  useEffect(() => {
    if (user) {
      const t = setTimeout(() => setShowThemeTip(true), 800);
      return () => clearTimeout(t);
    } else {
      setShowThemeTip(false);
    }
  }, [user]);

  const buildPattern = (name: string, createdAt: string) => {
    const base = name.replace(/\.[^/.]+$/, "");
    const d = new Date(createdAt);
    const year = d.getFullYear();
    const month = d.toLocaleString("en-US", { month: "long" });
    return `${base}/${year}/${month}`;
  };

  const handleSelectReport = (id: string, name: string, createdAt: string) => {
    const pattern = buildPattern(name, createdAt);
    updateQuery(pattern);
    navigate({ pathname: "/", search: `?q=${encodeURIComponent(pattern)}` });
    setSearchOpen(false);
    setDesktopListOpen(false);
    // Let navigation happen; blur input to close dropdowns
    requestAnimationFrame(() => searchRef.current?.blur());
  };

  const clearSearch = () => {
    updateQuery("");
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
    setDesktopListOpen(false);
    setDesktopExpanded(false);
    setSearchOpen(false);
    requestAnimationFrame(() => searchRef.current?.blur());
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-3 sm:px-5 md:px-6 sticky top-0 z-20">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 md:hidden border border-border rounded-md"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="md:hidden inline-block">
              {query.trim() && !searchOpen ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  onClick={clearSearch}
                  aria-label="Cancel"
                >
                  <ClearIcon className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  onClick={() => {
                    setSearchOpen(true);
                    setTimeout(() => searchRef.current?.focus(), 50);
                  }}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </Button>
              )}
            </div>
            {/* Desktop: compact search with expandable overlay */}
            <div className="hidden md:block relative">
              <div
                className={`relative w-72 ${desktopExpanded ? "opacity-0 pointer-events-none" : ""}`}
              >
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQueryLocal(e.target.value)}
                  placeholder="fever/2026/august"
                  className="pl-8 pr-9 h-8"
                  aria-label="Search reports"
                  onFocus={() => {
                    setDesktopExpanded(true);
                    setDesktopListOpen(true);
                    setTimeout(() => searchRef.current?.focus(), 0);
                  }}
                />
                {query ? (
                  <button
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clearSearch}
                  >
                    <ClearIcon className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 items-center justify-center px-1.5 rounded border border-input bg-muted/50 text-[10px] text-muted-foreground">
                    /
                  </span>
                )}
              </div>
              {desktopExpanded && (
                <>
                  <div
                    className="hidden md:block fixed inset-0 z-30 search-backdrop animate-fade-in"
                    onClick={() => {
                      setDesktopExpanded(false);
                      setDesktopListOpen(false);
                    }}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 z-50">
                    <div className="origin-right animate-expand-x w-[72rem] max-w-[calc(100vw-4rem)]">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={searchRef}
                          value={query}
                          onChange={(e) => setQueryLocal(e.target.value)}
                          placeholder="Search reports"
                          className="pl-8 pr-9 h-9 w-full"
                          aria-label="Search reports expanded"
                          onBlur={() => {
                            setTimeout(() => {
                              setDesktopListOpen(false);
                              setDesktopExpanded(false);
                            }, 120);
                          }}
                          autoFocus
                        />
                        {query ? (
                          <button
                            aria-label="Clear search"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={clearSearch}
                          >
                            <ClearIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 items-center justify-center px-1.5 rounded border border-input bg-muted/50 text-[10px] text-muted-foreground">
                            /
                          </span>
                        )}
                      </div>
                      {desktopListOpen && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 border border-border rounded-md bg-popover text-popover-foreground shadow-md max-h-80 overflow-auto">
                          <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                            Reports
                          </div>
                          <ul>
                            {(suggestions || []).map((r) => (
                              <li key={r.id}>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 text-foreground"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() =>
                                    handleSelectReport(
                                      r.id,
                                      r.file_name,
                                      r.created_at,
                                    )
                                  }
                                >
                                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="truncate">
                                    {r.file_name}
                                  </span>
                                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                                    {new Date(r.created_at).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "2-digit",
                                        year: "numeric",
                                      },
                                    )}
                                  </span>
                                </button>
                              </li>
                            ))}
                            {suggestions && suggestions.length === 0 && (
                              <li className="px-3 py-2 text-sm text-muted-foreground">
                                No reports found
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                sideOffset={12}
                className="w-screen max-w-none rounded-none sm:rounded-md sm:w-80 md:w-96 h-56 sm:h-96 p-0 overflow-hidden"
              >
                <div className="h-full overflow-auto">
                  <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground">
                    Notifications
                  </div>
                  <div className="px-3 py-3 space-y-2">
                    <div className="border border-border rounded-md p-3 w-full h-20 overflow-hidden">
                      <div className="flex items-start gap-3 h-full">
                        <div className="mt-0.5 shrink-0">
                          <Pill className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-foreground truncate">
                            Daily medicine reminder
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                            <Clock className="w-3 h-3" />
                            Today • 8:00 PM
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="relative">
              <ThemeToggle />
              {showThemeTip && (
                <div className="absolute right-0 mt-2 z-50 border border-border rounded-md bg-popover text-popover-foreground shadow-md p-3 w-64">
                  <div className="text-sm font-semibold mb-1">Switch modes</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Use this toggle to switch Light, Dark, or High Contrast.
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toggleTheme();
                      }}
                    >
                      Try it
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowThemeTip(false);
                      }}
                    >
                      Got it
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Link
              to="/profile"
              aria-label={
                location.pathname === "/profile" ? "Return" : "Profile"
              }
              title={location.pathname === "/profile" ? "Return" : "Profile"}
              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary border border-border hover:bg-primary/20 transition-colors"
              onClick={(e) => {
                if (location.pathname === "/profile") {
                  e.preventDefault();
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate("/");
                  }
                }
              }}
            >
              {location.pathname === "/profile" ? (
                <CornerUpLeft className="h-4 w-4 text-primary" />
              ) : (
                <span>{user?.email?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </Link>
          </div>
          {searchOpen && (
            <>
              <div
                className="md:hidden fixed inset-0 z-10 search-backdrop animate-fade-in"
                onClick={() => setSearchOpen(false)}
                aria-hidden="true"
              />
              <div className="md:hidden absolute inset-0 z-20">
                <div className="absolute inset-0 bg-card border-b border-border origin-right animate-expand-x flex items-center px-2 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQueryLocal(e.target.value)}
                      placeholder="fever/2026/august"
                      className="pl-8 pr-9 h-9 w-full"
                      aria-label="Search reports"
                      autoFocus
                    />
                    {query ? (
                      <button
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent text-muted-foreground"
                        onClick={clearSearch}
                      >
                        <ClearIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 items-center justify-center px-1.5 rounded border border-input bg-muted/50 text-[10px] text-muted-foreground">
                        /
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSearchOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="absolute left-0 right-0 top-14 z-20 border-b border-border rounded-none bg-popover text-popover-foreground shadow-md max-h-[60vh] overflow-auto">
                  <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    Reports
                  </div>
                  <ul className="divide-y divide-border">
                    {(suggestions || []).map((r) => (
                      <li key={r.id}>
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/50"
                          onClick={() =>
                            handleSelectReport(r.id, r.file_name, r.created_at)
                          }
                        >
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-foreground">
                              {r.file_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "long",
                                  year: "numeric",
                                },
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                    {suggestions && suggestions.length === 0 && (
                      <li className="px-3 py-3 text-sm text-muted-foreground">
                        No reports found
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </header>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-4/5 sm:max-w-xs">
            <div className="h-14 border-b border-border px-4 flex items-center">
              <span className="font-semibold text-sm">Menu</span>
            </div>
            <nav className="p-2 space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors " +
                      (isActive
                        ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground")
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
