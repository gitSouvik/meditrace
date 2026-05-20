import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const { data } = useQuery({
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
    setEmail(user?.email || "");
    if (data) {
      setDisplayName(data.display_name || "");
    }
  }, [data, user]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        display_name: displayName || null,
        email: email || null,
      } as any;
      const { error } = await supabase.from("profiles" as any).upsert(payload, {
        onConflict: "user_id",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Saved", description: "Profile updated." });
    },
    onError: (e: any) => {
      toast({
        title: "Save failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 py-6 sm:py-8 space-y-7 md:space-y-6">
      <div className="border border-border rounded-md bg-card p-4">
        <h1 className="text-2xl md:text-lg font-semibold md:text-foreground text-muted-foreground dark:text-foreground/90 dark:md:text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">Edit your profile</p>
      </div>
      <div className="border border-border rounded-md bg-card p-4 space-y-4 max-w-2xl">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !user}
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save changes
          </Button>
          <Link to="/reset-password">
            <Button variant="outline">Change password</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
