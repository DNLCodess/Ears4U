import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminAuthCard } from './auth-card'

describe('AdminAuthCard', () => {
  it('renders the title, optional subtitle, and children', () => {
    render(
      <AdminAuthCard title="Admin sign in" subtitle="Manage the platform.">
        <p>form goes here</p>
      </AdminAuthCard>
    )
    expect(screen.getByText('Admin sign in')).toBeInTheDocument()
    expect(screen.getByText('Manage the platform.')).toBeInTheDocument()
    expect(screen.getByText('form goes here')).toBeInTheDocument()
  })

  it('renders without a subtitle', () => {
    render(<AdminAuthCard title="Reset password"><p>content</p></AdminAuthCard>)
    expect(screen.getByText('Reset password')).toBeInTheDocument()
  })
})
