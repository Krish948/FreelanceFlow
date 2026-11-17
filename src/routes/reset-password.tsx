import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMyRole, roleHome } from "@/lib/roles";
import { Field } from "@/components/ui-kit";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set new password — FreelanceFlow" },
      { name: "description", content: "Choose a new password for your FreelanceFlow account." },
      { property: "og:title", content: "Set new password — FreelanceFlow" },
      {
        property: "og:description",
        content: "Choose a new password for your FreelanceFlow account.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: roleHome(await getMyRole()) });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="grid w-full max-w-sm gap-4">
        <h1 className="text-3xl font-semibold">Set a new password</h1>
        <Field label="New password">
          <Input
            type="password"
            minLength={8}
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </Field>
        <Button type="submit">Update password</Button>
      </form>
    </div>
  );
}
