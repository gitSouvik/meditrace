import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useReports, useInsights } from "@/hooks/useReports";
import { Pencil } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      setDisplayName(data.display_name || "");
    }
  }, [data, user]);

  const { data: reports } = useReports();
  const { data: insights } = useInsights();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 py-6 sm:py-8 space-y-7 md:space-y-6">
      <div className="border border-border rounded-md bg-card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-lg font-semibold md:text-foreground text-muted-foreground dark:text-foreground/90 dark:md:text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground">Your account details</p>
        </div>
        <div className="flex items-center">
          <Link to="/settings" className="md:hidden">
            <Button variant="outline" size="icon" aria-label="Edit profile">
              <Pencil className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/settings" className="hidden md:block">
            <Button variant="outline">Edit profile</Button>
          </Link>
        </div>
      </div>

      <div className="border border-border rounded-md bg-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-border flex items-center justify-center text-base font-semibold text-primary">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-base font-medium text-foreground truncate">
              {displayName || user?.email?.split("@")[0] || "User"}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {user?.email}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-border rounded-md p-3">
            <div className="text-xs text-muted-foreground">Display name</div>
            <div className="text-sm text-foreground">{displayName || "—"}</div>
          </div>
          <div className="border border-border rounded-md p-3">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm text-foreground">{user?.email || "—"}</div>
          </div>
          <div className="border border-border rounded-md p-3">
            <div className="text-xs text-muted-foreground">Reports</div>
            <div className="text-sm text-foreground">
              {reports?.length || 0}
            </div>
          </div>
          <div className="border border-border rounded-md p-3">
            <div className="text-xs text-muted-foreground">Insights</div>
            <div className="text-sm text-foreground">
              {insights?.length || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-md bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Security</div>
            <div className="text-xs text-muted-foreground">
              Manage session and password
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/reset-password">
              <Button variant="outline">Change password</Button>
            </Link>
            <Button variant="destructive" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
