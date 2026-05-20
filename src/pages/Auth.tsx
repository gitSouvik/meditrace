import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();
  const demoEmail = "demo.acc2k26@gmail.com";
  const demoPassword = "demo12345";
  const fillDemo = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = String(import.meta.env.VITE_SUPABASE_URL || "");
    const key =
      String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "") ||
      String(import.meta.env.VITE_SUPABASE_ANON_KEY || "");
    const valid =
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) &&
      !!key &&
      !/example|FAKE|undefined|null/i.test(url + key);
    if (!valid) {
      toast({
        title: "Configuration error",
        description:
          "Supabase is not configured. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data?.session) {
          toast({
            title: "Account created",
            description: "Email verification is disabled. You are signed in.",
          });
        } else {
          toast({
            title: "Check your email",
            description:
              "We sent you a verification link to confirm your account.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      } as any);
      if (error) throw error;
      toast({
        title: "Verification sent",
        description:
          "If the account exists and needs verification, an email has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Resend error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isLogin ? "Sign in to MediTrace" : "Create your account"}
          </h1>
        </div>

        <div className="border border-border rounded-md bg-card p-4 mb-4">
          <div className="text-sm font-medium text-foreground mb-2">
            Demo credentials
          </div>
          <pre className="text-xs bg-muted text-muted-foreground rounded p-3 overflow-x-auto">
            <code>{`Email: demo.acc2k26@gmail.com
Password: demo12345`}</code>
          </pre>
          <div className="text-xs text-destructive mt-2">
            Note: Sign up is not enabled in this demo preview. Everything else is fully functional inside!
          </div>
          <Button
            type="button"
            variant="destructive"
            className="mt-2 h-8 w-full text-xs"
            onClick={fillDemo}
          >
            Click to fill demo credentials
          </Button>
        </div>

        {/* Auth Form */}
        <div className="border border-border rounded-md bg-card p-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>
                {isLogin && (
                  <Link to="/forgot-password" className="text-xs text-link">
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-sm"
            >
              {loading ? "Loading..." : isLogin ? "Sign in" : "Create account"}
            </Button>
          </form>
          {!isLogin && (
            <div className="mt-3 text-xs text-muted-foreground text-center">
              <button
                type="button"
                disabled={resending || !email}
                onClick={handleResend}
                className="text-link disabled:opacity-50"
              >
                Resend verification email
              </button>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="mt-4 text-center border border-border rounded-md bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "New to MediTrace?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-link font-medium"
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
