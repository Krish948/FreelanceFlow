import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/freelancer/time")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/finance" });
  },
});
