import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui-kit";
import { getMyRole, roleDestination, type AppRole } from "@/lib/roles";
import { oauthReturnPath } from "@/lib/oauth-return-path";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — FreelanceFlow" },
      { name: "description", content: "Sign in or create your FreelanceFlow account." },
      { property: "og:title", content: "Sign in — FreelanceFlow" },
      { property: "og:description", content: "Sign in or create your FreelanceFlow account." },
    ],
  }),
  component: AuthPage,
});

const safePath = (p?: string) => {
  if (!p) return "/dashboard";
  const r = oauthReturnPath(p);
  return r === "/" ? "/dashboard" : r;
};

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole>("freelancer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const signup = mode === "signup";

  useEffect(() => {
    let active = true;
    const finish = async () => {
      try {
        const preferred = sessionStorage.getItem("signup_role");
        if (preferred === "client" || preferred === "freelancer") {
          await supabase.rpc("set_my_role", { _role: preferred });
          sessionStorage.removeItem("signup_role");
        }
        const actual = await getMyRole();
        if (active) navigate({ href: roleDestination(actual, redirect), replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load your account");
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void finish();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) setTimeout(() => void finish(), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    if (signup) {
      const callback = new URL("/auth", window.location.origin);
      if (redirect) callback.searchParams.set("redirect", safePath(redirect));
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.href, data: { name, role } },
      });
      if (error) toast.error(error.message);
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  }

  async function google() {
    if (signup) sessionStorage.setItem("signup_role", role);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri:
        window.location.origin +
        "/auth" +
        (redirect ? "?redirect=" + encodeURIComponent(safePath(redirect)) : ""),
    });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="font-display text-xl font-semibold">
          FreelanceFlow
        </Link>
        <blockquote className="font-display text-4xl leading-tight">
          "Every hour tracked is an hour you get paid for."
        </blockquote>
        <p className="text-sm text-primary-foreground/60">Clients · Projects · Time · Invoices</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <h1 className="text-3xl font-semibold">Check your email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to {email}. Click it to finish creating your account.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold">
                {signup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {signup
                  ? role === "client"
                    ? "Your projects, files and invoices."
                    : "Free forever for up to 2 clients."
                  : "Sign in to your workspace."}
              </p>
              {signup && (
                <div className="mt-5 grid grid-cols-2 gap-2" role="group" aria-label="Account type">
                  {(["freelancer", "client"] as const).map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant={role === r ? "default" : "outline"}
                      onClick={() => setRole(r)}
                    >
                      {r === "client" ? "Client" : "Freelancer"}
                    </Button>
                  ))}
                </div>
              )}
              <Button variant="outline" className="mt-6 w-full" onClick={google}>
                Continue with Google
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submit} className="grid gap-4">
                {signup && (
                  <Field label="Name">
                    <Input required value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                )}
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
                <Button type="submit" disabled={busy}>
                  {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
                </Button>
              </form>
              <div className="mt-5 flex justify-between text-sm">
                <Link
                  to="/auth"
                  search={{ mode: signup ? "signin" : "signup", redirect }}
                  className="text-primary hover:underline"
                >
                  {signup ? "Have an account? Sign in" : "New here? Create account"}
                </Link>
                {!signup && (
                  <Link to="/forgot-password" className="text-muted-foreground hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
