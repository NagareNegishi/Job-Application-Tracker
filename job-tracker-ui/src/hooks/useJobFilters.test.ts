// @vitest-environment jsdom
// Tests for useJobFilters — filtering, sorting, and the derived dropdown option lists.
import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useJobFilters } from "./useJobFilters"
import { JobStatus, Priority, WorkMode } from "@/types/enums"
import type { Job } from "@/types/job"

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: 1,
    company: "Acme",
    role: "Engineer",
    status: JobStatus.Applied,
    priority: Priority.Medium,
    ...overrides,
  }
}

const jobs: Job[] = [
  makeJob({ id: 1, company: "Zeta", role: "Backend Engineer", status: JobStatus.Applied, priority: Priority.Low, location: "Auckland", workMode: WorkMode.Remote, appliedAt: "2026-01-03" }),
  makeJob({ id: 2, company: "Acme", role: "Frontend Engineer", status: JobStatus.Interview, priority: Priority.Urgent, location: "Wellington", workMode: WorkMode.OnSite, appliedAt: "2026-01-01" }),
  makeJob({ id: 3, company: "Mid Co", role: "Backend Engineer", status: JobStatus.Wishlist, priority: Priority.High, location: undefined, workMode: undefined, appliedAt: "2026-01-02" }),
]

describe("useJobFilters", () => {
  it("returns all jobs unfiltered and unsorted by default", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    expect(result.current.filteredJobs).toEqual(jobs)
    expect(result.current.isFiltered).toBe(false)
  })

  it("filters by a single field", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setFilters(f => ({ ...f, role: "Backend Engineer" })))
    expect(result.current.filteredJobs.map(j => j.id)).toEqual([1, 3])
    expect(result.current.isFiltered).toBe(true)
  })

  it("combines multiple active filters with AND", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setFilters(f => ({ ...f, role: "Backend Engineer", status: JobStatus.Wishlist })))
    expect(result.current.filteredJobs.map(j => j.id)).toEqual([3])
  })

  it("filters by workMode using its display label", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setFilters(f => ({ ...f, workMode: "On-site" })))
    expect(result.current.filteredJobs.map(j => j.id)).toEqual([2])
  })

  it("clearFilters resets to the default filter state", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setFilters(f => ({ ...f, role: "Backend Engineer" })))
    act(() => result.current.clearFilters())
    expect(result.current.filters).toEqual({ role: "", status: "", priority: "", location: "", workMode: "" })
    expect(result.current.isFiltered).toBe(false)
  })

  it("sorts ascending on first call and flips direction on repeat calls with the same field", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setSort("company"))
    expect(result.current.sortDir).toBe("asc")
    expect(result.current.filteredJobs.map(j => j.company)).toEqual(["Acme", "Mid Co", "Zeta"])

    act(() => result.current.setSort("company"))
    expect(result.current.sortDir).toBe("desc")
    expect(result.current.filteredJobs.map(j => j.company)).toEqual(["Zeta", "Mid Co", "Acme"])
  })

  it("switching to a different sort field resets direction to asc", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setSort("company"))
    act(() => result.current.setSort("company")) // now desc
    act(() => result.current.setSort("priority"))
    expect(result.current.sortField).toBe("priority")
    expect(result.current.sortDir).toBe("asc")
    expect(result.current.filteredJobs.map(j => j.priority)).toEqual([Priority.Low, Priority.High, Priority.Urgent])
  })

  it("sorts by status using the logical (non-alphabetical) order", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    act(() => result.current.setSort("status"))
    expect(result.current.filteredJobs.map(j => j.status)).toEqual([JobStatus.Wishlist, JobStatus.Applied, JobStatus.Interview])
  })

  it("sorts by a date field, treating missing dates as earliest", () => {
    const withMissingDate = [...jobs, makeJob({ id: 4, appliedAt: undefined })]
    const { result } = renderHook(() => useJobFilters(withMissingDate))
    act(() => result.current.setSort("appliedAt"))
    expect(result.current.filteredJobs.map(j => j.id)).toEqual([4, 2, 3, 1])
  })

  it("derives sorted, de-duplicated available roles and locations, dropping empty values", () => {
    const { result } = renderHook(() => useJobFilters(jobs))
    expect(result.current.availableRoles).toEqual(["Backend Engineer", "Frontend Engineer"])
    expect(result.current.availableLocations).toEqual(["Auckland", "Wellington"])
  })
})
