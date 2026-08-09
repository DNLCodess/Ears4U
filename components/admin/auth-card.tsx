import type { ReactNode } from 'react'

export function AdminAuthCard({ title, subtitle, children }: {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <section className="flex h-[180px] flex-none items-center justify-center bg-fir-deep px-8 text-center
        text-oat lg:h-auto lg:w-[38%] lg:px-10">
        <div>
          <p className="font-display text-2xl font-semibold lg:text-3xl">
            Ears for you. <span className="opacity-60">Admin</span>
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center bg-oat px-6 py-10">
        <div className="flex w-full max-w-[360px] flex-col gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm opacity-65">{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </section>
    </div>
  )
}
