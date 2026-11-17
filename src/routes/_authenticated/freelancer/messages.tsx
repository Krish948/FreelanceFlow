import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/freelancer/messages")({
  beforeLoad: () => {
    throw redirect({ to: "/freelancer/dashboard" });
  },
});
