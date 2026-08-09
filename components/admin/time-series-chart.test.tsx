import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeSeriesChart } from './time-series-chart'

describe('TimeSeriesChart', () => {
  it('renders the title and the latest value', () => {
    render(
      <TimeSeriesChart
        title="User growth"
        points={[{ date: '2026-08-01', value: 10 }, { date: '2026-08-02', value: 20 }]}
        min={0} max={20}
      />
    )
    expect(screen.getByText('User growth')).toBeInTheDocument()
    expect(screen.getByText(/latest: 20/i)).toBeInTheDocument()
  })

  it('renders an empty state with no points', () => {
    render(<TimeSeriesChart title="Moods" points={[]} min={0} max={10} />)
    expect(screen.getByText('Moods')).toBeInTheDocument()
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument()
  })

  it('renders an accessible chart with a labelled role', () => {
    render(
      <TimeSeriesChart
        title="AI usage"
        points={[{ date: '2026-08-01', value: 5 }]}
        min={0} max={10}
      />
    )
    expect(screen.getByRole('img', { name: /AI usage/i })).toBeInTheDocument()
  })
})
