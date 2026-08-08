import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabBar } from './tab-bar'

vi.mock('next/navigation', () => ({ usePathname: () => '/chat' }))

describe('TabBar', () => {
  it('renders the raised action as Talk to me, linking to /chat', () => {
    render(<TabBar />)
    const raised = screen.getAllByRole('link', { name: /talk to me/i })
    expect(raised.length).toBeGreaterThan(0)
    raised.forEach(link => expect(link).toHaveAttribute('href', '/chat'))
  })

  it('renders Check in as a plain nav item, not the raised action', () => {
    render(<TabBar />)
    const checkIn = screen.getAllByRole('link', { name: /^check in$/i })
    checkIn.forEach(link => expect(link).toHaveAttribute('href', '/checkin'))
  })

  it('marks the current route active', () => {
    render(<TabBar />)
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current.length).toBeGreaterThan(0)
  })
})
