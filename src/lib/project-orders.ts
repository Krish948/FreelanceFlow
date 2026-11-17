export const projectOrderStatuses = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProjectOrderStatus = (typeof projectOrderStatuses)[number];

export function projectOrderStatusLabel(status: string | null | undefined) {
  return String(status ?? "OPEN")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (char) => char.toUpperCase());
}

export function canFreelancerAcceptOrder(status: string | null | undefined) {
  return (status ?? "OPEN").toUpperCase() === "OPEN";
}

export function isOrderVisibleToFreelancers(status: string | null | undefined) {
  return canFreelancerAcceptOrder(status);
}

export function acceptedProjectId(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(
      "The database has not activated accepted orders yet. Apply migration 0007_repair_accepted_project_orders.sql, then retry.",
    );
  }
  return value;
}
