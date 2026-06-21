import { Wrench, Cog, Bell } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  hideHeader?: boolean
}

const roleTabs = [
  { key: 'rental', label: '租赁公司', path: '/rental' },
  { key: 'dispatch', label: '调度中心', path: '/dispatch' },
  { key: 'tech', label: '技师端', path: '/tech' },
  { key: 'client', label: '客户验收', path: '/client/confirm' },
]

export default function AppHeader({ hideHeader = false }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  if (hideHeader) return null

  const getActiveRole = () => {
    const path = location.pathname
    if (path.startsWith('/rental')) return 'rental'
    if (path.startsWith('/dispatch')) return 'dispatch'
    if (path.startsWith('/tech')) return 'tech'
    if (path.startsWith('/client')) return 'client'
    return null
  }

  const activeRole = getActiveRole()
  const isOnline = navigator.onLine

  return (
    <header className="relative bg-brand-steel border-b border-white/10">
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-orange via-brand-orange/70 to-transparent opacity-80" />
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-2.5 cursor-pointer group tactile"
          onClick={() => navigate('/')}
        >
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-brand-orange/20 to-brand-orange/5 border border-brand-orange/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <Wrench className="w-5 h-5 text-brand-orange relative z-10 -translate-x-0.5 -translate-y-0.5" strokeWidth={2.2} />
            <Cog className="w-3.5 h-3.5 text-brand-orange/70 absolute bottom-1 right-1 z-10" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-semibold tracking-wider text-white leading-none">
              铁甲云维护
            </span>
            <span className="text-[10px] text-brand-gray tracking-widest mt-1 uppercase">
              Cloud Maintenance
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5">
          {roleTabs.map((tab) => {
            const isActive = activeRole === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                  isActive
                    ? 'text-white bg-brand-orange/15 shadow-[inset_0_0_0_1px_rgba(255,107,26,0.3)]'
                    : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                )}
              >
                {isActive && (
                  <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-orange shadow-glow-orange" />
                )}
                {tab.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5">
            <span
              className={cn(
                'w-2 h-2 rounded-full relative',
                isOnline ? 'bg-status-safe' : 'bg-brand-gray'
              )}
            >
              {isOnline && (
                <span className="absolute inset-0 rounded-full bg-status-safe animate-ping opacity-50" />
              )}
            </span>
            <span className={cn(
              'text-xs font-medium',
              isOnline ? 'text-status-safe' : 'text-brand-gray'
            )}>
              {isOnline ? '在线' : '离线'}
            </span>
          </div>

          <button className="relative w-9 h-9 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 tactile">
            <Bell className="w-4.5 h-4.5" strokeWidth={2} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-danger border border-brand-steel" />
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-orange via-brand-orange to-status-danger flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white/10">
              管
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-white leading-none">管理员</span>
              <span className="text-[10px] text-brand-gray mt-1">Super Admin</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
