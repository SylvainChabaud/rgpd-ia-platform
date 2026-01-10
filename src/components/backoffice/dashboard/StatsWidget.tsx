/**
 * StatsWidget Component - Reusable KPI Card
 * LOT 11.3 - Dashboard Components
 *
 * RGPD Compliance:
 * - P1 data only (aggregates, counts)
 * - No sensitive user data
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatsWidgetProps {
  title: string
  value: number | string
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

const variantStyles = {
  default: 'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
}

export function StatsWidget({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  isLoading = false,
}: StatsWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground animate-pulse" />}
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          {subtitle && <div className="h-4 w-32 bg-muted animate-pulse rounded mt-1" />}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={cn('h-4 w-4', variantStyles[variant])} />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={cn('text-2xl font-bold', variantStyles[variant])}>
            {value}
          </div>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium',
                trend.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
