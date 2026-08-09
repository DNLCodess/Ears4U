let adminAccessToken: string | null = null

export function getAdminAccessToken(): string | null {
  return adminAccessToken
}

export function setAdminAccessToken(t: string | null): void {
  adminAccessToken = t
}

export function clearAdminAccessToken(): void {
  adminAccessToken = null
}
