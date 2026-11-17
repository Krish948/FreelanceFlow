import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Details = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
} | null;
type Result = { data: Details; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<Result>;
  approveAuthorization: (id: string) => Promise<Result>;
  denyAuthorization: (id: string) => Promise<Result>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Connect an app — FreelanceFlow" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id)
      throw new Error("This connection link is missing its request id.");
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({ to: "/auth", search: { redirect: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-2xl font-semibold">Couldn't load this connection request</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : String(error)} It may have expired — start the
        connection again from your assistant.
      </p>
    </main>
  ),
});

const scopeLabel = (s: string) =>
  (
    ({
      openid: "Confirm your identity",
      email: "Share your email address",
      profile: "Share your basic profile",
    }) as Record<string, string>
  )[s] ?? `Additional permission requested: ${s}`;

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "An app";
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    const target = data?.redirect_url ?? data?.redirect_to;
    if (error || !target) {
      setBusy(false);
      setError(error?.message ?? "Something went wrong. Please try again.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Connect {name} to FreelanceFlow</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {name} will be able to read your clients, projects, time and invoices, and add tasks, as
          you{email ? ` (${email})` : ""}.
        </p>
        {details?.client?.redirect_uri && (
          <p className="mt-3 text-xs text-muted-foreground">
            Returns to: {details.client.redirect_uri}
          </p>
        )}
        {details?.scope && (
          <ul className="mt-4 list-disc pl-5 text-sm">
            {details.scope
              .split(" ")
              .filter(Boolean)
              .map((s) => (
                <li key={s}>{scopeLabel(s)}</li>
              ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          This does not bypass this app's permissions — it only sees your own data.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <Button disabled={busy} onClick={() => decide(true)}>
            Approve
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
