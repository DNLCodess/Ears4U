const STATUS_MESSAGES: Record<number, string> = {
  400: "Something about that request was not right. Check the fields and try again.",
  401: "You are signed out. Sign in to continue.",
  403: "You are signed out. Sign in to continue.",
  404: "We could not find that.",
  409: "That conflicts with something that already exists.",
  429: "Slow down a little. Try again in a minute.",
  500: "The server had a problem. Try again.",
  502: "The server had a problem. Try again.",
  503: "The server is unavailable right now. Try again shortly.",
}

export const COLD_START_MESSAGE =
  "The server is waking up. This can take about a minute after quiet periods."

export class ApiError extends Error {
  status: number
  friendly: string
  coldStart: boolean
  constructor(status: number, friendly: string, coldStart = false) {
    super(friendly)
    this.status = status
    this.friendly = friendly
    this.coldStart = coldStart
  }
}

export function friendlyFor(status: number, bodyMessage?: string): string {
  return bodyMessage || STATUS_MESSAGES[status] || "Something went wrong. Try again."
}
