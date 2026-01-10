/**
 * ActivityChart Component - Time Series Chart with Recharts v2
 * LOT 11.3 - Dashboard Components
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, no individual records)
 * - Time-series data (counts per day)
 *
 * Tech Stack:
 * - Recharts v2 (React 19 native support)
 * - Responsive charts
 */

'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export type ChartType = 'line' | 'area' | 'bar'

export interface ActivityChartProps {
  title: string
  subtitle?: string
  data: Array<Record<string, string | number>>
  dataKeys: Array<{
    key: string
    label: string
    color: string
  }>
  xAxisKey: string
  type?: ChartType
  isLoading?: boolean
  height?: number
}

export function ActivityChart({
  title,
  subtitle,
  data,
  dataKeys,
  xAxisKey,
  type = 'line',
  isLoading = false,
  height = 300,
}: ActivityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div
            className="w-full bg-muted animate-pulse rounded"
            style={{ height }}
          />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div
            className="w-full flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    const chartContent = (
      <>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xAxisKey}
          className="text-xs"
          tickFormatter={(value) => {
            // Format date: "2026-01-09" → "09/01"
            if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
              const [, month, day] = value.split('-')
              return `${day}/${month}`
            }
            return value
          }}
        />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Legend />
      </>
    )

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {chartContent}
            {dataKeys.map(({ key, label, color }) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={color}
                fill={color}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {chartContent}
            {dataKeys.map(({ key, label, color }) => (
              <Bar key={key} dataKey={key} name={label} fill={color} />
            ))}
          </BarChart>
        )
      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            {chartContent}
            {dataKeys.map(({ key, label, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
