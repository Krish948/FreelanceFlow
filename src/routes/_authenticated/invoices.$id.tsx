import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/invoices/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/freelancer/invoices/$id", params });
  },
});
