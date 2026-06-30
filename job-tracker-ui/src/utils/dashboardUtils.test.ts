// Tests for dashboard utility functions.

import { describe, it, expect } from "vitest";
import { classifyStatus } from "./dashboardUtils";

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
