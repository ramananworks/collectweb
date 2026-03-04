import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotConfirmed(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setEmailNotConfirmed(true);
      }
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verification email sent", description: "Please check your inbox and click the link to verify." });
      setEmailNotConfirmed(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-3">CollectWeb</h2>
          <p className="text-primary-foreground/80 text-lg">
            Streamline your collections, manage credit, and track payments — all in one place.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CollectWeb</span>
          </div>

          {forgotMode ? (
            resetSent ? (
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Click the link in the email to set a new password.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setResetSent(false); }}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-1">Forgot password?</h1>
                <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send you a reset link</p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                    {loading ? "Sending…" : "Send Reset Link"}
                  </Button>
                </form>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <button onClick={() => setForgotMode(false)} className="font-medium text-primary hover:underline">
                    Sign in
                  </button>
                </p>
              </>
            )
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
              <p className="text-sm text-muted-foreground mb-6">Sign in to your account to continue</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </Button>
              </form>

              {emailNotConfirmed && (
                <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your email is not verified yet. Didn't get the email or link expired?</p>
                  <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={resending}>
                    {resending ? "Sending…" : "Resend Verification Email"}
                  </Button>
                </div>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
