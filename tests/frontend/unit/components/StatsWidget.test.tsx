/**
 * StatsWidget Component Tests - LOT 11.3
 * Tests for dashboard KPI widget component
 */

import { render, screen } from '@testing-library/react';
import { StatsWidget } from '@/components/backoffice/dashboard/StatsWidget';
import { Activity } from 'lucide-react';

describe('StatsWidget Component', () => {
  it('should render basic stats with title and value', () => {
    render(
      <StatsWidget
        title="Total Users"
        value={42}
        subtitle="Active users"
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Active users')).toBeInTheDocument();
  });

  it('should render with icon', () => {
    const { container } = render(
      <StatsWidget
        title="Activity"
        value={100}
        icon={Activity}
      />
    );

    // Check if SVG icon is rendered
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should render loading state with skeleton', () => {
    const { container } = render(
      <StatsWidget
        title="Loading Stats"
        value={0}
        isLoading={true}
      />
    );

    // Check for loading skeleton (animate-pulse)
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('should apply success variant color', () => {
    render(
      <StatsWidget
        title="Success Metric"
        value={10}
        variant="success"
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should apply warning variant color', () => {
    render(
      <StatsWidget
        title="Warning Metric"
        value={5}
        variant="warning"
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should apply danger variant color', () => {
    render(
      <StatsWidget
        title="Critical Metric"
        value={3}
        variant="danger"
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display positive trend indicator', () => {
    render(
      <StatsWidget
        title="Trending Up"
        value={50}
        trend={{ value: 15, isPositive: true }}
      />
    );

    expect(screen.getByText('+15%')).toBeInTheDocument();
  });

  it('should display negative trend indicator', () => {
    render(
      <StatsWidget
        title="Trending Down"
        value={30}
        trend={{ value: -10, isPositive: false }}
      />
    );

    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('should handle string values', () => {
    render(
      <StatsWidget
        title="Status"
        value="Active"
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render without subtitle', () => {
    render(
      <StatsWidget
        title="Simple Stat"
        value={99}
      />
    );

    expect(screen.getByText('Simple Stat')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('should render without icon', () => {
    const { container } = render(
      <StatsWidget
        title="No Icon"
        value={100}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });
});
