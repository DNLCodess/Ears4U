// components/listening/listening-hero.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListeningHero } from './listening-hero'

describe('ListeningHero', () => {
  it('renders the greeting head and the highlighted name separately', () => {
    render(<ListeningHero greeting="Good evening, Dami." sub="Whatever today was, you don't have to carry it alone." />)
    // ListeningHero renders a mobile scene and a desktop scene simultaneously,
    // switching between them with CSS (lg:hidden / hidden lg:block) rather than
    // JS, exactly like the already-committed TabBar (components/shell/tab-bar.tsx).
    // jsdom has no matchMedia mock, so both scenes are present in the DOM at once;
    // use getAllBy* here for the same reason tab-bar.test.tsx does.
    expect(screen.getAllByText('Good evening,').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dami.').length).toBeGreaterThan(0)
  })

  it('renders the sub line and an optional cta', () => {
    render(
      <ListeningHero
        greeting="Good evening, Dami."
        sub="Whatever today was, you don't have to carry it alone."
        cta={<a href="/chat">Talk to me</a>}
      />
    )
    expect(screen.getAllByText(/whatever today was/i).length).toBeGreaterThan(0)
    const ctaLinks = screen.getAllByRole('link', { name: 'Talk to me' })
    expect(ctaLinks.length).toBeGreaterThan(0)
    ctaLinks.forEach(link => expect(link).toHaveAttribute('href', '/chat'))
  })

  it('renders the presence line', () => {
    render(<ListeningHero greeting="Good evening, Dami." sub="sub" />)
    expect(screen.getAllByText(/here, listening/i).length).toBeGreaterThan(0)
  })

  it('renders the desktop week waveform only when there are at least two points', () => {
    const { rerender, container } = render(<ListeningHero greeting="Good evening, Dami." sub="sub" weeklyTrends={[]} />)
    expect(screen.queryByText(/your week, as sound/i)).not.toBeInTheDocument()

    rerender(
      <ListeningHero
        greeting="Good evening, Dami." sub="sub"
        weeklyTrends={[{ date: '2026-08-01', mood: 5, stress: 4, energy: 6 }, { date: '2026-08-02', mood: 7, stress: 3, energy: 7 }]}
      />
    )
    expect(screen.getByText(/your week, as sound/i)).toBeInTheDocument()
    expect(container.querySelector('svg path[stroke="#F2BE45"]')).toBeTruthy()
  })
})
