// Education section — per-entry form rows for structured education history.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import SuggestionInput from "@/components/ui/SuggestionInput"
import type { EducationEntry } from "@/types/profile"
import YearSelect from "./YearSelect"
import { INSTITUTION_SUGGESTIONS, DEGREE_SUGGESTIONS } from "@/components/profile/tagSuggestions"
import {
  MAX_EDUCATION_INSTITUTION_LENGTH,
  MAX_EDUCATION_DEGREE_LENGTH,
} from "@/lib/validationConstants"

type Props = {
  value: EducationEntry[]
  onChange: (entries: EducationEntry[]) => void
  savedValue: EducationEntry[]
  saving: boolean
  onSave: () => void
  error?: string
}

function emptyEntry(): EducationEntry {
  return { institution: "", degree: "", from: 0, to: null }
}

export default function EducationSection({ value, onChange, savedValue, saving, onSave, error }: Props) {
}
