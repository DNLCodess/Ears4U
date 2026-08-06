'use client'
import type { ButtonHTMLAttributes } from 'react'

const styles = {
  primary: 'bg-gradient-to-br from-leaf-bright to-leaf text-white shadow-lg shadow-leaf/30',
  ghost: 'border-2 border-fir text-fir',
  quiet: 'text-fir underline underline-offset-4',
} as const

export function Button({ variant = 'primary', busy, className = '', children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof styles; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`font-display font-semibold rounded-2xl px-5 py-3.5 text-base transition
        active:scale-[.98] disabled:opacity-60 disabled:pointer-events-none ${styles[variant]} ${className}`}
    >
      {busy ? 'One moment' : children}
    </button>
  )
}
