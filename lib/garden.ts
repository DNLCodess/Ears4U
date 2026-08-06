export function plantShape(streak: number): { leaves: number; hasBloom: boolean } {
  return {
    leaves: Math.min(8, Math.floor(streak / 2)),
    hasBloom: streak > 0 && streak % 7 === 0,
  }
}
