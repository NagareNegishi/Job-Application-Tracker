// Tests for matchesSuggestion utility.
import { describe, it, expect } from "vitest"
import { matchesSuggestion } from "./matchSuggestion"

describe("prefix", () => {
  it("matches when suggestion starts with query", () => {
    expect(matchesSuggestion("English", "eng", "prefix")).toBe(true)
  })
  it("rejects a mid-word match", () => {
    expect(matchesSuggestion("Software Engineer", "eng", "prefix")).toBe(false)
  })
  it("is case-insensitive", () => {
    expect(matchesSuggestion("English", "ENG", "prefix")).toBe(true)
  })
})

describe("word-start", () => {
  it("matches from the start of any word", () => {
    expect(matchesSuggestion("Software Engineer", "eng", "word-start")).toBe(true)
  })
  it("rejects a mid-word match", () => {
    expect(matchesSuggestion("Software Engineer", "ft", "word-start")).toBe(false)
  })
  it("matches from the first word", () => {
    expect(matchesSuggestion("Backend Developer", "back", "word-start")).toBe(true)
  })
  it("is case-insensitive", () => {
    expect(matchesSuggestion("Software Engineer", "ENG", "word-start")).toBe(true)
  })
})

describe("substring", () => {
  it("matches anywhere in the string", () => {
    expect(matchesSuggestion("PostgreSQL", "sql", "substring")).toBe(true)
  })
  it("matches mid-word", () => {
    expect(matchesSuggestion("Software Engineer", "ft", "substring")).toBe(true)
  })
  it("is case-insensitive", () => {
    expect(matchesSuggestion("TypeScript", "SCRIPT", "substring")).toBe(true)
  })
})
