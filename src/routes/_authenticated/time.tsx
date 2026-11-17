import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/time")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/time" });
  },
});
