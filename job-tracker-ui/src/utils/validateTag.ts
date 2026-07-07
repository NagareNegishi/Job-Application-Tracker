export function validateTag(
  value: string,
  options: {
    maxLength?: number
    existing?: string[]
    maxItems?: number
  } = {}
): string | null {
  const { maxLength, existing = [], maxItems } = options
  const lower = existing.map(e => e.toLowerCase())

  if (/<[^>]*>/.test(value))
    return "Something's off with that one — try typing it as plain text"
  if (maxLength && value.length > maxLength)
    return `That's a bit long — ${maxLength} characters max`
  if (value.length > 2 && [...value].every(c => c === value[0]))
    return "Hmm, that doesn't look like a real entry"
  if (lower.includes(value.toLowerCase()))
    return "You've already added that one"
  if (maxItems && existing.length >= maxItems)
    return `You're at the ${maxItems}-item limit — remove one to add another`

  return null
}
