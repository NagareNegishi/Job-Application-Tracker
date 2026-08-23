// @vitest-environment jsdom
// Tests for useRemountableDialog — open state plus the remount key bumped by openDialog.
import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useRemountableDialog } from "./useRemountableDialog"

describe("useRemountableDialog", () => {
  it("starts closed with key 0", () => {
    const { result } = renderHook(() => useRemountableDialog())
    expect(result.current.open).toBe(false)
    expect(result.current.key).toBe(0)
  })

  it("openDialog opens it and increments the key", () => {
    const { result } = renderHook(() => useRemountableDialog())
    act(() => result.current.openDialog())
    expect(result.current.open).toBe(true)
    expect(result.current.key).toBe(1)
  })

  it("each openDialog call bumps the key again, even while already open", () => {
    const { result } = renderHook(() => useRemountableDialog())
    act(() => result.current.openDialog())
    act(() => result.current.openDialog())
    expect(result.current.key).toBe(2)
  })

  it("setOpen(false) closes it without touching the key", () => {
    const { result } = renderHook(() => useRemountableDialog())
    act(() => result.current.openDialog())
    act(() => result.current.setOpen(false))
    expect(result.current.open).toBe(false)
    expect(result.current.key).toBe(1)
  })
})
