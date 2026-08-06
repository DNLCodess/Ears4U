'use client'

export function Toggle({ checked, onChange, label, disabled }:
  { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-14 flex-none items-center justify-center rounded-full transition
        disabled:opacity-60
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      <span
        aria-hidden
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-leaf' : 'bg-fir/25'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </span>
    </button>
  )
}
