import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/clients/")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/clients" });
  },
});
