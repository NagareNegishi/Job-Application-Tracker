// Tests for checkDateOrder (granularity-aware range check) and checkNotFuture
// (mirrors backend's not-future rule).
import { describe, it, expect, vi, afterEach } from "vitest"
import { checkDateOrder, checkNotFuture } from "./dateValidation"

describe("checkDateOrder", () => {
  it("returns null when there is no end date", () => {
    expect(checkDateOrder(2020, null)).toBeNull()
    expect(checkDateOrder(2020, 0)).toBeNull()
  })

  it("rejects an end year before the start year", () => {
    expect(checkDateOrder(2020, 2019)).toBe("End year must be after start year.")
  })

  it("accepts an end year after the start year", () => {
    expect(checkDateOrder(2020, 2021)).toBeNull()
  })

  it("accepts equal years when months aren't provided", () => {
    expect(checkDateOrder(2020, 2020)).toBeNull()
  })

  it("checks month order only when both months are provided and years are equal", () => {
    expect(checkDateOrder(2020, 2020, 6, 5)).toBe("End month must be after start month.")
    expect(checkDateOrder(2020, 2020, 5, 6)).toBeNull()
  })

  it("skips month check across different years even if months look out of order", () => {
    expect(checkDateOrder(2020, 2021, 12, 1)).toBeNull()
  })

  it("checks day order only when months are equal and both days are provided", () => {
    expect(checkDateOrder(2020, 2020, 5, 5, 10, 9)).toBe("End day must be after start day.")
    expect(checkDateOrder(2020, 2020, 5, 5, 9, 10)).toBeNull()
  })

  it("skips day check when months differ", () => {
    expect(checkDateOrder(2020, 2020, 5, 6, 10, 1)).toBeNull()
  })
})

describe("checkNotFuture", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null when no year is selected", () => {
    expect(checkNotFuture(null, null)).toBeNull()
    expect(checkNotFuture(0, null)).toBeNull()
  })

  it("rejects a year after the current year", () => {
    vi.setSystemTime(new Date(2024, 5, 15)) // June 2024
    expect(checkNotFuture(2025, null)).toBe("Date cannot be in the future.")
  })

  it("accepts a year before the current year", () => {
    vi.setSystemTime(new Date(2024, 5, 15))
    expect(checkNotFuture(2023, null)).toBeNull()
  })

  it("rejects the current year with a future month", () => {
    vi.setSystemTime(new Date(2024, 5, 15)) // June (month 6)
    expect(checkNotFuture(2024, 7)).toBe("Date cannot be in the future.")
  })

  it("accepts the current year with the current or past month", () => {
    vi.setSystemTime(new Date(2024, 5, 15))
    expect(checkNotFuture(2024, 6)).toBeNull()
    expect(checkNotFuture(2024, 1)).toBeNull()
  })

  it("accepts the current year when no month is given", () => {
    vi.setSystemTime(new Date(2024, 5, 15))
    expect(checkNotFuture(2024, null)).toBeNull()
  })
})
