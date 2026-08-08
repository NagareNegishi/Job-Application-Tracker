import { useProfile } from "@/hooks/profileQuery"
import { hasRole } from "@/lib/auth"
import { MIN_ANALYSIS_DESCRIPTION } from "@/lib/validationConstants"
import type { Job } from "@/types/job"
import { isProfileReady } from "@/utils/profileReady"
import { useState } from "react"
import { Link } from "react-router"

interface AnalysisSectionProps {
  job: Job
}

const ANALYSIS_TYPES = [
  { type: "alignment", label: "Alignment", blurb: "How well your profile matches this job" },
  { type: "skills", label: "Top Skills", blurb: "Skills to highlight for this role" },
  { type: "gaps", label: "Gaps", blurb: "Where your profile falls short, and how to address it" },
  { type: "questionsToAsk", label: "Questions to Ask", blurb: "Good questions for the interviewer" },
  { type: "interviewQuestions", label: "Interview Questions", blurb: "Questions you're likely to be asked" },
] as const

type AnalysisType = typeof ANALYSIS_TYPES[number]["type"]

export function AnalysisSection({ job }: AnalysisSectionProps) {
  const { data: profile } = useProfile()
  const [activeType, setActiveType] = useState<AnalysisType | null>(null)

  if (!hasRole("AiUser")) return null

  const descriptionReady = (job.description?.length ?? 0) >= MIN_ANALYSIS_DESCRIPTION
  const profileReady = isProfileReady(profile)
  const disabled = !descriptionReady || !profileReady
  const gateMessage = !descriptionReady
    ? "Add a description to this job to run analysis."
    : !profileReady
      ? <>Complete your <Link to="/profile" className="underline">profile</Link> to run analysis.</>
      : null

  return (
    <div className="space-y-3">
      <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground border-l-2 border-primary pl-3">
        AI Insights
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ANALYSIS_TYPES.map(({ type, label, blurb }) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => setActiveType(type)}
            className="text-left border rounded-lg p-3 space-y-1 hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{blurb}</p>
          </button>
        ))}
      </div>
      {gateMessage && <p className="text-sm text-muted-foreground">{gateMessage}</p>}
      {activeType && (
        <div className="border rounded-lg p-4 text-sm text-muted-foreground">
          Result for {ANALYSIS_TYPES.find(a => a.type === activeType)?.label} will appear here.
        </div>
      )}
    </div>
  )
}
