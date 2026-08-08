export function splitGreeting(greeting: string): { head: string; glow: string } {
  const trimmed = greeting.trim()
  const comma = trimmed.lastIndexOf(',')
  if (comma === -1 || comma === trimmed.length - 1) return { head: trimmed, glow: '' }
  const glow = trimmed.slice(comma + 1).trim()
  return {
    head: trimmed.slice(0, comma + 1),
    glow: /[.!?]$/.test(glow) ? glow : `${glow}.`,
  }
}

/** "Good evening, Dami." gives "D": the name is the part after the comma. */
export function greetingInitial(greeting: string): string {
  const letter = splitGreeting(greeting).glow.match(/[\p{L}\p{N}]/u)
  return letter ? letter[0].toUpperCase() : '?'
}
