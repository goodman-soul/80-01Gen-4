import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatCardColor = 'orange' | 'green' | 'red' | 'blue'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: string
  trendUp?: boolean
  color?: StatCardColor
  onClick?: () => void
}

const colorMap: Record<StatCardColor, {
  iconBg: string
  iconColor: string
  iconShadow: string
  accent: string
}> = {
  orange: {
    iconBg: 'bg-brand-orange/15',
    iconColor: 'text-brand-orange',
    iconShadow: 'shadow-[0_0_24px_rgba(255,107,26,0.4)]',
    accent: 'from-brand-orange/20 to-transparent',
  },
  green: {
    iconBg: 'bg-status-safe/15',
    iconColor: 'text-status-safe',
    iconShadow: 'shadow-[0_0_24px_rgba(16,185,129,0.4)]',
    accent: 'from-status-safe/20 to-transparent',
  },
  red: {
    iconBg: 'bg-status-danger/15',
    iconColor: 'text-status-danger',
    iconShadow: 'shadow-[0_0_24px_rgba(239,68,68,0.4)]',
    accent: 'from-status-danger/20 to-transparent',
  },
  blue: {
    iconBg: 'bg-status-info/15',
    iconColor: 'text-status-info',
    iconShadow: 'shadow-[0_0_24px_rgba(59,130,246,0.4)]',
    accent: 'from-status-info/20 to-transparent',
  },
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  color = 'orange',
  onClick,
}: StatCardProps) {
  const c = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative industrial-card p-5 transition-all duration-300 tactile',
        'hover:-translate-y-1 hover:shadow-industrial-lg cursor-pointer',
        'group'
      )}
    >
      <div
        className={cn(
          'absolute -top-px left-0 right-0 h-px bg-gradient-to-r opacity-60',
          c.accent
        )}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div
          className={cn(
            'relative w-12 h-12 rounded-xl flex items-center justify-center',
            c.iconBg,
            c.iconShadow,
            'transition-transform duration-300 group-hover:scale-110'
          )}
        >
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
          <div className={cn('relative z-10', c.iconColor)}>{icon}</div>
        </div>

        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
              trendUp
                ? 'bg-status-safe/10 text-status-safe'
                : 'bg-status-danger/10 text-status-danger'
            )}
          >
            {trendUp ? (
              <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
            )}
            {trend}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-brand-gray tracking-wide uppercase">
          {title}
        </p>
        <p className="font-display text-4xl font-bold tracking-tight text-white count-anim">
          {value}
        </p>
      </div>

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r opacity-0',
          c.accent,
          'transition-opacity duration-300 group-hover:opacity-100'
        )}
      />
    </div>
  )
}
