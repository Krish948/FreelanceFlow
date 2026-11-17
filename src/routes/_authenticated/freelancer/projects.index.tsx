import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/freelancer/projects/")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/clients" });
  },
});
