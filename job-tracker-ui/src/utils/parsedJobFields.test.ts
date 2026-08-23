// Tests for toFormFields — specifically the DateOnly → local Date conversion,
// which exists to avoid the UTC-midnight shift `new Date(dateOnlyString)` causes
// in UTC+ time zones (see the comment in parsedJobFields.ts).
import { describe, it, expect } from "vitest"
import { toFormFields } from "./parsedJobFields"
import type { ParsedJobFields } from "@/services/parseService"

describe("toFormFields", () => {
  it("leaves closedAt undefined when the source field is absent", () => {
    const result = toFormFields({ company: "Acme" })
    expect(result.closedAt).toBeUndefined()
  })

  it("converts a DateOnly string to a local Date with matching y/m/d", () => {
    const fields: ParsedJobFields = { closedAt: "2024-03-15" }
    const result = toFormFields(fields)
    expect(result.closedAt).toBeInstanceOf(Date)
    expect(result.closedAt?.getFullYear()).toBe(2024)
    expect(result.closedAt?.getMonth()).toBe(2) // 0-indexed: March = 2
    expect(result.closedAt?.getDate()).toBe(15)
  })

  it("passes through the other fields unchanged", () => {
    const fields: ParsedJobFields = { company: "Acme", role: "Engineer", salaryMin: 100000 }
    const result = toFormFields(fields)
    expect(result.company).toBe("Acme")
    expect(result.role).toBe("Engineer")
    expect(result.salaryMin).toBe(100000)
  })
})
