import { Button } from "@/components/ui/button"
import { AppleIcon, LinuxIcon, WindowsIcon } from "@/components/icons/OsIcons"
import { useDesktopRelease } from "@/hooks/desktopReleaseQuery"

const RELEASES_URL = "https://github.com/NagareNegishi/job-tracker-desktop-releases/releases/latest"

// Fixed slots so the section is always fully visible; loading/error/absent
// states are expressed by disabling a slot, never by hiding it.
const PLATFORM_SLOTS = [
  { key: "windows", label: "Windows", Icon: WindowsIcon },
  { key: "macos", label: "macOS", Icon: AppleIcon },
  { key: "linux", label: "Linux", Icon: LinuxIcon },
] as const

export function DesktopDownloadPrompt() {
  const { data, isError, isLoading } = useDesktopRelease()

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground text-center">Get the desktop app</p>
      <div className="flex flex-row gap-2">
        {PLATFORM_SLOTS.map(({ key, label, Icon }) => {
          const platform = data?.platforms.find((p) => p.platform === key)
          if (!isLoading && !isError && platform) {
            return (
              <Button key={key} asChild variant="outline" className="flex-1 flex-col h-auto py-2 gap-1">
                <a href={platform.url} target="_blank" rel="noopener noreferrer">
                  <Icon className="h-5 w-5" />
                  {platform.label}
                </a>
              </Button>
            )
          }
          return (
            <Button key={key} variant="outline" className="flex-1 flex-col h-auto py-2 gap-1" disabled>
              <Icon className="h-5 w-5" />
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
