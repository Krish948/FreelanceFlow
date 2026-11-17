import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Pricing — FreelanceFlow" },
      {
        name: "description",
        content: "Free for up to 2 clients. Pro unlocks unlimited clients and PDF invoices.",
      },
      { property: "og:title", content: "Pricing — FreelanceFlow" },
      {
        property: "og:description",
        content: "Free for up to 2 clients. Pro unlocks unlimited clients and PDF invoices.",
      },
    ],
  }),
  component: Pricing,
});

const tiers = [
  {
    id: "FREE",
    name: "Free",
    price: "₹0",
    features: [
      "Up to 2 clients",
      "Unlimited projects & tasks",
      "Time tracking",
      "Invoices (no PDF)",
      "Finance dashboard",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹499",
    features: [
      "Unlimited clients",
      "PDF invoice downloads",
      "AI task planning",
      "Everything in Free",
    ],
  },
] as const;

function Pricing() {
  const qc = useQueryClient();
  const [plan, setPlan] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        const r = await supabase.from("subscriptions").select("plan").maybeSingle();
        setPlan(r.data?.plan ?? "FREE");
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link to={signedIn ? "/dashboard" : "/"} className="text-sm text-primary hover:underline">
          ← Back
        </Link>
        <h1 className="mt-6 text-5xl font-semibold">Simple pricing</h1>
        <p className="mt-2 text-muted-foreground">
          Start free. Upgrade when your client list grows.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {tiers.map((t) => (
            <div
              key={t.id}
              className={
                t.id === "PRO"
                  ? "rounded-2xl bg-hero p-8 text-primary-foreground shadow-soft"
                  : "rounded-2xl border bg-card p-8 shadow-soft"
              }
            >
              <h2 className="text-2xl font-semibold">{t.name}</h2>
              <div className="mt-4 font-display text-5xl font-semibold">
                {t.price}
                <span className="text-base font-normal opacity-60"> /month</span>
              </div>
              <ul className="mt-6 grid gap-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {!signedIn ? (
                  <Button asChild className="w-full">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get started
                    </Link>
                  </Button>
                ) : plan === t.id ? (
                  <Button disabled variant="secondary" className="w-full">
                    Current plan
                  </Button>
                ) : (
                  <Button
                    disabled
                    className={
                      t.id === "PRO"
                        ? "w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        : "w-full"
                    }
                  >
                    {t.id === "PRO" ? "Upgrade to Pro" : "Switch to Free"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Online subscription billing is not connected yet. No payment will be taken.
        </p>
      </div>
    </div>
  );
}
