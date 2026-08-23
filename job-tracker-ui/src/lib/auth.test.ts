// Tests for the JWT-claim readers in auth.ts. Builds real base64url-encoded
// payloads rather than hardcoding token strings, so intent stays readable.
// getToken/setToken/clearToken are trivial in-memory getters/setters — not
// worth testing in isolation, but are used here to seed state for the others.
import { describe, it, expect, beforeEach } from "vitest"
import { setToken, clearToken, getEmail, getRoles, hasRole } from "./auth"

// Builds a JWT-shaped string (header.payload.signature) with a base64url-encoded
// payload; header and signature content don't matter to these functions.
function makeToken(payload: object): string {
  const b64url = (s: string) =>
    btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  return `${b64url("{}")}.${b64url(JSON.stringify(payload))}.sig`
}

beforeEach(() => {
  clearToken()
})

describe("getEmail", () => {
  it("returns null when there is no token", () => {
    expect(getEmail()).toBeNull()
  })

  it("returns the email claim from a valid token", () => {
    setToken(makeToken({ email: "user@example.com" }))
    expect(getEmail()).toBe("user@example.com")
  })

  it("returns null when the email claim is absent", () => {
    setToken(makeToken({}))
    expect(getEmail()).toBeNull()
  })

  it("returns null for a malformed token instead of throwing", () => {
    setToken("not-a-real-jwt")
    expect(getEmail()).toBeNull()
  })
})

describe("getRoles", () => {
  it("returns an empty array when there is no token", () => {
    expect(getRoles()).toEqual([])
  })

  it("returns an empty array when the role claim is absent", () => {
    setToken(makeToken({}))
    expect(getRoles()).toEqual([])
  })

  it("normalizes a single string role to an array", () => {
    setToken(makeToken({ role: "Admin" }))
    expect(getRoles()).toEqual(["Admin"])
  })

  it("passes through an array of roles as-is", () => {
    setToken(makeToken({ role: ["Admin", "AiUser"] }))
    expect(getRoles()).toEqual(["Admin", "AiUser"])
  })

  it("returns an empty array for a malformed token instead of throwing", () => {
    setToken("not-a-real-jwt")
    expect(getRoles()).toEqual([])
  })
})

describe("hasRole", () => {
  it("returns true when the role is present", () => {
    setToken(makeToken({ role: ["Admin", "AiUser"] }))
    expect(hasRole("Admin")).toBe(true)
  })

  it("returns false when the role is absent", () => {
    setToken(makeToken({ role: "AiUser" }))
    expect(hasRole("Admin")).toBe(false)
  })

  it("returns false when there is no token", () => {
    expect(hasRole("Admin")).toBe(false)
  })
})
