// Tests for dashboard utility functions.

import { describe, it, expect } from "vitest";
import { classifyStatus, computeSummary, computeResponseRate, computeStatusFunnel, computeWeeklyApplications, computeStaleApplications } from "./dashboardUtils";

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

describe("computeResponseRate", () => {
  it("returns 0 for an empty array", () => {
    expect(computeResponseRate([])).toBe(0);
  });

  it("returns 0 when no eligible applications exist", () => {
    const jobs = [{ status: "Wishlist" }, { status: "Withdrawn" }] as any[];
    expect(computeResponseRate(jobs)).toBe(0);
  });

  it("returns 0 when all eligible jobs are Applied or NoResponse", () => {
    const jobs = [{ status: "Applied" }, { status: "NoResponse" }] as any[];
    expect(computeResponseRate(jobs)).toBe(0);
  });

  it("computes response rate correctly", () => {
    const jobs = [
      { status: "Applied" },    // eligible, no reply
      { status: "Screening" },  // replied
      { status: "Rejected" },   // replied
      { status: "Wishlist" },   // excluded
      { status: "Withdrawn" },  // excluded
    ] as any[];
    // responded=2, eligible=3 → 67%
    expect(computeResponseRate(jobs)).toBe(67);
  });

  it("returns 100 when all eligible jobs received a response", () => {
    const jobs = [{ status: "Screening" }, { status: "Offered" }] as any[];
    expect(computeResponseRate(jobs)).toBe(100);
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

describe("computeStatusFunnel", () => {
  it("returns all 9 statuses with count 0 for an empty array", () => {
    const result = computeStatusFunnel([]);
    expect(result).toHaveLength(9);
    expect(result.every(e => e.count === 0)).toBe(true);
  });

  it("returns statuses in pipeline order", () => {
    const result = computeStatusFunnel([]);
    expect(result.map(e => e.status)).toEqual([
      "Wishlist", "Applied", "Screening", "Assessment", "Interview",
      "Offered", "Rejected", "Withdrawn", "NoResponse",
    ]);
  });

  it("counts jobs per status correctly", () => {
    const jobs = [
      { status: "Applied" },
      { status: "Applied" },
      { status: "Screening" },
    ] as any[];
    const result = computeStatusFunnel(jobs);
    expect(result.find(e => e.status === "Applied")?.count).toBe(2);
    expect(result.find(e => e.status === "Screening")?.count).toBe(1);
    expect(result.find(e => e.status === "Wishlist")?.count).toBe(0);
  });
});

describe("computeWeeklyApplications", () => {
  it("returns empty array for no jobs", () => {
    expect(computeWeeklyApplications([])).toEqual([]);
  });

  it("excludes jobs without appliedAt", () => {
    const jobs = [{ status: "Applied" }] as any[];
    expect(computeWeeklyApplications(jobs)).toEqual([]);
  });

  it("groups two jobs in the same week into one entry", () => {
    const jobs = [
      { appliedAt: "2025-06-30T00:00:00Z" }, // Monday
      { appliedAt: "2025-07-02T00:00:00Z" }, // Wednesday, same week
    ] as any[];
    const result = computeWeeklyApplications(jobs);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(2);
    expect(result[0].week).toBe("Jun 30 '25");
  });

  it("returns entries sorted oldest first", () => {
    const jobs = [
      { appliedAt: "2025-07-07T00:00:00Z" }, // week of Jul 7
      { appliedAt: "2025-06-30T00:00:00Z" }, // week of Jun 30
    ] as any[];
    const result = computeWeeklyApplications(jobs);
    expect(result[0].week).toBe("Jun 30 '25");
    expect(result[1].week).toBe("Jul 7 '25");
  });
});

describe("computeStaleApplications", () => {
  it("returns empty array for no jobs", () => {
    expect(computeStaleApplications([], 21)).toEqual([]);
  });
});
