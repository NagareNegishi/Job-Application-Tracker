// Tests for validateTag — stacked rules (HTML rejection, repeated-char heuristic,
// case-insensitive duplicate, length/count limits). Rules are checked in a fixed
// order, so a value tripping multiple rules should report the first one.
import { describe, it, expect } from "vitest"
import { validateTag } from "./validateTag"

describe("validateTag", () => {
  it("accepts a plain valid value with no options", () => {
    expect(validateTag("React")).toBeNull()
  })

  it("rejects values containing HTML tags", () => {
    expect(validateTag("<b>React</b>")).toBe("Only plain text is allowed")
  })

  it("does not flag a lone < or > without a full tag", () => {
    expect(validateTag("5 < 10")).toBeNull()
  })

  it("rejects values longer than maxLength", () => {
    expect(validateTag("a".repeat(21), { maxLength: 20 })).toBe("This entry is too long")
  })

  it("accepts a value exactly at maxLength", () => {
    const value = "ab".repeat(10) // 20 chars, not all-repeating
    expect(validateTag(value, { maxLength: 20 })).toBeNull()
  })

  it("rejects a value where every character repeats the first (length > 2)", () => {
    expect(validateTag("aaaa")).toBe("This doesn't look like a valid entry")
  })

  it("allows short repeated-character values (length <= 2)", () => {
    expect(validateTag("aa")).toBeNull()
  })

  it("allows a value with more than 2 chars that isn't all-repeating", () => {
    expect(validateTag("aab")).toBeNull()
  })

  it("rejects a case-insensitive duplicate of an existing entry", () => {
    expect(validateTag("react", { existing: ["React"] })).toBe("This is already in the list")
  })

  it("accepts a value not present in existing", () => {
    expect(validateTag("Vue", { existing: ["React"] })).toBeNull()
  })

  it("rejects once maxItems is reached", () => {
    expect(validateTag("Vue", { existing: ["React", "Angular"], maxItems: 2 })).toBe("You've reached the limit")
  })

  it("allows adding when under maxItems", () => {
    expect(validateTag("Vue", { existing: ["React"], maxItems: 2 })).toBeNull()
  })

  it("checks rules in order — HTML rejection wins over duplicate/limit checks", () => {
    expect(validateTag("<b>React</b>", { existing: ["<b>React</b>"], maxItems: 0 })).toBe("Only plain text is allowed")
  })
})
