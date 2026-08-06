export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded-full bg-fir/10"
          style={{ width: `${85 - (i % 3) * 15}%` }} />
      ))}
    </div>
  )
}
