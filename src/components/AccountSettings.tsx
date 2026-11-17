import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { PageHeader, Field } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountSettings() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: "",
    phone: "",
    address: "",
    notify_payments: true,
  });
  const [pw, setPw] = useState({ current: "", next: "" });
  useEffect(() => {
    if (profile)
      setF({
        name: profile.name,
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        notify_payments: profile.notify_payments,
      });
  }, [profile]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const { error } = await supabase.from("profiles").update(f).eq("id", profile.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Account saved");
  }
  async function password(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({
      password: pw.next,
      current_password: pw.current,
    });
    if (error) return toast.error(error.message);
    setPw({ current: "", next: "" });
    toast.success("Password updated");
  }
  return (
    <>
      <PageHeader title="My Account" subtitle={profile?.email ?? undefined} />
      <div className="grid gap-10 lg:grid-cols-2">
        <form onSubmit={save} className="grid content-start gap-4">
          <h2 className="text-xl font-semibold">Personal details</h2>
          <Field label="Name">
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </Field>
          <h2 className="mt-5 text-xl font-semibold">Notification preferences</h2>
          {([["notify_payments", "Invoices & payment reminders"]] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f[key]}
                onChange={(e) => setF({ ...f, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <Button type="submit" className="w-fit">
            Save account
          </Button>
        </form>
        <form onSubmit={password} className="grid content-start gap-4">
          <h2 className="text-xl font-semibold">Change password</h2>
          <Field label="Current password">
            <Input
              required
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
            />
          </Field>
          <Field label="New password">
            <Input
              required
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
      </div>
    </>
  );
}
