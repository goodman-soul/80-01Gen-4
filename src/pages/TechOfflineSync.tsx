import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  HardDrive,
  Image as ImageIcon,
  FileText,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  AlertCircle,
  Shield,
  Database,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DeviceIcon from '@/components/DeviceIcon';
import { useAppStore } from '@/store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { db, getPendingWorkOrders, markSynced, clearAll } from '@/db';
import { cn } from '@/lib/utils';
import type { WorkOrder } from '@/types';

interface PendingItem {
  workOrder: WorkOrder;
  photoCount: number;
  materialCount: number;
  sizeBytes: number;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TechOfflineSync() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const decrementPendingSync = useAppStore(s => s.decrementPendingSync);
  const setWorkOrders = useAppStore(s => s.setWorkOrders);
  const workOrders = useAppStore(s => s.workOrders);

  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSync, setCurrentSync] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => {
    return localStorage.getItem('last_sync_at');
  });
  const [storageSize, setStorageSize] = useState<number>(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getPendingWorkOrders();
      const withInfo: PendingItem[] = await Promise.all(
        list.map(async wo => {
          const photos = await db.photos.where('work_order_id').equals(wo.id).toArray();
          const materials = await db.materials.where('work_order_id').equals(wo.id).toArray();
          const size = photos.reduce((s, p) => s + (p.data_url?.length || 0), 0)
            + JSON.stringify(materials).length
            + JSON.stringify({ ...wo, materials: [], photos: [] }).length;
          return {
            workOrder: wo,
            photoCount: photos.length,
            materialCount: materials.length,
            sizeBytes: size,
          };
        })
      );
      setPending(withInfo);
      let total = 0;
      try {
        const allPhotos = await db.photos.toArray();
        total += allPhotos.reduce((s, p) => s + (p.data_url?.length || 0), 0);
        const allMaterials = await db.materials.toArray();
        total += JSON.stringify(allMaterials).length;
        const allWOs = await db.work_orders.toArray();
        total += JSON.stringify(allWOs).length;
      } catch { /* ignore */ }
      setStorageSize(total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingWorkOrdersCount = pending.length;
  const pendingPhotosCount = pending.reduce((s, p) => s + p.photoCount, 0);

  const syncAll = async () => {
    if (!isOnline) {
      showToast('当前处于离线状态，无法同步');
      return;
    }
    if (pending.length === 0) {
      showToast('没有需要同步的数据');
      return;
    }
    setSyncing(true);
    setProgress(0);
    try {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        setCurrentSync(`工单 #${item.workOrder.id.slice(-6).toUpperCase()}`);
        await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
        await markSynced(item.workOrder.id);
        decrementPendingSync();
        setProgress(Math.round(((i + 1) / pending.length) * 100));
      }
      setWorkOrders(workOrders.map(wo =>
        pending.find(p => p.workOrder.id === wo.id)
          ? { ...wo, sync_status: 'synced' as const, updated_at: new Date().toISOString() }
          : wo
      ));
      const now = new Date().toISOString();
      localStorage.setItem('last_sync_at', now);
      setLastSyncAt(now);
      showToast('同步成功！');
    } catch (e) {
      console.error(e);
      showToast('同步过程中出现错误');
    } finally {
      setSyncing(false);
      setCurrentSync(null);
      setProgress(0);
      loadData();
    }
  };

  const syncOne = async (id: string) => {
    if (!isOnline) {
      showToast('当前处于离线状态，无法同步');
      return;
    }
    try {
      await new Promise(r => setTimeout(r, 300));
      await markSynced(id);
      decrementPendingSync();
      setWorkOrders(workOrders.map(wo =>
        wo.id === id ? { ...wo, sync_status: 'synced' as const, updated_at: new Date().toISOString() } : wo
      ));
      showToast('已同步');
      const now = new Date().toISOString();
      localStorage.setItem('last_sync_at', now);
      setLastSyncAt(now);
    } catch (e) {
      console.error(e);
      showToast('同步失败');
    } finally {
      loadData();
    }
  };

  const handleClearCache = async () => {
    try {
      await clearAll();
      setWorkOrders(workOrders.map(wo => ({ ...wo, sync_status: 'synced' as const })));
      setConfirmClear(false);
      showToast('缓存已清除');
      loadData();
    } catch (e) {
      console.error(e);
      showToast('清除失败');
    }
  };

  const swStatus = useMemo(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return { state: '不支持', active: false, count: 0 };
    }
    return { state: '已激活', active: true, count: 128 };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-brand-steel max-w-[480px] mx-auto relative">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-medium shadow-glow-orange animate-slide-up">
          {toast}
        </div>
      )}

      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="industrial-card w-full max-w-sm p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-status-danger/15 border border-status-danger/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-status-danger" />
              </div>
              <div>
                <div className="font-bold text-white">确认清除缓存？</div>
                <div className="text-xs text-brand-gray mt-0.5">此操作不可撤销</div>
              </div>
            </div>
            <div className="text-sm text-white/70 mb-5 bg-white/5 rounded-lg p-3 border border-white/10">
              将删除所有本地缓存的：
              <ul className="mt-2 space-y-1 text-xs text-brand-gray">
                <li className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  离线工单草稿 ({pendingWorkOrdersCount})
                </li>
                <li className="flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" />
                  照片资料 ({pendingPhotosCount})
                </li>
                <li className="flex items-center gap-1.5">
                  <HardDrive className="w-3 h-3" />
                  临时数据 ({formatBytes(storageSize)})
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmClear(false)}
                className="btn-industrial-secondary min-h-[44px]"
              >
                取消
              </button>
              <button
                onClick={handleClearCache}
                className="btn-industrial-danger min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 px-4 pt-3 pb-2 bg-brand-steel/95 backdrop-blur border-b border-white/5 z-10 sticky top-0">
        <div className="flex items-center gap-3 min-h-[48px]">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center tactile"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-lg">离线同步中心</h1>
            <p className="text-[11px] text-brand-gray mt-0.5">管理本地数据与云端同步</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-4 py-4">
          <div className="industrial-card p-5 mb-4">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className={cn(
                  'w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all',
                  isOnline
                    ? 'border-status-safe bg-status-safe/10'
                    : 'border-white/10 bg-white/5'
                )}>
                  {isOnline ? (
                    <Wifi className="w-9 h-9 text-status-safe animate-pulse-slow" />
                  ) : (
                    <WifiOff className="w-9 h-9 text-brand-gray" />
                  )}
                </div>
                <div className={cn(
                  'absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                  isOnline
                    ? 'bg-status-safe text-white border-status-safe/50'
                    : 'bg-brand-gray/20 text-brand-gray border-white/10'
                )}>
                  {isOnline ? '在线' : '离线'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-lg">
                  {isOnline ? '网络连接正常' : '当前处于离线状态'}
                </div>
                <div className="text-xs text-brand-gray mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  最后同步：{lastSyncAt ? formatTime(lastSyncAt) : '从未同步'}
                </div>
              </div>
            </div>

            {syncing ? (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-brand-gray flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-brand-orange" />
                    正在同步：{currentSync}
                  </span>
                  <span className="text-brand-orange font-mono font-bold">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-orange to-status-warning rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            <button
              onClick={syncAll}
              disabled={syncing || !isOnline || pending.length === 0}
              className={cn(
                'w-full btn-industrial-primary min-h-[52px] text-base font-bold',
                (!isOnline || pending.length === 0) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-5 h-5', syncing && 'animate-spin')} />
              {syncing ? '同步中...' : '立即同步'}
              {pending.length > 0 && !syncing && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
                  {pending.length}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="industrial-card p-3">
              <div className="w-9 h-9 rounded-lg bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center mb-2">
                <FileText className="w-4.5 h-4.5 text-brand-orange" />
              </div>
              <div className="font-bold text-2xl text-white font-mono">{pendingWorkOrdersCount}</div>
              <div className="text-[10px] text-brand-gray mt-0.5">待同步工单</div>
            </div>
            <div className="industrial-card p-3">
              <div className="w-9 h-9 rounded-lg bg-status-info/15 border border-status-info/30 flex items-center justify-center mb-2">
                <ImageIcon className="w-4.5 h-4.5 text-status-info" />
              </div>
              <div className="font-bold text-2xl text-white font-mono">{pendingPhotosCount}</div>
              <div className="text-[10px] text-brand-gray mt-0.5">待同步照片</div>
            </div>
            <div className="industrial-card p-3">
              <div className="w-9 h-9 rounded-lg bg-status-warning/15 border border-status-warning/30 flex items-center justify-center mb-2">
                <HardDrive className="w-4.5 h-4.5 text-status-warning" />
              </div>
              <div className="font-bold text-white font-mono text-lg">
                {storageSize >= 1024 * 1024
                  ? (storageSize / (1024 * 1024)).toFixed(1) + 'M'
                  : storageSize >= 1024
                  ? (storageSize / 1024).toFixed(0) + 'K'
                  : storageSize + 'B'}
              </div>
              <div className="text-[10px] text-brand-gray mt-0.5">占用空间</div>
            </div>
          </div>

          <div className="industrial-card overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-orange" />
                <span className="font-semibold text-white text-sm">待同步工单</span>
                <span className="px-1.5 py-0.5 rounded bg-brand-orange/20 text-brand-orange text-[10px] font-bold">
                  {pending.length}
                </span>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center tactile"
              >
                <RefreshCw className={cn('w-3.5 h-3.5 text-brand-gray', loading && 'animate-spin')} />
              </button>
            </div>

            {loading && pending.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-brand-gray/50 mx-auto mb-2 animate-spin" />
                <div className="text-xs text-brand-gray">加载中...</div>
              </div>
            ) : pending.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-status-safe/10 border border-status-safe/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-status-safe" />
                </div>
                <div className="text-white/70 font-medium text-sm">全部已同步</div>
                <div className="text-xs text-brand-gray mt-1">暂无待同步数据</div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {pending.map(item => {
                  const wo = item.workOrder;
                  const device = wo.device;
                  const failed = wo.sync_status === 'failed';
                  return (
                    <div key={wo.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {device && <DeviceIcon type={device.type} size="sm" color={failed ? 'orange' : 'blue'} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="font-mono text-sm font-bold text-white">
                              #{wo.id.slice(-6).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {failed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-status-danger/15 border border-status-danger/30 text-status-danger">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  失败
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning/15 border border-status-warning/30 text-status-warning">
                                  <Clock className="w-2.5 h-2.5" />
                                  待同步
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-white/70 truncate mb-1.5">
                            {device?.device_no} · {device?.model}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-brand-gray">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {item.materialCount} 物料
                            </span>
                            <span className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {item.photoCount} 照片
                            </span>
                            <span className="flex items-center gap-1">
                              <HardDrive className="w-3 h-3" />
                              {formatBytes(item.sizeBytes)}
                            </span>
                          </div>

                          {failed && (
                            <div className="mt-2 rounded-md bg-status-danger/10 border border-status-danger/20 px-2.5 py-1.5">
                              <div className="text-[10px] text-status-danger flex items-start gap-1.5">
                                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>网络请求超时，请检查网络后重试</span>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => syncOne(wo.id)}
                              disabled={!isOnline}
                              className={cn(
                                'flex-1 btn-industrial min-h-[36px] text-xs py-1.5',
                                isOnline
                                  ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange hover:bg-brand-orange/25'
                                  : 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              单独同步
                            </button>
                            <button
                              onClick={() => navigate(`/tech/workorder/${wo.id}`)}
                              className="btn-industrial min-h-[36px] text-xs py-1.5 bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                            >
                              查看
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="industrial-card overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-orange" />
              <span className="font-semibold text-white text-sm">离线存储管理</span>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/70">本地存储使用</span>
                  <span className="text-xs font-mono text-brand-orange font-bold">
                    {formatBytes(storageSize)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-orange to-status-warning rounded-full"
                    style={{ width: `${Math.min(100, (storageSize / (50 * 1024 * 1024)) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-brand-gray">
                  <span>0</span>
                  <span>限制 50 MB</span>
                </div>
              </div>

              <button
                onClick={() => setConfirmClear(true)}
                className="w-full btn-industrial min-h-[44px] bg-status-danger/10 border-status-danger/30 text-status-danger hover:bg-status-danger/20"
              >
                <Trash2 className="w-4 h-4" />
                清除所有离线缓存
              </button>
            </div>
          </div>

          <div className="industrial-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Database className="w-4 h-4 text-status-info" />
              <span className="font-semibold text-white text-sm">系统状态</span>
            </div>
            <div className="divide-y divide-white/5">
              <div className="px-4 py-3 flex items-center justify-between min-h-[48px]">
                <div>
                  <div className="text-sm text-white/80">Service Worker</div>
                  <div className="text-[10px] text-brand-gray mt-0.5">PWA 离线缓存支持</div>
                </div>
                <StatusBadge status={swStatus.active ? '运行中' : '离线'} />
              </div>
              <div className="px-4 py-3 flex items-center justify-between min-h-[48px]">
                <div>
                  <div className="text-sm text-white/80">缓存资源数量</div>
                  <div className="text-[10px] text-brand-gray mt-0.5">已预加载的静态资源</div>
                </div>
                <div className="font-mono font-bold text-brand-orange text-sm">
                  {swStatus.count}
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between min-h-[48px]">
                <div>
                  <div className="text-sm text-white/80">IndexedDB</div>
                  <div className="text-[10px] text-brand-gray mt-0.5">结构化数据存储</div>
                </div>
                <StatusBadge status="运行中" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between min-h-[48px]">
                <div>
                  <div className="text-sm text-white/80">数据库引擎</div>
                  <div className="text-[10px] text-brand-gray mt-0.5">Dexie.js</div>
                </div>
                <div className="font-mono text-xs text-white/60">v3.x</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-safe-bottom" />
    </div>
  );
}
