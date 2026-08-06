// components/otp-input.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OtpInput } from './otp-input'

describe('OtpInput', () => {
  it('auto-advances across boxes and fires onComplete with the full code', async () => {
    const done = vi.fn()
    render(<OtpInput length={6} onComplete={done} />)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(6)
    await userEvent.type(boxes[0]!, '472913')
    expect(done).toHaveBeenCalledWith('472913')
  })

  it('fills all boxes from a paste', async () => {
    const done = vi.fn()
    render(<OtpInput length={6} onComplete={done} />)
    const boxes = screen.getAllByRole('textbox')
    boxes[0]!.focus()
    await userEvent.paste('307211')
    expect(done).toHaveBeenCalledWith('307211')
  })

  it('ignores non-digits', async () => {
    const done = vi.fn()
    render(<OtpInput length={6} onComplete={done} />)
    const boxes = screen.getAllByRole('textbox')
    await userEvent.type(boxes[0]!, 'ab12cd3456xy')
    expect(done).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}$/))
  })
})
