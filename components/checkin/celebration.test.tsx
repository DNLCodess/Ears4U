import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Celebration } from './celebration'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

afterEach(() => {
  replace.mockClear()
  vi.useRealTimers()
})

describe('Celebration smoke', () => {
  it('renders headline, sub and 8 petals', () => {
    const { container } = render(<Celebration streak={13} />)
    expect(screen.getByText(/Day 13\./)).toBeInTheDocument()
    expect(screen.getByText('Still growing.')).toBeInTheDocument()
    expect(screen.getByText(/13 check-ins in a row\. The marigold only blooms for you\./)).toBeInTheDocument()
    expect(container.querySelectorAll('ellipse')).toHaveLength(8)
  })

  it('dismisses on tap and only once', () => {
    vi.useFakeTimers()
    render(<Celebration streak={2} />)
    fireEvent.click(screen.getByRole('button'))
    expect(replace).toHaveBeenCalledWith('/home')
    vi.advanceTimersByTime(5000)
    expect(replace).toHaveBeenCalledTimes(1)
  })

  it('auto dismisses after the hold and clears the timer on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = render(<Celebration streak={2} />)
    vi.advanceTimersByTime(2499)
    expect(replace).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2)
    expect(replace).toHaveBeenCalledWith('/home')
    replace.mockClear()
    unmount()
    vi.advanceTimersByTime(5000)
    expect(replace).not.toHaveBeenCalled()
  })

  it('uses singular copy for a streak of one', () => {
    render(<Celebration streak={1} />)
    expect(screen.getByText(/1 check-in in a row\./)).toBeInTheDocument()
  })
})
