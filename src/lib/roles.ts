import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export type AppRole = "freelancer" | "client";
export function roleHome(role: AppRole) {
  return role === "client" ? ("/client/dashboard" as const) : ("/freelancer/dashboard" as const);
}

function isRolePath(role: AppRole, path: string) {
  const prefix = `/${role}`;
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`) ||
    path.startsWith(`${prefix}?`) ||
    path.startsWith(`${prefix}#`)
  );
}

export function roleDestination(role: AppRole, requested?: string) {
  const safe = oauthReturnPath(requested);
  if (safe.startsWith("/.lovable/oauth/consent")) return safe;
  if (isRolePath(role, safe)) return safe;
  return roleHome(role);
}
export async function getMyRole(): Promise<AppRole> {
  const { data, error } = await supabase.rpc("my_role");
  if (error || (data !== "client" && data !== "freelancer"))
    throw new Error("Your account role could not be loaded. Please sign in again.");
  return data;
}
