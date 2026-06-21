import { Truck, Construction, CircleDashed, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type DeviceType = '挖机' | '吊车' | '压路机'

interface DeviceIconProps {
  type: DeviceType
  size?: 'sm' | 'md' | 'lg'
  color?: 'orange' | 'green' | 'blue' | 'gray'
}

const sizeMap = {
  sm: {
    wrapper: 'w-9 h-9',
    icon: 'w-4.5 h-4.5',
    stroke: 2,
  },
  md: {
    wrapper: 'w-12 h-12',
    icon: 'w-6 h-6',
    stroke: 2,
  },
  lg: {
    wrapper: 'w-16 h-16',
    icon: 'w-8 h-8',
    stroke: 2,
  },
}

const colorMap = {
  orange: {
    bg: 'bg-brand-orange/15',
    border: 'border-brand-orange/30',
    text: 'text-brand-orange',
    accent: 'from-brand-orange/20 to-transparent',
  },
  green: {
    bg: 'bg-status-safe/15',
    border: 'border-status-safe/30',
    text: 'text-status-safe',
    accent: 'from-status-safe/20 to-transparent',
  },
  blue: {
    bg: 'bg-status-info/15',
    border: 'border-status-info/30',
    text: 'text-status-info',
    accent: 'from-status-info/20 to-transparent',
  },
  gray: {
    bg: 'bg-white/5',
    border: 'border-white/10',
    text: 'text-brand-gray',
    accent: 'from-white/10 to-transparent',
  },
}

export default function DeviceIcon({
  type,
  size = 'md',
  color = 'orange',
}: DeviceIconProps) {
  const s = sizeMap[size]
  const c = colorMap[color]

  const renderIcon = () => {
    switch (type) {
      case '挖机':
        return (
          <div className="relative flex flex-col items-center justify-center gap-0.5">
            <Truck className={cn(s.icon, c.text)} strokeWidth={s.stroke} />
            <Minus className={cn('w-3.5 h-0.5', c.text)} strokeWidth={3} />
          </div>
        )
      case '吊车':
        return (
          <Construction className={cn(s.icon, c.text)} strokeWidth={s.stroke} />
        )
      case '压路机':
        return (
          <CircleDashed className={cn(s.icon, c.text)} strokeWidth={s.stroke} />
        )
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border flex items-center justify-center overflow-hidden',
        s.wrapper,
        c.bg,
        c.border
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-60',
          c.accent
        )}
      />
      <div className="relative z-10">{renderIcon()}</div>
    </div>
  )
}
