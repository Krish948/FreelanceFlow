import { describe, expect, it } from "vitest";
import {
  acceptedProjectId,
  canFreelancerAcceptOrder,
  isOrderVisibleToFreelancers,
  projectOrderStatusLabel,
} from "@/lib/project-orders";

describe("project orders", () => {
  it("keeps open orders visible to freelancers", () => {
    expect(canFreelancerAcceptOrder("OPEN")).toBe(true);
    expect(isOrderVisibleToFreelancers("OPEN")).toBe(true);
  });

  it("hides assigned or completed orders from the marketplace", () => {
    expect(canFreelancerAcceptOrder("ASSIGNED")).toBe(false);
    expect(isOrderVisibleToFreelancers("COMPLETED")).toBe(false);
  });

  it("formats status labels for UI display", () => {
    expect(projectOrderStatusLabel("OPEN")).toBe("Open");
    expect(projectOrderStatusLabel("IN_PROGRESS")).toBe("In Progress");
  });

  it("requires acceptance to return the created project ID", () => {
    expect(acceptedProjectId("53b1f1f0-92e9-4e16-a4cf-1c96e440c3d4")).toBe(
      "53b1f1f0-92e9-4e16-a4cf-1c96e440c3d4",
    );
    expect(() => acceptedProjectId("ASSIGNED")).toThrow("0007_repair_accepted_project_orders.sql");
  });
});
