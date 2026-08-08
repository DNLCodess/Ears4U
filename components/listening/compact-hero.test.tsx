import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompactHero } from './compact-hero'

describe('CompactHero', () => {
  it('renders the title, optional subtitle, and optional step label', () => {
    render(<CompactHero title="Check your email." subtitle="We sent a code." step="Step 1 of 3" onBack={() => {}} />)
    expect(screen.getByText('Check your email.')).toBeInTheDocument()
    expect(screen.getByText('We sent a code.')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
  })

  it('calls onBack when the back button is pressed', async () => {
    const onBack = vi.fn()
    render(<CompactHero title="Forgot your password?" onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
