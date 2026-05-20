import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  FileText,
  Upload,
  Clock,
  BookOpen,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const navItems = [
  { icon: Clock, label: "Timeline", path: "/" },
  { icon: Upload, label: "Upload Report", path: "/upload" },
  { icon: BookOpen, label: "Health Biography", path: "/biography" },
  { icon: TrendingUp, label: "Trends", path: "/trends" },
  { icon: FileText, label: "All Reports", path: "/reports" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar md:h-screen md:sticky md:top-0 overflow-hidden md:w-14"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        <div className="hidden">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm whitespace-nowrap overflow-hidden hidden" aria-hidden>
            MediTrace
          </span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="sr-only" aria-hidden>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="sr-only" aria-hidden>
            Settings
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="sr-only" aria-hidden>
            Sign out
          </span>
        </button>
      </div>
    </aside>
    {/* Desktop overlay for expanded sidebar */}
    {!collapsed && (
      <>
        <div
          className="hidden md:block fixed inset-0 z-40 search-backdrop animate-fade-in"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
        <div className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar shadow-lg">
          <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground text-sm whitespace-nowrap">
                MediTrace
              </span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setCollapsed(true)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
            <Link
              to="/settings"
              onClick={() => setCollapsed(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => {
                setCollapsed(true);
                handleLogout();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}
