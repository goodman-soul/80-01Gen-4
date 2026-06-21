import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

type StatusStyle = {
  dot: string
  text: string
  bg: string
  border: string
}

const getStatusStyle = (status: string): StatusStyle => {
  const safeList = ['运行中', '已完成', '已验收', '同步成功']
  const warningList = ['待保养', '待派单', '已派单']
  const dangerList = ['故障', '紧急', '已退回', '同步失败']
  const infoList = ['进行中', '待验收']
  const offlineList = ['离线']

  if (safeList.some((s) => status.includes(s))) {
    return {
      dot: 'bg-status-safe shadow-[0_0_6px_rgba(16,185,129,0.6)]',
      text: 'text-status-safe',
      bg: 'bg-status-safe/10',
      border: 'border-status-safe/30',
    }
  }

  if (warningList.some((s) => status.includes(s))) {
    return {
      dot: 'bg-status-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]',
      text: 'text-status-warning',
      bg: 'bg-status-warning/10',
      border: 'border-status-warning/30',
    }
  }

  if (dangerList.some((s) => status.includes(s))) {
    return {
      dot: 'bg-status-danger shadow-[0_0_6px_rgba(239,68,68,0.6)]',
      text: 'text-status-danger',
      bg: 'bg-status-danger/10',
      border: 'border-status-danger/30',
    }
  }

  if (infoList.some((s) => status.includes(s))) {
    return {
      dot: 'bg-status-info shadow-[0_0_6px_rgba(59,130,246,0.6)]',
      text: 'text-status-info',
      bg: 'bg-status-info/10',
      border: 'border-status-info/30',
    }
  }

  if (offlineList.some((s) => status.includes(s))) {
    return {
      dot: 'bg-brand-gray',
      text: 'text-brand-gray',
      bg: 'bg-white/5',
      border: 'border-white/10',
    }
  }

  return {
    dot: 'bg-brand-gray',
    text: 'text-white/70',
    bg: 'bg-white/5',
    border: 'border-white/10',
  }
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = getStatusStyle(status)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border backdrop-blur-sm',
        style.bg,
        style.border,
        style.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full relative', style.dot)}>
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-40',
            style.dot.replace('shadow-[0_0_6px_rgba(16,185,129,0.6)]', '')
          )}
        />
      </span>
      {status}
    </span>
  )
}
