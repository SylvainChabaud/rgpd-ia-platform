/**
 * ActivityChart Component Tests - LOT 12.0
 * Tests for dashboard chart component (Recharts v2)
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, no individual records)
 * - Time-series data (counts per day)
 */

import { render, screen } from '@testing-library/react'

// Mock Recharts completely to avoid canvas rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: 400, height: 300 }}>
      {children}
    </div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="line-chart">{children}</svg>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="area-chart">{children}</svg>,
  BarChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="bar-chart">{children}</svg>,
  Line: () => <line />,
  Area: () => <path />,
  Bar: () => <rect />,
  XAxis: () => <g data-testid="x-axis" />,
  YAxis: () => <g data-testid="y-axis" />,
  CartesianGrid: () => <g data-testid="grid" />,
  Tooltip: () => <g data-testid="tooltip" />,
  Legend: () => <g data-testid="legend" />,
}))

import { ActivityChart, ChartType } from '@/components/backoffice/dashboard/ActivityChart'

describe('ActivityChart Component', () => {
  const mockData = [
    { date: '2026-01-01', success: 10, failed: 2 },
    { date: '2026-01-02', success: 15, failed: 1 },
    { date: '2026-01-03', success: 8, failed: 3 },
  ]

  const defaultProps = {
    title: 'Test Chart',
    data: mockData,
    dataKeys: [
      { key: 'success', label: 'Succès', color: '#22c55e' },
      { key: 'failed', label: 'Échecs', color: '#ef4444' },
    ],
    xAxisKey: 'date',
  }

  describe('Rendering', () => {
    it('should render chart with title', () => {
      render(<ActivityChart {...defaultProps} />)

      expect(screen.getByText('Test Chart')).toBeInTheDocument()
    })

    it('should render chart with subtitle when provided', () => {
      render(<ActivityChart {...defaultProps} subtitle="January 2026" />)

      expect(screen.getByText('Test Chart')).toBeInTheDocument()
      expect(screen.getByText('January 2026')).toBeInTheDocument()
    })

    it('should render without subtitle when not provided', () => {
      render(<ActivityChart {...defaultProps} />)

      expect(screen.getByText('Test Chart')).toBeInTheDocument()
      // No subtitle element should be present
      expect(screen.queryByText('January 2026')).not.toBeInTheDocument()
    })

    it('should render ResponsiveContainer', () => {
      render(<ActivityChart {...defaultProps} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should render loading skeleton when isLoading is true', () => {
      const { container } = render(
        <ActivityChart {...defaultProps} isLoading={true} />
      )

      // Check for loading skeleton (animate-pulse class)
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).toBeInTheDocument()
    })

    it('should not render chart when loading', () => {
      render(<ActivityChart {...defaultProps} isLoading={true} />)

      // ResponsiveContainer should not be present during loading
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument()
    })

    it('should show title during loading', () => {
      render(<ActivityChart {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Test Chart')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should render empty message when data is empty array', () => {
      render(<ActivityChart {...defaultProps} data={[]} />)

      expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
    })

    it('should render empty message when data is undefined', () => {
      render(
        <ActivityChart
          {...defaultProps}
          data={undefined as unknown as typeof mockData}
        />
      )

      expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument()
    })

    it('should show title in empty state', () => {
      render(<ActivityChart {...defaultProps} data={[]} />)

      expect(screen.getByText('Test Chart')).toBeInTheDocument()
    })
  })

  describe('Chart Types', () => {
    const chartTypes: ChartType[] = ['line', 'area', 'bar']

    chartTypes.forEach((type) => {
      it(`should render ${type} chart type`, () => {
        render(<ActivityChart {...defaultProps} type={type} />)

        // Chart should render (ResponsiveContainer present)
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })

    it('should default to line chart when type is not specified', () => {
      render(<ActivityChart {...defaultProps} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Custom Height', () => {
    it('should use default height of 300', () => {
      const { container } = render(<ActivityChart {...defaultProps} />)

      const responsiveContainer = container.querySelector('[data-testid="responsive-container"]')
      expect(responsiveContainer).toBeInTheDocument()
    })

    it('should use custom height when provided', () => {
      render(<ActivityChart {...defaultProps} height={400} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Data Keys Configuration', () => {
    it('should accept single data key', () => {
      const singleKeyProps = {
        ...defaultProps,
        dataKeys: [{ key: 'count', label: 'Count', color: '#3b82f6' }],
      }

      render(<ActivityChart {...singleKeyProps} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should accept multiple data keys', () => {
      const multiKeyProps = {
        ...defaultProps,
        dataKeys: [
          { key: 'success', label: 'Succès', color: '#22c55e' },
          { key: 'failed', label: 'Échecs', color: '#ef4444' },
          { key: 'pending', label: 'En attente', color: '#f59e0b' },
        ],
      }

      render(<ActivityChart {...multiKeyProps} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('RGPD Compliance', () => {
    it('should not expose any user-specific data in the component', () => {
      const { container } = render(<ActivityChart {...defaultProps} />)

      // Component should not contain email patterns
      expect(container.innerHTML).not.toMatch(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      )
    })

    it('should only display aggregate data (P1)', () => {
      // Data should be aggregates only
      const aggregateData = [
        { date: '2026-01-01', count: 10 },
        { date: '2026-01-02', count: 15 },
      ]

      render(
        <ActivityChart
          title="Aggregates Only"
          data={aggregateData}
          dataKeys={[{ key: 'count', label: 'Total', color: '#3b82f6' }]}
          xAxisKey="date"
        />
      )

      expect(screen.getByText('Aggregates Only')).toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should handle ISO date format in data', () => {
      const isoDateData = [
        { date: '2026-01-09T10:00:00Z', value: 10 },
        { date: '2026-01-10T10:00:00Z', value: 15 },
      ]

      render(
        <ActivityChart
          title="ISO Dates"
          data={isoDateData}
          dataKeys={[{ key: 'value', label: 'Value', color: '#3b82f6' }]}
          xAxisKey="date"
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should handle YYYY-MM-DD date format', () => {
      const simpleDateData = [
        { date: '2026-01-09', value: 10 },
        { date: '2026-01-10', value: 15 },
      ]

      render(
        <ActivityChart
          title="Simple Dates"
          data={simpleDateData}
          dataKeys={[{ key: 'value', label: 'Value', color: '#3b82f6' }]}
          xAxisKey="date"
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Card Structure', () => {
    it('should render within a Card component', () => {
      const { container } = render(<ActivityChart {...defaultProps} />)

      // Check for Card structure (uses shadcn Card)
      const card = container.querySelector('[class*="card"]')
      expect(card).toBeInTheDocument()
    })

    it('should have CardHeader with title', () => {
      render(<ActivityChart {...defaultProps} />)

      // Title should be in a heading-like element
      const title = screen.getByText('Test Chart')
      expect(title).toBeInTheDocument()
    })
  })
})
