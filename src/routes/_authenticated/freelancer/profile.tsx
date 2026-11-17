import { appHead } from "@/lib/route-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, usePlan } from "@/lib/data";
import { PageHeader, Panel, Field } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/freelancer/profile")({
  head: () => appHead("Profile", "Manage your FreelanceFlow profile."),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const { data: plan } = usePlan();
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: "",
    business_name: "",
    phone: "",
    address: "",
    default_hourly_rate: 0,
    notify_payments: true,
  });
  const [pw, setPw] = useState({ current: "", next: "" });
  useEffect(() => {
    if (profile)
      setF({
        name: profile.name ?? "",
        business_name: profile.business_name ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        default_hourly_rate: Number(profile.default_hourly_rate),
        notify_payments: profile.notify_payments,
      });
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("profiles").update(f).eq("id", profile.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({
      password: pw.next,
      current_password: pw.current,
    } as never);
    if (error) return toast.error(error.message);
    setPw({ current: "", next: "" });
    toast.success("Password changed");
  }

  return (
    <>
      <PageHeader title="Profile" subtitle={profile?.email ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Your details">
          <p className="mb-4 text-xs text-muted-foreground">These appear on your invoices.</p>
          <form onSubmit={save} className="grid gap-3">
            <Field label="Name">
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Business name">
              <Input
                value={f.business_name}
                onChange={(e) => setF({ ...f, business_name: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </Field>
            <Field label="Default hourly rate (₹)">
              <Input
                type="number"
                min="0"
                value={f.default_hourly_rate}
                onChange={(e) => setF({ ...f, default_hourly_rate: Number(e.target.value) })}
              />
            </Field>
            <h3 className="mt-3 font-semibold">Notification preferences</h3>
            {([["notify_payments", "Invoices & payment reminders"]] as const).map(
              ([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={f[key]}
                    onChange={(e) => setF({ ...f, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ),
            )}
            <Button type="submit" className="w-fit">
              Save
            </Button>
          </form>
        </Panel>
        <div className="grid gap-6 content-start">
          <Panel title="Plan">
            <p className="text-sm">
              You're on <b>{plan ?? "FREE"}</b>.
            </p>
            <Button asChild variant="outline" className="mt-3">
              <Link to="/pricing">Manage plan</Link>
            </Button>
          </Panel>
          <Panel title="Change password">
            <form onSubmit={changePw} className="grid gap-3">
              <Field label="Current password">
                <Input
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                />
              </Field>
              <Field label="New password">
                <Input
                  type="password"
                  minLength={8}
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                />
              </Field>
              <Button type="submit" className="w-fit">
                Update password
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
