import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/freelancer/payments")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/invoices" });
  },
});
