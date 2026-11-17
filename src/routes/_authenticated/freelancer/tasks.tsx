import { createFileRoute } from "@tanstack/react-router";
import { FreelancerTasks } from "@/components/FreelancerTasks";
import { appHead } from "@/lib/route-head";
export const Route = createFileRoute("/_authenticated/freelancer/tasks")({
  head: () => appHead("Tasks | Freelancer", "Your FreelanceFlow freelancer tasks."),
  component: Page,
});
function Page() {
  return <FreelancerTasks />;
}
