import { Button } from "@/components/ui/button"
import { useDesktopRelease } from "@/hooks/desktopReleaseQuery"
import { Download } from "lucide-react"

const RELEASES_URL = "https://github.com/NagareNegishi/job-tracker-desktop-releases/releases/latest"

// One button per platform from the backend; falls back to a single static
// releases link if the fetch fails. No dismiss state.
export function DesktopDownloadPrompt() {
  const { data, isError, isLoading } = useDesktopRelease()

  if (isLoading) return null

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground text-center">Get the desktop app</p>
      {isError || !data ? (
        <Button asChild variant="outline" className="w-full">
          <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          {data.platforms.map((platform) => (
            <Button key={platform.platform} asChild variant="outline" className="w-full">
              <a href={platform.url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                {platform.label}
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
