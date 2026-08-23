// @vitest-environment jsdom
// Tests for useTheme — localStorage persistence, OS-preference fallback, and DOM class sync.
import { describe, it, expect, beforeEach, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useTheme } from "./useTheme"

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ""
  mockMatchMedia(false)
})

describe("useTheme", () => {
  it("falls back to OS preference when nothing is stored", () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("dark")
  })

  it("prefers a stored theme over OS preference", () => {
    localStorage.setItem("theme", "light")
    mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe("light")
  })

  it("defaults colorTheme to 'default' when nothing valid is stored", () => {
    localStorage.setItem("colorTheme", "not-a-real-theme")
    const { result } = renderHook(() => useTheme())
    expect(result.current.colorTheme).toBe("default")
  })

  it("toggleTheme flips the theme and persists it, syncing the .dark class", () => {
    const { result } = renderHook(() => useTheme())
    expect(document.documentElement.classList.contains("dark")).toBe(false)

    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("theme")).toBe("dark")

    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("setColorTheme applies the theme-* class and persists it, replacing any previous one", () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setColorTheme("blue"))
    expect(document.documentElement.classList.contains("theme-blue")).toBe(true)
    expect(localStorage.getItem("colorTheme")).toBe("blue")

    act(() => result.current.setColorTheme("red"))
    expect(document.documentElement.classList.contains("theme-blue")).toBe(false)
    expect(document.documentElement.classList.contains("theme-red")).toBe(true)
  })

  it("adds no theme-* class for the 'default' color theme", () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setColorTheme("blue"))
    act(() => result.current.setColorTheme("default"))
    expect([...document.documentElement.classList].some(c => c.startsWith("theme-"))).toBe(false)
  })
})
