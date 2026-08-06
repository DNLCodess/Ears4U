'use client'
import type { InputHTMLAttributes } from 'react'

export function Field({ label, error, ...rest }:
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      <input
        {...rest}
        aria-invalid={!!error}
        className="w-full rounded-xl border-[1.5px] border-fir/30 bg-card px-4 py-3 text-[15px]
          outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
      />
      {error ? <span role="alert" className="block text-sm text-clay mt-1.5">{error}</span> : null}
    </label>
  )
}
