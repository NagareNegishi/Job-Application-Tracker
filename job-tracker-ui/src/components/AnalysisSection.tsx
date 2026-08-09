import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useProfile } from "@/hooks/profileQuery"
import { ApiError } from "@/lib/api"
import { hasRole } from "@/lib/auth"
import { MIN_ANALYSIS_DESCRIPTION } from "@/lib/validationConstants"
import { analyseAlignment, analyseGaps, analyseInterviewQuestions, analyseQuestionsToAsk, analyseSkills, type AlignmentResult, type AnalysisRequest, type GapsResult, type QuestionsResult, type SkillsResult } from "@/services/analysisService"
import type { Job } from "@/types/job"
import { isProfileReady } from "@/utils/profileReady"
import { Sparkles } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

interface AnalysisSectionProps {
  job: Job
}

const ANALYSIS_TYPES = [
  { type: "alignment", label: "Alignment", blurb: "How well your profile matches this job" },
  { type: "skills", label: "Matched Skills", blurb: "Skills to highlight for this role" },
  { type: "gaps", label: "Skill Gaps", blurb: "Where your profile falls short, and how to address it" },
  { type: "questionsToAsk", label: "Questions to Ask", blurb: "Good questions for the interviewer" },
  { type: "interviewQuestions", label: "Interview Questions", blurb: "Questions you're likely to be asked" },
] as const

type AnalysisType = typeof ANALYSIS_TYPES[number]["type"]

type ResultMap = {
  alignment: AlignmentResult
  skills: SkillsResult
  gaps: GapsResult
  questionsToAsk: QuestionsResult
  interviewQuestions: QuestionsResult
}

const ANALYSIS_FETCHERS: { [K in AnalysisType]: (request: AnalysisRequest) => Promise<ResultMap[K]> } = {
  alignment: analyseAlignment,
  skills: analyseSkills,
  gaps: analyseGaps,
  questionsToAsk: analyseQuestionsToAsk,
  interviewQuestions: analyseInterviewQuestions,
}

export function AnalysisSection({ job }: AnalysisSectionProps) {
  const { data: profile } = useProfile()
  const [open, setOpen] = useState(false)
  const [activeType, setActiveType] = useState<AnalysisType | null>(null)
  const [previewType, setPreviewType] = useState<AnalysisType | null>(null)
  const [loadingType, setLoadingType] = useState<AnalysisType | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [results, setResults] = useState<Partial<ResultMap>>({})

  if (!hasRole("AiUser")) return null

  const descriptionReady = (job.description?.length ?? 0) >= MIN_ANALYSIS_DESCRIPTION
  const profileReady = isProfileReady(profile)
  const disabled = !descriptionReady || !profileReady
  const gateMessage = !descriptionReady
    ? "Add a description to this job to run analysis."
    : !profileReady
      ? <>Complete your <Link to="/profile" className="underline">profile</Link> to run analysis.</>
      : null
  const displayedType = previewType ?? activeType
  const displayedBlurb = ANALYSIS_TYPES.find(a => a.type === displayedType)?.blurb

  async function handleSelect<T extends AnalysisType>(type: T) {
    setActiveType(type)
    setRequestError(null)

    const request: AnalysisRequest = { description: job.description!, role: job.role, company: job.company }
    setLoadingType(type)
    try {
      const result = await ANALYSIS_FETCHERS[type](request)
      setResults(prev => ({ ...prev, [type]: result }))
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoadingType(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon-lg"
          className="fixed bottom-6 right-6 z-40 size-14 rounded-full shadow-lg hover:scale-105 transition-transform"
          aria-label="AI Insights"
        >
          <Sparkles className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] sm:inset-x-8 sm:rounded-t-xl md:inset-x-16 lg:inset-x-32 xl:inset-x-48"
      >
        <SheetHeader className="sm:px-6 lg:px-8">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Insights
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 space-y-3 overflow-y-auto flex-1 min-h-0 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_TYPES.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                disabled={disabled || loadingType !== null}
                onClick={() => handleSelect(type)}
                onMouseEnter={() => setPreviewType(type)}
                onMouseLeave={() => setPreviewType(null)}
                onFocus={() => setPreviewType(type)}
                onBlur={() => setPreviewType(null)}
                className="text-center border rounded-lg px-3 py-2 hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <p className="text-sm font-medium">{label}</p>
              </button>
            ))}
          </div>
          <p className="text-md text-muted-foreground h-12 line-clamp-2">{displayedBlurb}</p>
          {gateMessage && <p className="text-sm text-muted-foreground">{gateMessage}</p>}
          {requestError && <p className="text-sm text-destructive">{requestError}</p>}
          <div className="border rounded-lg p-4 min-h-32 text-sm text-muted-foreground">
            {loadingType ? (
              "Analysing..."
            ) : activeType === "alignment" && alignmentResult ? (
              <div className="space-y-2 text-foreground">
                <p className="font-medium">Alignment score: {alignmentResult.score} / 5</p>
                <p>{alignmentResult.reasoning}</p>
                {alignmentResult.concern && (
                  <p className="text-amber-600 dark:text-amber-400">{alignmentResult.concern}</p>
                )}
              </div>
            ) : activeType === "skills" && skillsResult ? (
              skillsResult.skills.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-foreground">
                  {skillsResult.skills.map(skill => <li key={skill}>{skill}</li>)}
                </ul>
              ) : (
                "No matching skills found for this role."
              )
            ) : activeType === "gaps" && gapsResult ? (
              gapsResult.gaps.length > 0 ? (
                <ul className="space-y-3 text-foreground">
                  {gapsResult.gaps.map(({ gap, advice }) => (
                    <li key={gap}>
                      <p className="font-medium">{gap}</p>
                      <p className="text-muted-foreground">{advice}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                "No notable gaps found for this role."
              )
            ) : activeType === "questionsToAsk" && questionsToAskResult ? (
              questionsToAskResult.questions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-foreground">
                  {questionsToAskResult.questions.map(question => <li key={question}>{question}</li>)}
                </ul>
              ) : (
                "No suggested questions for this role."
              )
            ) : activeType === "interviewQuestions" && interviewQuestionsResult ? (
              interviewQuestionsResult.questions.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 text-foreground">
                  {interviewQuestionsResult.questions.map(question => <li key={question}>{question}</li>)}
                </ul>
              ) : (
                "No suggested interview questions for this role."
              )
            ) : activeType ? (
              <>Result for {ANALYSIS_TYPES.find(a => a.type === activeType)?.label} will appear here.</>
            ) : (
              "Pick an analysis type above to see results here."
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
