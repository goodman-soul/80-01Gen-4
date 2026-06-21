import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Clock,
  Target,
  Users,
  AlertTriangle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Inbox,
  Zap,
  ChevronDown,
  MapPin,
  Star,
  Navigation,
  Briefcase,
  CheckCircle2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, matchTechnicians } from '@/store';
import DeviceIcon from '@/components/DeviceIcon';
import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';

const priorityOrder: Record<string, number> = { '紧急': 0, '高': 1, '中': 2, '低': 3 };

const priorityStyles: Record<string, string> = {
  '紧急': 'bg-status-danger/15 border-status-danger/40 text-status-danger',
  '高': 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange',
  '中': 'bg-status-warning/15 border-status-warning/40 text-status-warning',
  '低': 'bg-status-info/15 border-status-info/40 text-status-info',
};

export default function DispatchCenter() {
  const [activeTab, setActiveTab] = useState<'queue' | 'kanban'>('queue');
  const [zoom, setZoom] = useState(1);
  const [showDevices, setShowDevices] = useState(true);
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const devices = useAppStore(s => s.devices);
  const technicians = useAppStore(s => s.technicians);
  const workOrders = useAppStore(s => s.workOrders);
  const updateWorkOrderStatus = useAppStore(s => s.updateWorkOrderStatus);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const coordBounds = useMemo(() => {
    const allLats = [...devices.map(d => d.latitude), ...technicians.map(t => t.latitude)];
    const allLngs = [...devices.map(d => d.longitude), ...technicians.map(t => t.longitude)];
    const minLat = Math.min(...allLats) - 0.01;
    const maxLat = Math.max(...allLats) + 0.01;
    const minLng = Math.min(...allLngs) - 0.01;
    const maxLng = Math.max(...allLngs) + 0.01;
    return { minLat, maxLat, minLng, maxLng };
  }, [devices, technicians]);

  const toMapPos = (lat: number, lng: number) => ({
    top: `${((coordBounds.maxLat - lat) / (coordBounds.maxLat - coordBounds.minLat)) * 100}%`,
    left: `${((lng - coordBounds.minLng) / (coordBounds.maxLng - coordBounds.minLng)) * 100}%`,
  });

  const pendingOrders = useMemo(() => {
    return workOrders
      .filter(wo => wo.status === '待派单')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [workOrders]);

  const kanbanColumns = useMemo(() => {
    const groups: Record<string, typeof workOrders> = {
      '待派单': [],
      '已派单·进行中': [],
      '待验收': [],
      '已完成': [],
    };
    workOrders.forEach(wo => {
      if (wo.status === '待派单') groups['待派单'].push(wo);
      else if (wo.status === '已派单' || wo.status === '进行中') groups['已派单·进行中'].push(wo);
      else if (wo.status === '待验收') groups['待验收'].push(wo);
      else if (wo.status === '已完成') groups['已完成'].push(wo);
    });
    return groups;
  }, [workOrders]);

  const getSlaRemaining = (wo: typeof workOrders[0]) => {
    const created = new Date(wo.created_at).getTime();
    const deadline = created + wo.sla_deadline_minutes * 60 * 1000;
    return Math.max(0, Math.floor((deadline - now) / 60000));
  };

  const getDevice = (deviceId: string) => devices.find(d => d.id === deviceId);

  const getMatchedTechnicians = (workOrderId: string) => {
    const stateForMatch = {
      workOrders: workOrders.map(w => ({
        ...w,
        deviceId: w.device_id,
      })),
      devices: devices.map(d => ({
        ...d,
        location: { lat: d.latitude, lng: d.longitude },
        skills: [d.type],
      })),
      technicians: technicians.map(t => ({
        ...t,
        location: { lat: t.latitude, lng: t.longitude },
        currentLoad: t.workload,
        maxLoad: 8,
      })),
    };

    return matchTechnicians(workOrderId, stateForMatch).slice(0, 3);
  };

  const handleDispatch = (orderId: string) => {
    updateWorkOrderStatus(orderId, '已派单');
    setExpandedOrder(null);
  };

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayDispatched = workOrders.filter(wo =>
      wo.assigned_at && new Date(wo.assigned_at).toDateString() === today
    ).length;

    const completedWithArrival = workOrders.filter(wo => wo.arrived_at && wo.completed_at);
    const avgResponse = completedWithArrival.length > 0
      ? Math.round(completedWithArrival.reduce((sum, wo) => {
          const assigned = wo.assigned_at ? new Date(wo.assigned_at).getTime() : 0;
          const arrived = new Date(wo.arrived_at!).getTime();
          return sum + (arrived - assigned) / 60000;
        }, 0) / completedWithArrival.length)
      : 0;

    const slaMet = workOrders.filter(wo => {
      if (!wo.assigned_at) return false;
      const created = new Date(wo.created_at).getTime();
      const assigned = new Date(wo.assigned_at).getTime();
      return (assigned - created) / 60000 <= wo.sla_deadline_minutes;
    }).length;
    const slaTotal = workOrders.filter(wo => wo.status !== '待派单').length || 1;
    const slaRate = Math.round((slaMet / slaTotal) * 100);

    const onlineTechs = technicians.filter(t => t.online).length;
    const pendingCount = pendingOrders.length;

    return { todayDispatched, avgResponse, slaRate, onlineTechs, pendingCount };
  }, [workOrders, technicians, pendingOrders]);

  return (
    <div className="flex flex-col h-screen p-6 gap-5">
      <div className="flex items-center gap-4 shrink-0">
        <div className="grid grid-cols-5 gap-4 flex-1">
          <StatCard
            title="今日派单"
            value={stats.todayDispatched}
            icon={<ClipboardList className="w-6 h-6" />}
            color="orange"
          />
          <StatCard
            title="平均响应"
            value={`${stats.avgResponse}分钟`}
            icon={<Clock className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="SLA达标率"
            value={`${stats.slaRate}%`}
            icon={<Target className="w-6 h-6" />}
            trendUp={stats.slaRate >= 90}
            trend={stats.slaRate >= 90 ? '优秀' : '待提升'}
            color="green"
          />
          <StatCard
            title="在线技师"
            value={stats.onlineTechs}
            icon={<Users className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="待派单"
            value={stats.pendingCount}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="red"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            className="btn-industrial-secondary"
            onClick={() => setNow(Date.now())}
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-white/5 border border-white/10">
            <span className="text-xs text-white/70">自动派单</span>
            <button
              onClick={() => setAutoDispatch(!autoDispatch)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                autoDispatch ? 'bg-brand-orange' : 'bg-white/15'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200',
                  autoDispatch ? 'translate-x-[22px]' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        <div className="w-3/5 relative industrial-card overflow-hidden">
          <div
            className="absolute inset-0 map-grid-bg transition-transform duration-300"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {showDevices && devices.map(device => {
              const pos = toMapPos(device.latitude, device.longitude);
              const isFault = device.status === '故障';
              const isMaintenance = device.status === '待保养';
              const isNormal = device.status === '运行中';
              return (
                <div
                  key={device.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <div className="relative">
                    {(isFault || isMaintenance) && (
                      <span
                        className={cn(
                          'absolute inset-0 rounded-full animate-pulse-ring',
                          isFault ? 'bg-status-danger/40' : 'bg-status-warning/40'
                        )}
                        style={{ margin: '-6px' }}
                      />
                    )}
                    <div
                      className={cn(
                        'relative w-3 h-3 rounded-full border-2 border-white/40 shadow-lg',
                        isNormal && 'bg-status-safe',
                        isMaintenance && 'bg-status-warning',
                        isFault && 'bg-status-danger animate-pulse'
                      )}
                    />
                  </div>
                </div>
              );
            })}

            {showTechnicians && technicians.map(tech => {
              const pos = toMapPos(tech.latitude, tech.longitude);
              return (
                <div
                  key={tech.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pos.top, left: pos.left }}
                >
                  {tech.online ? (
                    <div
                      className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-status-info drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]"
                    />
                  ) : (
                    <div
                      className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent"
                      style={{
                        borderBottomColor: 'rgba(255,255,255,0.3)',
                        borderBottomStyle: 'dashed'
                      }}
                    />
                  )}
                </div>
              );
            })}

            {showOrders && pendingOrders.map(wo => {
              const device = getDevice(wo.device_id);
              if (!device) return null;
              const matches = getMatchedTechnicians(wo.id);
              if (matches.length === 0) return null;
              const devicePos = toMapPos(device.latitude, device.longitude);
              return matches.map((match, idx) => {
                const techPos = toMapPos(match.technician.latitude, match.technician.longitude);
                return (
                  <svg
                    key={`${wo.id}-${idx}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'center' }}
                  >
                    <line
                      x1={devicePos.left}
                      y1={devicePos.top}
                      x2={techPos.left}
                      y2={techPos.top}
                      stroke="#FF6B1A"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      opacity="0.5"
                    />
                  </svg>
                );
              });
            })}
          </div>

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button
              className="w-9 h-9 rounded-lg bg-brand-steel-light border border-white/15 text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-center transition"
              onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-brand-steel-light border border-white/15 text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-center transition"
              onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              className="w-9 h-9 rounded-lg bg-brand-steel-light border border-white/15 text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-center transition"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="mt-2 p-2 rounded-lg bg-brand-steel-light border border-white/15 flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDevices}
                  onChange={e => setShowDevices(e.target.checked)}
                  className="accent-brand-orange"
                />
                设备
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTechnicians}
                  onChange={e => setShowTechnicians(e.target.checked)}
                  className="accent-brand-orange"
                />
                技师
              </label>
              <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOrders}
                  onChange={e => setShowOrders(e.target.checked)}
                  className="accent-brand-orange"
                />
                工单
              </label>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-brand-steel-light/90 border border-white/15 z-10 backdrop-blur-sm">
            <div className="text-xs text-white/60 mb-2 font-display tracking-wider uppercase">图例</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-safe border border-white/30" />
                <span className="text-white/70">设备正常</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative w-2.5 h-2.5 inline-flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-status-warning/40 animate-ping" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-status-warning border border-white/30" />
                </span>
                <span className="text-white/70">待保养</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative w-2.5 h-2.5 inline-flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-status-danger/40 animate-ping" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-status-danger border border-white/30 animate-pulse" />
                </span>
                <span className="text-white/70">故障</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-status-info"
                />
                <span className="text-white/70">技师在线</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent"
                  style={{
                    borderBottomColor: 'rgba(255,255,255,0.3)',
                    borderBottomStyle: 'dashed'
                  }}
                />
                <span className="text-white/70">技师离线</span>
              </div>
            </div>
          </div>

          <div className="absolute top-4 left-4 section-header mb-0 pb-2 border-b-0">
            <h2 className="section-title text-base">实时调度地图</h2>
          </div>
        </div>

        <div className="w-2/5 flex flex-col industrial-card overflow-hidden">
          <div className="flex shrink-0 border-b border-white/10">
            <button
              onClick={() => setActiveTab('queue')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition relative',
                activeTab === 'queue' ? 'text-brand-orange' : 'text-white/50 hover:text-white/80'
              )}
            >
              待派单队列
              {activeTab === 'queue' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
            </button>
            <button
              onClick={() => setActiveTab('kanban')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition relative',
                activeTab === 'kanban' ? 'text-brand-orange' : 'text-white/50 hover:text-white/80'
              )}
            >
              状态流转看板
              {activeTab === 'kanban' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'queue' ? (
              <div className="p-4 space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <Inbox className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>暂无待派单工单</p>
                  </div>
                ) : (
                  pendingOrders.map(wo => {
                    const device = getDevice(wo.device_id);
                    const slaRemaining = getSlaRemaining(wo);
                    const isUrgent = slaRemaining < 30;
                    const slaPercent = Math.min(100, (slaRemaining / wo.sla_deadline_minutes) * 100);
                    const isExpanded = expandedOrder === wo.id;
                    const matchedTechs = isExpanded ? getMatchedTechnicians(wo.id) : [];

                    return (
                      <div
                        key={wo.id}
                        className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('tag-industrial', priorityStyles[wo.priority])}>
                                {wo.priority}
                              </span>
                              <StatusBadge status={wo.status} />
                            </div>
                            {device && (
                              <DeviceIcon type={device.type} size="sm" color="orange" />
                            )}
                          </div>

                          {device && (
                            <div>
                              <div className="font-mono text-sm text-white font-medium">
                                {device.device_no} · {device.type} {device.model}
                              </div>
                              {device.fault_code && (
                                <div className="text-xs text-status-danger mt-1 font-mono">
                                  ⚠ {device.fault_code} - {device.fault_name}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{device?.location_name || wo.client_name}</span>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-white/60">SLA 剩余</span>
                              <span className={cn(
                                'text-xs font-mono font-medium',
                                isUrgent ? 'text-status-danger animate-pulse' : 'text-white/80'
                              )}>
                                {slaRemaining} 分钟
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  isUrgent ? 'bg-status-danger' : slaPercent < 50 ? 'bg-status-warning' : 'bg-status-safe'
                                )}
                                style={{ width: `${slaPercent}%` }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : wo.id)}
                            className="btn-industrial-primary w-full"
                          >
                            <Zap className="w-4 h-4" />
                            智能派单
                            <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/10 p-4 space-y-2 bg-brand-steel/50">
                            <div className="text-xs text-white/60 mb-2 font-display tracking-wider uppercase">推荐技师（前3名）</div>
                            {matchedTechs.length === 0 ? (
                              <div className="text-center py-6 text-white/40 text-sm">暂无可匹配技师</div>
                            ) : (
                              matchedTechs.map((match, idx) => (
                                <div
                                  key={match.technician.id}
                                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                                      style={{ backgroundColor: match.technician.avatar_color }}
                                    >
                                      {match.technician.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-white text-sm">{match.technician.name}</span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-status-safe/15 text-status-safe">
                                          #{idx + 1}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-white/60">
                                        <span className="flex items-center gap-1">
                                          <Star className="w-3 h-3 text-status-warning" />
                                          {match.technician.rating}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Navigation className="w-3 h-3" />
                                          {match.distanceKm}km
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Briefcase className="w-3 h-3" />
                                          {match.technician.workload}/8负载
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-status-safe" />
                                          匹配{Math.round(match.score * 100)}%
                                        </span>
                                      </div>
                                      {match.matchedSkills.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {match.matchedSkills.map(skill => (
                                            <span
                                              key={skill}
                                              className="text-[10px] px-1.5 py-0.5 rounded bg-brand-orange/15 text-brand-orange/80 border border-brand-orange/20"
                                            >
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleDispatch(wo.id)}
                                      className="btn-industrial-success text-xs shrink-0 py-2 px-3"
                                    >
                                      <Send className="w-3.5 h-3.5 mr-1" />
                                      派单
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="h-full p-4 overflow-x-auto">
                <div className="grid grid-cols-4 gap-3 h-full min-w-[600px]">
                  {(['待派单', '已派单·进行中', '待验收', '已完成'] as const).map((col, colIdx) => {
                    const columnBorderColors = [
                      'border-status-warning/30',
                      'border-status-info/30',
                      'border-brand-orange/30',
                      'border-status-safe/30',
                    ];
                    const columnAccentColors = [
                      'text-status-warning',
                      'text-status-info',
                      'text-brand-orange',
                      'text-status-safe',
                    ];
                    const columnLeftBorder = [
                      'border-l-status-warning',
                      'border-l-status-info',
                      'border-l-brand-orange',
                      'border-l-status-safe',
                    ];
                    const items = kanbanColumns[col];
                    return (
                      <div
                        key={col}
                        className="flex flex-col rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
                      >
                        <div className={cn('px-3 py-2.5 border-b', columnBorderColors[colIdx], 'bg-white/[0.02]')}>
                          <div className="flex items-center justify-between">
                            <span className={cn('text-sm font-medium', columnAccentColors[colIdx])}>{col}</span>
                            <span className="text-xs text-white/50 font-mono bg-white/10 px-1.5 rounded">{items.length}</span>
                          </div>
                        </div>
                        <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
                          {items.length === 0 ? (
                            <div className="text-center py-8 text-white/20 text-xs">无工单</div>
                          ) : (
                            items.map(wo => {
                              const device = getDevice(wo.device_id);
                              return (
                                <div
                                  key={wo.id}
                                  className={cn(
                                    'rounded-md border-l-4 bg-white/[0.03] border-white/10 p-2.5 cursor-move transition hover:bg-white/[0.06] hover:-translate-y-0.5',
                                    columnLeftBorder[colIdx]
                                  )}
                                  draggable
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', priorityStyles[wo.priority])}>
                                      {wo.priority}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-mono">
                                      {wo.id.slice(-4)}
                                    </span>
                                  </div>
                                  {device && (
                                    <div className="text-xs font-medium text-white/90 truncate">
                                      {device.device_no} · {device.type}
                                    </div>
                                  )}
                                  <div className="text-[11px] text-white/50 mt-1 truncate">
                                    {wo.client_name}
                                  </div>
                                  {wo.technician && (
                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/60">
                                      <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{ backgroundColor: wo.technician.avatar_color }}
                                      />
                                      <span className="truncate">{wo.technician.name}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
