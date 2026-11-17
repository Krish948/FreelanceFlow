import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/clients/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/freelancer/clients/$id", params });
  },
});
