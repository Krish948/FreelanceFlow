import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { roleDestination, roleHome } from "@/lib/roles";

describe("role destinations", () => {
  it("sends freelancers to their separate dashboard", () => {
    expect(roleHome("freelancer")).toBe("/freelancer/dashboard");
  });
  it("sends clients to their separate dashboard", () => {
    expect(roleHome("client")).toBe("/client/dashboard");
  });
  it("does not send clients into freelancer-only pages", () => {
    expect(roleDestination("client", "/freelancer/finance")).toBe("/client/dashboard");
  });
  it("does not send freelancers into client-only pages", () => {
    expect(roleDestination("freelancer", "/client/dashboard")).toBe("/freelancer/dashboard");
  });
  it("rejects external post-login destinations", () => {
    expect(roleDestination("client", "//other.example/client/dashboard")).toBe("/client/dashboard");
  });
  it("keeps authorized project paths", () => {
    expect(roleDestination("client", "/client/projects")).toBe("/client/projects");
  });
  it("accepts the role root and query-string variants", () => {
    expect(roleDestination("client", "/client")).toBe("/client");
    expect(roleDestination("freelancer", "/freelancer?tab=overview")).toBe(
      "/freelancer?tab=overview",
    );
  });
});
