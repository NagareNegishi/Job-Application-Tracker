// Shared prop contract between ProfilePage and its section components.
// The page owns all state (form values, dirty/editing/saving flags); sections
// render it and report intents back through the callbacks.
export type SectionProps<T> = {
  value: T
  onChange: (val: T) => void
  dirty: boolean // form value differs from last saved state; computed by the page
  saving: boolean
  onSave: () => void
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  error?: string
}
