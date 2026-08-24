import { useQuery } from "@tanstack/react-query"
import { getDesktopRelease } from "@/services/desktopReleaseService"

// Fetch the latest desktop release info (version + per-platform installer links).
// Used pre-login (login screen) as well as authenticated (Settings) — no auth dependency.
export function useDesktopRelease() {
  return useQuery({ queryKey: ["desktopRelease"], queryFn: getDesktopRelease })
}
