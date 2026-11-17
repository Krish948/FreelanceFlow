import { createFileRoute } from "@tanstack/react-router";
import { FreelancerWorkHub } from "@/components/FreelancerWorkHub";
import { appHead } from "@/lib/route-head";

export const Route = createFileRoute("/_authenticated/freelancer/clients/")({
  head: () => appHead("My Work", "Manage clients, projects, and open orders."),
  component: FreelancerWorkHub,
});
