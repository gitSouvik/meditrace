import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import AppLayout from "./components/AppLayout";
import AuthPage from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Timeline from "./pages/Timeline";
import UploadPage from "./pages/UploadPage";
import Biography from "./pages/Biography";
import Trends from "./pages/Trends";
import Reports from "./pages/Reports";
import ReportViewer from "./pages/ReportViewer";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <AppLayout />;
}

function AuthRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <AuthPage />;
}

function PathKeeper() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname) {
      const full = location.pathname + (location.search || "");
      localStorage.setItem("meditrace:last-path", full);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (window.location.pathname === "/") {
      const saved = localStorage.getItem("meditrace:last-path");
      const restored = sessionStorage.getItem("meditrace:restored");
      if (saved && saved !== "/" && !restored) {
        sessionStorage.setItem("meditrace:restored", "1");
        navigate(saved, { replace: true });
      }
    }
  }, [navigate]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <PathKeeper />
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Timeline />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/biography" element={<Biography />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:reportId" element={<ReportViewer />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
