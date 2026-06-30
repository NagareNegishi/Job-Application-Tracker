// Tests for dashboard utility functions.

import { describe, it, expect } from "vitest";
import { classifyStatus, computeSummary } from "./dashboardUtils";

describe("classifyStatus", () => {
  it("classifies active statuses correctly", () => {
    expect(classifyStatus("Wishlist")).toBe("active");
    expect(classifyStatus("Applied")).toBe("active");
    expect(classifyStatus("Screening")).toBe("active");
    expect(classifyStatus("Assessment")).toBe("active");
    expect(classifyStatus("Interview")).toBe("active");
  });

  it("classifies Offered as won", () => {
    expect(classifyStatus("Offered")).toBe("won");
  });

  it("classifies closed statuses correctly", () => {
    expect(classifyStatus("Rejected")).toBe("closed");
    expect(classifyStatus("Withdrawn")).toBe("closed");
    expect(classifyStatus("NoResponse")).toBe("closed");
  });
});

describe("computeSummary", () => {
  it("returns zeros for an empty array", () => {
    expect(computeSummary([])).toEqual({ active: 0, won: 0, closed: 0 });
  });

  it("counts each group correctly", () => {
    const jobs = [
      { status: "Applied" },
      { status: "Interview" },
      { status: "Offered" },
      { status: "Rejected" },
      { status: "Rejected" },
    ] as any[];
    expect(computeSummary(jobs)).toEqual({ active: 2, won: 1, closed: 2 });
  });
});
