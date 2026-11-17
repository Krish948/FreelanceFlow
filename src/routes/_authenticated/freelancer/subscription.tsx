import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/freelancer/subscription")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/invoices" });
  },
});
