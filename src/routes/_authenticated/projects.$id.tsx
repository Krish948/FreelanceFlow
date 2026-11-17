import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/projects/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/freelancer/projects/$id", params });
  },
});
