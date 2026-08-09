import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminShell } from './shell'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/dashboard' }))

describe('AdminShell', () => {
  it('renders all eight nav items with correct hrefs', () => {
    render(<AdminShell><p>content</p></AdminShell>)
    const expected: [string, string][] = [
      ['Dashboard', '/admin/dashboard'],
      ['Analytics', '/admin/analytics'],
      ['Users', '/admin/users'],
      ['Emergency Resources', '/admin/emergency'],
      ['Settings', '/admin/settings'],
      ['Telemetry', '/admin/telemetry'],
      ['Broadcasts', '/admin/broadcasts'],
      ['Account', '/admin/account'],
    ]
    for (const [label, href] of expected) {
      const links = screen.getAllByRole('link', { name: label })
      expect(links.length).toBeGreaterThan(0)
      links.forEach(link => expect(link).toHaveAttribute('href', href))
    }
  })

  it('marks the current route active', () => {
    render(<AdminShell><p>content</p></AdminShell>)
    const current = screen.getAllByRole('link', { current: 'page' })
    expect(current.length).toBeGreaterThan(0)
  })

  it('renders the page content', () => {
    render(<AdminShell><p>unique marker content</p></AdminShell>)
    expect(screen.getByText('unique marker content')).toBeInTheDocument()
  })

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup()
    render(<AdminShell><p>content</p></AdminShell>)
    const openButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(openButton)
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByRole('button', { name: /close menu/i })).not.toBeInTheDocument()
  })
})
