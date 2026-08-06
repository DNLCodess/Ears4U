// components/otp-input.tsx
'use client'
import { useRef, useState, useEffect } from 'react'

export function OtpInput({ length = 6, onComplete }: { length?: number; onComplete: (code: string) => void }) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function commit(next: string[]) {
    setValues(next)
    const code = next.join('')
    if (code.length === length && next.every(Boolean)) onComplete(code)
  }

  function handleChange(i: number, raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    const next = [...values]
    let cursor = i
    for (const d of digits.slice(0, length - i)) {
      next[cursor] = d
      cursor += 1
    }
    commit(next)
    refs.current[Math.min(cursor, length - 1)]?.focus()
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !values[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'Backspace') {
      const next = [...values]; next[i] = ''; setValues(next)
    }
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Verification code">
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={v}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={e => { e.preventDefault(); handleChange(i, e.clipboardData.getData('text')) }}
          className="w-12 h-14 rounded-xl border-[1.5px] border-fir/30 bg-card text-center
            font-display font-semibold text-xl focus:border-leaf focus:ring-2 focus:ring-leaf/25 outline-none"
        />
      ))}
    </div>
  )
}

export function ResendButton({ cooldownSeconds = 60, onResend }:
  { cooldownSeconds?: number; onResend: () => Promise<unknown> }) {
  const [left, setLeft] = useState(cooldownSeconds)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [left])
  async function handleClick() {
    try {
      await onResend()
      setError(null)
      setLeft(cooldownSeconds)
    } catch {
      setError('Could not resend. Try again.')
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={left > 0}
        onClick={handleClick}
        className="text-sm underline underline-offset-4 disabled:no-underline disabled:opacity-60"
      >
        {left > 0 ? `Resend code (0:${String(left).padStart(2, '0')})` : 'Resend code'}
      </button>
      {error ? <p role="alert" className="text-sm text-clay mt-1.5">{error}</p> : null}
    </div>
  )
}
