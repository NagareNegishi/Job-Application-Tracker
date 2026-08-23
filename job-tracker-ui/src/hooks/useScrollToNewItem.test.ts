// @vitest-environment jsdom
// Tests for useScrollToNewItem — the requestScroll/lastItemRef handshake that fires
// scrollIntoView exactly once per request, on whichever later render the item appears in.
import { describe, it, expect, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useScrollToNewItem } from "./useScrollToNewItem"

describe("useScrollToNewItem", () => {
  it("does not scroll on mount or on renders without a pending request", () => {
    const { result, rerender } = renderHook(() => useScrollToNewItem())
    const el = document.createElement("div")
    el.scrollIntoView = vi.fn()
    act(() => {
      result.current.lastItemRef.current = el
    })
    rerender()
    expect(el.scrollIntoView).not.toHaveBeenCalled()
  })

  it("scrolls the ref'd element into view once a scroll is requested and a render occurs", () => {
    const { result, rerender } = renderHook(() => useScrollToNewItem())
    const el = document.createElement("div")
    el.scrollIntoView = vi.fn()
    act(() => {
      result.current.lastItemRef.current = el
      result.current.requestScroll()
    })
    rerender()
    expect(el.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("does not scroll again on a subsequent render once the pending request has been consumed", () => {
    const { result, rerender } = renderHook(() => useScrollToNewItem())
    const el = document.createElement("div")
    el.scrollIntoView = vi.fn()
    act(() => {
      result.current.lastItemRef.current = el
      result.current.requestScroll()
    })
    rerender()
    rerender()
    expect(el.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it("does not scroll if a request is pending but the ref has no element yet", () => {
    const { result, rerender } = renderHook(() => useScrollToNewItem())
    act(() => {
      result.current.requestScroll()
    })
    rerender()
    expect(result.current.lastItemRef.current).toBeNull()
  })
})
