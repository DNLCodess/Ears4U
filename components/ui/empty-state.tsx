import type { ReactNode } from 'react'

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-fir/30 px-5 py-8 text-center space-y-2">
      <p className="font-display font-semibold text-lg">{title}</p>
      <p className="text-sm opacity-70">{body}</p>
      {action}
    </div>
  )
}
