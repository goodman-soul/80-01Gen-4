import { useNavigate } from 'react-router-dom';
import { Building2, Network, UserCheck, ClipboardCheck, Cpu, Wrench, Shield, Users } from 'lucide-react';
import { useAppStore, UserRole } from '@/store';
import StatCard from '@/components/StatCard';

const roleCards = [
  {
    role: 'rental' as UserRole,
    path: '/rental',
    icon: Building2,
    title: '租赁公司管理',
    description: '设备数据同步 · 保养监控看板',
    gradient: 'from-brand-orange to-amber-500',
    color: 'orange',
  },
  {
    role: 'dispatch' as UserRole,
    path: '/dispatch',
    icon: Network,
    title: '智能调度中心',
    description: '地图派单 · SLA监控',
    gradient: 'from-status-info to-indigo-500',
    color: 'blue',
  },
  {
    role: 'tech' as UserRole,
    path: '/tech',
    icon: UserCheck,
    title: '技师外勤工作台',
    description: '工单接收 · 离线填写',
    gradient: 'from-status-safe to-emerald-500',
    color: 'green',
  },
  {
    role: 'client' as UserRole,
    path: '/client/confirm/demo',
    icon: ClipboardCheck,
    title: '客户验收确认',
    description: '保养报告 · 作业恢复确认',
    gradient: 'from-purple-500 to-fuchsia-500',
    color: 'orange',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const setRole = useAppStore((s) => s.setRole);
  const devices = useAppStore((s) => s.devices);
  const workOrders = useAppStore((s) => s.workOrders);
  const technicians = useAppStore((s) => s.technicians);

  const today = new Date().toDateString();
  const todayWorkOrders = workOrders.filter(
    (wo) => new Date(wo.created_at).toDateString() === today
  );
  const pendingMaintenance = devices.filter((d) => d.status === '待保养').length;
  const onlineTechs = technicians.filter((t) => t.online).length;

  const handleCardClick = (role: UserRole, path: string) => {
    setRole(role);
    navigate(path);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
      <div className="absolute inset-0 gauge-grid-bg opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-steel/60" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(255,107,26,0.25) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 container max-w-6xl py-12 px-4">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
            <span className="text-xs text-brand-gray tracking-widest uppercase">
              工业4.0 · 智能维护平台
            </span>
          </div>
          <h1
            className="font-display text-6xl md:text-7xl font-bold tracking-wider text-white mb-3"
            style={{
              textShadow: '0 0 60px rgba(255,107,26,0.15)',
            }}
          >
            铁甲云维护
          </h1>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand-orange/60" />
            <div className="w-1.5 h-1.5 rotate-45 bg-brand-orange" />
            <div className="h-[2px] w-24 bg-gradient-to-r from-brand-orange via-brand-orange/80 to-brand-orange" />
            <div className="w-1.5 h-1.5 rotate-45 bg-brand-orange" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand-orange/60" />
          </div>
          <p className="font-display text-xl md:text-2xl tracking-wider text-brand-gray">
            工程机械智能保养派单系统
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14">
          {roleCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.role}
                onClick={() => handleCardClick(card.role, card.path)}
                className="group relative industrial-card p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-industrial-lg tactile overflow-hidden"
              >
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${card.gradient}`}
                  style={{ opacity: 0.04 }}
                />
                <div
                  className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.gradient}`}
                />
                <div
                  className={`absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 blur-2xl`}
                />

                <div className="relative z-10 flex items-start gap-5">
                  <div
                    className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${card.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
                    <Icon
                      className="relative z-10 w-8 h-8 text-white"
                      strokeWidth={2}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-2xl font-bold text-white mb-2 tracking-wide group-hover:text-brand-orange transition-colors duration-300">
                      {card.title}
                    </h2>
                    <p className="text-sm text-brand-gray leading-relaxed">
                      {card.description}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-brand-orange/80 group-hover:text-brand-orange transition-colors">
                      <span>进入门户</span>
                      <svg
                        className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="divider-rivet mb-8">
          <span />
        </div>

        <div className="text-center mb-6">
          <h3 className="font-display text-sm tracking-[0.2em] uppercase text-brand-gray">
            平台运营概览
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="设备总数"
            value={devices.length}
            icon={<Cpu className="w-5 h-5" strokeWidth={2} />}
            color="orange"
          />
          <StatCard
            title="待保养"
            value={pendingMaintenance}
            icon={<Wrench className="w-5 h-5" strokeWidth={2} />}
            color="red"
          />
          <StatCard
            title="今日工单"
            value={todayWorkOrders.length}
            icon={<Shield className="w-5 h-5" strokeWidth={2} />}
            color="blue"
          />
          <StatCard
            title="在线技师"
            value={onlineTechs}
            icon={<Users className="w-5 h-5" strokeWidth={2} />}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}
