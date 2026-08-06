import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoodSlider } from './mood-slider'

describe('MoodSlider', () => {
  it('renders the current value and calls onChange within 1..10', async () => {
    const onChange = vi.fn()
    render(<MoodSlider label="Stress" color="clay" value={6} onChange={onChange} />)
    expect(screen.getByText('6')).toBeInTheDocument()
    const input = screen.getByRole('slider', { name: /stress/i })
    await userEvent.type(input, '{arrowright}')
    expect(onChange).toHaveBeenCalledWith(7)
  })
})
