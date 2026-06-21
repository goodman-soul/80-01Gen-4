import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ClipboardList,
  Map,
  Bell,
  User,
  MapPin,
  Star,
  ChevronDown,
  ArrowLeft,
  Wifi,
  WifiOff,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Database,
  Palette,
  CloudOff,
  Radio,
  Package,
} from 'lucide-react';
import DeviceIcon from '@/components/DeviceIcon';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';
import type { WorkOrder, WorkOrderPriority } from '@/types';

type HomeTab = 'workorder' | 'map' | 'message' | 'profile';
type WorkOrderSegment = 'today' | 'in_progress' | 'completed';

const priorityStyle: Record<WorkOrderPriority, string> = {
  '紧急': 'bg-status-danger/15 border-status-danger/40 text-status-danger',
  '高': 'bg-brand-orange/15 border-brand-orange/40 text-brand-orange',
  '中': 'bg-status-warning/15 border-status-warning/40 text-status-warning',
  '低': 'bg-status-safe/15 border-status-safe/40 text-status-safe',
};

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

function getTimeStr(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TechHome() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const workOrders = useAppStore(s => s.workOrders);
  const technicians = useAppStore(s => s.technicians);
  const pendingSyncCount = useAppStore(s => s.pendingSyncCount);
  const updateWorkOrderStatus = useAppStore(s => s.updateWorkOrderStatus);
  const addOrUpdateWorkOrder = useAppStore(s => s.addOrUpdateWorkOrder);

  const [tab, setTab] = useState<HomeTab>('workorder');
  const [segment, setSegment] = useState<WorkOrderSegment>('today');
  const [highContrast, setHighContrast] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const me = technicians.find(t => t.online) || technicians[0];

  const myWorkOrders = useMemo(() => {
    if (!me) return [];
    return workOrders.filter(wo => wo.technician_id === me.id || wo.status === '待派单');
  }, [workOrders, me]);

  const today = new Date().toISOString().slice(0, 10);

  const todayList = useMemo(() => {
    return myWorkOrders.filter(wo => {
      if (wo.status === '已完成' || wo.status === '待验收') {
        return wo.completed_at?.slice(0, 10) === today;
      }
      if (wo.created_at) {
        return wo.created_at.slice(0, 10) === today || true;
      }
      return true;
    }).filter(wo => wo.status === '待派单' || wo.status === '已派单');
  }, [myWorkOrders, today]);

  const inProgressList = useMemo(() => {
    return myWorkOrders.filter(wo => wo.status === '进行中');
  }, [myWorkOrders]);

  const completedList = useMemo(() => {
    return myWorkOrders.filter(wo => wo.status === '已完成' || wo.status === '待验收');
  }, [myWorkOrders]);

  const todayCompletedCount = completedList.filter(wo => wo.completed_at?.slice(0, 10) === today).length;
  const todayTodoCount = todayList.length + inProgressList.length;

  const displayList =
    segment === 'today' ? todayList :
    segment === 'in_progress' ? inProgressList :
    completedList;

  const handleAcceptOrder = (wo: WorkOrder) => {
    updateWorkOrderStatus(wo.id, '已派单');
    addOrUpdateWorkOrder({
      ...wo,
      status: '已派单',
      technician_id: me?.id ?? null,
      technician: me,
      assigned_at: new Date().toISOString(),
    });
  };

  const handleStartWork = (wo: WorkOrder) => {
    if (wo.status === '已派单') {
      addOrUpdateWorkOrder({
        ...wo,
        status: '进行中',
        arrived_at: new Date().toISOString(),
      });
    }
    navigate(`/tech/workorder/${wo.id}`);
  };

  const priorityBadge = (p: WorkOrderPriority) => (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold',
      priorityStyle[p]
    )}>
      {p === '紧急' && <AlertCircle className="w-3 h-3 mr-1" />}
      {p}
    </span>
  );

  const renderWorkOrderCard = (wo: WorkOrder) => {
    const device = wo.device;
    const isInProgress = wo.status === '进行中';
    const distanceKm = me && device
      ? calcDistance(me.latitude, me.longitude, device.latitude, device.longitude)
      : 0;
    const etaMin = Math.max(5, Math.round(distanceKm * 4));
    const showAccept = wo.status === '待派单';
    const showStart = wo.status === '已派单' || isInProgress;
    const showView = wo.status === '已完成' || wo.status === '待验收';

    return (
      <div
        key={wo.id}
        onClick={() => !showAccept && navigate(`/tech/workorder/${wo.id}`)}
        className={cn(
          'relative industrial-card p-4 mb-3 tactile cursor-pointer',
          isInProgress && 'border-l-[3px] border-l-brand-orange'
        )}
      >
        {isInProgress && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-xs font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
            进行中
          </span>
        )}

        <div className="flex items-start justify-between gap-2 mb-3 pr-20">
          {priorityBadge(wo.priority)}
          <div className="font-mono text-xs text-brand-gray">
            #{wo.id.slice(-6).toUpperCase()}
          </div>
        </div>

        <div className="flex items-start gap-3 mb-3">
          {device && <DeviceIcon type={device.type} size="sm" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm">
              {device?.device_no} · {device?.model}
            </div>
            <div className="text-xs text-brand-gray mt-0.5">
              {device?.type}
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-white/80">
            <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
            <span className="truncate">{device?.location_name}</span>
            {distanceKm > 0 && (
              <span className="ml-auto font-mono text-brand-gray">
                {distanceKm.toFixed(1)}km · 预计{formatEta(etaMin)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-white/70">
              <User className="w-3 h-3 text-brand-gray" />
              <span>{wo.client_name}</span>
            </div>
            <span className="text-brand-gray">·</span>
            <div className="flex items-center gap-1 text-brand-gray">
              <Clock className="w-3 h-3" />
              <span>
                预计到达 {getTimeStr(
                  new Date(Date.now() + etaMin * 60000).toISOString()
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
          {showAccept && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAcceptOrder(wo); }}
              className="flex-1 btn-industrial-primary min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              接单
            </button>
          )}
          {showStart && (
            <button
              onClick={(e) => { e.stopPropagation(); handleStartWork(wo); }}
              className="flex-1 btn-industrial-primary min-h-[44px]"
            >
              <MapPin className="w-4 h-4" />
              {isInProgress ? '开始作业' : '到达现场'}
            </button>
          )}
          {showView && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/tech/workorder/${wo.id}`); }}
              className="flex-1 btn-industrial-secondary min-h-[44px] text-white/60"
              disabled
            >
              查看详情
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEmpty = (title: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <ClipboardList className="w-12 h-12 text-brand-gray/50" />
      </div>
      <div className="text-white/70 font-medium mb-1">{title}</div>
      <div className="text-xs text-brand-gray">下拉刷新获取最新工单</div>
    </div>
  );

  const renderPullToRefresh = () => (
    <div className="flex flex-col items-center justify-center py-3 text-brand-gray/70">
      <ChevronDown className="w-5 h-5 mb-1 animate-bounce" />
      <span className="text-xs">下拉刷新</span>
    </div>
  );

  const renderWorkOrderTab = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-brand-steel/50 backdrop-blur sticky top-0 z-10 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 border-2 border-white/10"
            style={{ backgroundColor: me?.avatar_color || '#FF6B1A' }}
          >
            {me?.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white truncate">{me?.name || '未登录'}</span>
              <div className="flex items-center gap-0.5 text-status-warning">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="text-xs font-medium">{me?.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="text-white/70">
                今日完成 <span className="text-status-safe font-semibold">{todayCompletedCount}</span>
              </span>
              <span className="text-brand-gray">/</span>
              <span className="text-white/70">
                待办 <span className="text-brand-orange font-semibold">{todayTodoCount}</span>
              </span>
            </div>
          </div>
          <div className={cn(
            'flex flex-col items-center px-2.5 py-1.5 rounded-lg border',
            isOnline && !offlineMode
              ? 'bg-status-safe/10 border-status-safe/30'
              : 'bg-status-danger/10 border-status-danger/30'
          )}>
            {isOnline && !offlineMode ? (
              <>
                <Wifi className="w-4 h-4 text-status-safe" />
                <span className="text-[10px] text-status-safe mt-0.5 font-medium">在线</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-status-danger" />
                <span className="text-[10px] text-status-danger mt-0.5 font-medium">离线</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-lg">
          {([
            { key: 'today', label: '今日待办', count: todayList.length },
            { key: 'in_progress', label: '进行中', count: inProgressList.length },
            { key: 'completed', label: '已完成', count: completedList.length },
          ] as const).map(s => (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={cn(
                'py-2 rounded-md text-sm font-medium transition-all min-h-[40px] flex items-center justify-center gap-1.5 tactile',
                segment === s.key
                  ? 'bg-brand-orange text-white shadow-glow-orange'
                  : 'text-brand-gray hover:text-white/80'
              )}
            >
              {s.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-bold',
                segment === s.key ? 'bg-white/20' : 'bg-white/5'
              )}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {renderPullToRefresh()}
        {displayList.length > 0 ? (
          displayList.map(renderWorkOrderCard)
        ) : (
          renderEmpty(
            segment === 'today' ? '暂无待办工单' :
            segment === 'in_progress' ? '暂无进行中的工单' :
            '暂无已完成工单'
          )
        )}
      </div>
    </div>
  );

  const renderMapTab = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 bg-brand-steel/50 backdrop-blur sticky top-0 z-10 border-b border-white/5">
        <h2 className="font-display text-lg uppercase tracking-wider text-white">地图导航</h2>
        <p className="text-xs text-brand-gray mt-1">查看附近待处理工单位置</p>
      </div>
      <div className="flex-1 map-grid-bg relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Map className="w-16 h-16 text-brand-gray/30 mx-auto mb-3" />
            <div className="text-white/50 font-medium">地图视图</div>
            <div className="text-xs text-brand-gray mt-1">集成第三方地图SDK</div>
          </div>
        </div>
        <div className="absolute top-4 left-4 industrial-card px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Radio className="w-3.5 h-3.5 text-brand-orange animate-pulse" />
            <span className="text-white/80">
              附近 <span className="text-brand-orange font-bold">{todayTodoCount}</span> 个工单
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMessageTab = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 bg-brand-steel/50 backdrop-blur sticky top-0 z-10 border-b border-white/5">
        <h2 className="font-display text-lg uppercase tracking-wider text-white">消息中心</h2>
        <p className="text-xs text-brand-gray mt-1">系统通知与工单提醒</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[
          { title: '新工单派发', desc: '您有一条新的紧急工单待处理', time: '刚刚', urgent: true },
          { title: '客户评价提醒', desc: '工单 #A82K19 已完成，请等待客户评价', time: '10分钟前', urgent: false },
          { title: '同步成功', desc: '5条离线工单已同步到服务器', time: '1小时前', urgent: false },
          { title: '保养周期提醒', desc: '常用备件库存不足，请及时申请补充', time: '昨天', urgent: false },
        ].map((m, i) => (
          <div key={i} className={cn(
            'industrial-card p-4 tactile',
            m.urgent && 'border-l-[3px] border-l-status-danger'
          )}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="font-semibold text-white text-sm">{m.title}</div>
              <div className="text-[10px] text-brand-gray shrink-0">{m.time}</div>
            </div>
            <div className="text-xs text-white/60">{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-6 pb-8 bg-gradient-to-b from-brand-orange/20 to-transparent">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shrink-0 border-4 border-white/10 shadow-glow-orange"
            style={{ backgroundColor: me?.avatar_color || '#FF6B1A' }}
          >
            {me?.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-xl">{me?.name || '未登录'}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-status-warning">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-semibold">{me?.rating.toFixed(1)}</span>
              </div>
              <span className="text-brand-gray">·</span>
              <span className="text-xs text-white/70">{me?.skills?.join(' / ')}</span>
            </div>
            <div className="text-xs text-brand-gray mt-1">{me?.phone}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="industrial-card p-3 text-center">
            <div className="font-bold text-2xl text-brand-orange font-mono">{todayTodoCount}</div>
            <div className="text-[10px] text-brand-gray mt-1">今日待办</div>
          </div>
          <div className="industrial-card p-3 text-center">
            <div className="font-bold text-2xl text-status-safe font-mono">{todayCompletedCount}</div>
            <div className="text-[10px] text-brand-gray mt-1">今日完成</div>
          </div>
          <div className="industrial-card p-3 text-center">
            <div className="font-bold text-2xl text-status-info font-mono">{completedList.length}</div>
            <div className="text-[10px] text-brand-gray mt-1">累计</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        <button
          onClick={() => navigate('/tech/offline-sync')}
          className="w-full industrial-card p-4 flex items-center gap-4 tactile min-h-[56px]"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center relative">
            <Database className="w-5 h-5 text-brand-orange" />
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center border-2 border-brand-steel-light">
                {pendingSyncCount}
              </span>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-white text-sm">离线同步中心</div>
            <div className="text-[11px] text-brand-gray mt-0.5">
              {pendingSyncCount > 0
                ? `${pendingSyncCount} 条数据等待同步`
                : '所有数据已同步完成'}
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-brand-gray rotate-180" />
        </button>

        <div className="industrial-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-gray" />
            <span className="font-semibold text-white text-sm">系统设置</span>
          </div>

          <div className="divide-y divide-white/5">
            <div className="px-4 py-3.5 flex items-center gap-3 min-h-[56px]">
              <div className="w-9 h-9 rounded-lg bg-status-info/15 border border-status-info/30 flex items-center justify-center shrink-0">
                <Palette className="w-4.5 h-4.5 text-status-info" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">高对比度模式</div>
                <div className="text-[11px] text-brand-gray mt-0.5">提升文字与背景对比度</div>
              </div>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={cn(
                  'w-12 h-7 rounded-full transition-all shrink-0 relative border',
                  highContrast
                    ? 'bg-brand-orange border-brand-orange'
                    : 'bg-white/10 border-white/15'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5.5 h-5.5 rounded-full bg-white shadow-md transition-all duration-200',
                  highContrast ? 'left-[22px]' : 'left-0.5'
                )} style={{ width: '22px', height: '22px' }} />
              </button>
            </div>

            <div className="px-4 py-3.5 flex items-center gap-3 min-h-[56px]">
              <div className="w-9 h-9 rounded-lg bg-brand-gray/15 border border-brand-gray/30 flex items-center justify-center shrink-0">
                <CloudOff className="w-4.5 h-4.5 text-brand-gray" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">离线模式</div>
                <div className="text-[11px] text-brand-gray mt-0.5">强制离线，仅使用本地数据</div>
              </div>
              <button
                onClick={() => setOfflineMode(!offlineMode)}
                className={cn(
                  'w-12 h-7 rounded-full transition-all shrink-0 relative border',
                  offlineMode
                    ? 'bg-brand-orange border-brand-orange'
                    : 'bg-white/10 border-white/15'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-5.5 h-5.5 rounded-full bg-white shadow-md transition-all duration-200',
                  offlineMode ? 'left-[22px]' : 'left-0.5'
                )} style={{ width: '22px', height: '22px' }} />
              </button>
            </div>
          </div>
        </div>

        <div className="industrial-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-gray" />
            <span className="font-semibold text-white text-sm">关于</span>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-4 py-3.5 flex items-center gap-3 min-h-[52px]">
              <div className="flex-1 text-sm text-white/70">版本号</div>
              <div className="text-xs text-brand-gray font-mono">v1.0.0</div>
            </div>
            <div className="px-4 py-3.5 flex items-center gap-3 min-h-[52px]">
              <div className="flex-1 text-sm text-white/70">Service Worker</div>
              <StatusBadge status="运行中" />
            </div>
          </div>
        </div>

        <div className="pt-2 pb-6 mobile-safe-bottom">
          <button className="w-full btn-industrial-secondary min-h-[48px] text-status-danger/80 border-status-danger/30 hover:bg-status-danger/10">
            <RefreshCw className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );

  const tabs: { key: HomeTab; icon: LucideIcon; label: string; badge?: number }[] = [
    { key: 'workorder', icon: ClipboardList, label: '工单' },
    { key: 'map', icon: Map, label: '地图' },
    { key: 'message', icon: Bell, label: '消息', badge: 2 },
    { key: 'profile', icon: User, label: '我的' },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-brand-steel overflow-hidden max-w-[480px] mx-auto relative">
      <div className="flex-1 overflow-hidden">
        {tab === 'workorder' && renderWorkOrderTab()}
        {tab === 'map' && renderMapTab()}
        {tab === 'message' && renderMessageTab()}
        {tab === 'profile' && renderProfileTab()}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-brand-steel-light/95 backdrop-blur-lg z-20">
        <div className="grid grid-cols-4 px-2 py-2">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all tactile min-h-[56px]',
                  active
                    ? 'text-brand-orange'
                    : 'text-brand-gray hover:text-white/70'
                )}
              >
                <div className="relative">
                  <Icon className={cn('w-5.5 h-5.5', active && 'drop-shadow-[0_0_8px_rgba(255,107,26,0.5)]')} />
                  {t.badge && t.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-status-danger text-white text-[10px] font-bold flex items-center justify-center">
                      {t.badge > 99 ? '99+' : t.badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-[11px] font-medium', active && 'font-bold')}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mobile-safe-bottom" />
      </div>
    </div>
  );
}
