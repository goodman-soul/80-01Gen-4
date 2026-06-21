import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Minus,
  Trash2,
  Camera,
  X,
  Search,
  ChevronDown,
  Check,
  Save,
  Cloud,
  CloudOff,
  HardDriveUpload,
  FileText,
  Gauge,
  AlertTriangle,
} from 'lucide-react';
import DeviceIcon from '@/components/DeviceIcon';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { saveWorkOrderDraft, savePhoto } from '@/db';
import { COMMON_PARTS } from '@/data/config';
import { cn } from '@/lib/utils';
import type { MaterialItem, PhotoAttachment, WorkOrder } from '@/types';

type Step = 0 | 1 | 2 | 3;
type PhotoCategory = 'before' | 'during' | 'after' | 'gauge';

const STEP_LABELS = ['接单', '到达现场', '作业记录', '提交验收'];
const QUICK_TAGS = ['更换机油', '清洗滤芯', '液压油检查', '紧固螺丝', '其他'];
const QUICK_DOWNTIMES = [
  { label: '30分钟', mins: 30 },
  { label: '1小时', mins: 60 },
  { label: '2小时', mins: 120 },
  { label: '4小时', mins: 240 },
];

const PHOTO_CATEGORIES: { key: PhotoCategory; label: string }[] = [
  { key: 'before', label: '作业前' },
  { key: 'during', label: '作业中' },
  { key: 'after', label: '作业后' },
  { key: 'gauge', label: '仪表读数' },
];

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function toISOLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtMoney(n: number): string {
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function TechWorkOrder() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { isOnline } = useNetworkStatus();
  const workOrders = useAppStore(s => s.workOrders);
  const addOrUpdateWorkOrder = useAppStore(s => s.addOrUpdateWorkOrder);
  const incrementPendingSync = useAppStore(s => s.incrementPendingSync);

  const wo: WorkOrder | undefined = workOrders.find(w => w.id === id);

  const [step, setStep] = useState<Step>(
    !wo ? 0 :
    !wo.arrived_at ? 1 :
    wo.status === '待验收' || wo.status === '已完成' ? 3 : 2
  );
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'pending'>('saved');
  const [toast, setToast] = useState<string | null>(null);

  const [downtimeHours, setDowntimeHours] = useState(1);
  const [downtimeMinutes, setDowntimeMinutes] = useState(0);
  const [downtimeStart, setDowntimeStart] = useState(toISOLocal(new Date(Date.now() - 3600_000)));

  const [materials, setMaterials] = useState<MaterialItem[]>(
    wo?.materials ?? []
  );
  const [partSearchOpen, setPartSearchOpen] = useState<string | null>(null);
  const [partSearchQuery, setPartSearchQuery] = useState('');

  const [photosByCat, setPhotosByCat] = useState<Record<PhotoCategory, PhotoAttachment[]>>(() => {
    const base: Record<PhotoCategory, PhotoAttachment[]> = { before: [], during: [], after: [], gauge: [] };
    (wo?.photos ?? []).forEach(p => {
      const cat = p.category === 'before' || p.category === 'during' || p.category === 'after'
        ? p.category
        : 'gauge';
      base[cat].push(p);
    });
    return base;
  });
  const [photoCat, setPhotoCat] = useState<PhotoCategory>('before');
  const [previewPhoto, setPreviewPhoto] = useState<PhotoAttachment | null>(null);

  const [note, setNote] = useState<string>(wo?.maintenance_note ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadCat = useRef<PhotoCategory>('before');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const device = wo?.device;
  const totalAmount = useMemo(() => {
    return materials.reduce((sum, m) => sum + (m.unit_price * m.quantity), 0);
  }, [materials]);

  const totalDowntimeMins = downtimeHours * 60 + downtimeMinutes;

  const showToast = (m: string) => setToast(m);

  const persistDraft = async (silent = false) => {
    if (!wo) return;
    if (!silent) setSaveState('saving');
    try {
      const allPhotos = Object.values(photosByCat).flat();
      const updated: WorkOrder = {
        ...wo,
        downtime_minutes: totalDowntimeMins,
        maintenance_note: note || null,
        materials,
        photos: allPhotos,
        sync_status: 'pending',
      };
      await saveWorkOrderDraft(updated);
      addOrUpdateWorkOrder(updated);
      if (!silent) {
        setSaveState('pending');
        incrementPendingSync();
        showToast('已暂存到本地');
      }
    } catch (e) {
      console.error(e);
      if (!silent) showToast('保存失败');
    }
  };

  const handleArrive = async () => {
    if (!wo) return;
    const updated: WorkOrder = {
      ...wo,
      status: '进行中',
      arrived_at: new Date().toISOString(),
      sync_status: 'pending',
    };
    await saveWorkOrderDraft(updated);
    addOrUpdateWorkOrder(updated);
    setStep(2);
    showToast('已确认到达现场');
  };

  const handleSubmit = async () => {
    if (!wo) return;
    setSaveState('saving');
    try {
      const allPhotos = Object.values(photosByCat).flat();
      const updated: WorkOrder = {
        ...wo,
        status: '待验收',
        downtime_minutes: totalDowntimeMins,
        maintenance_note: note || null,
        completed_at: new Date().toISOString(),
        materials,
        photos: allPhotos,
        sync_status: 'pending',
      };
      await saveWorkOrderDraft(updated);
      addOrUpdateWorkOrder(updated);
      setSaveState('pending');
      incrementPendingSync();
      setStep(3);
      showToast('已提交验收');
    } catch (e) {
      console.error(e);
      showToast('提交失败');
    }
  };

  const applyDowntimeQuick = (mins: number) => {
    setDowntimeHours(Math.floor(mins / 60));
    setDowntimeMinutes(mins % 60);
  };

  const addMaterial = (part?: typeof COMMON_PARTS[number]) => {
    const item: MaterialItem = {
      id: genId(),
      work_order_id: id,
      part_name: part?.name ?? '',
      part_no: part?.part_no ?? '',
      quantity: 1,
      unit_price: part?.price ?? 0,
    };
    setMaterials(prev => [...prev, item]);
    setPartSearchOpen(null);
    setPartSearchQuery('');
  };

  const updateMaterial = (mid: string, patch: Partial<MaterialItem>) => {
    setMaterials(prev => prev.map(m => m.id === mid ? { ...m, ...patch } : m));
  };

  const removeMaterial = (mid: string) => {
    setMaterials(prev => prev.filter(m => m.id !== mid));
  };

  const selectCommonPart = (mid: string, part: typeof COMMON_PARTS[number]) => {
    updateMaterial(mid, { part_name: part.name, part_no: part.part_no, unit_price: part.price });
    setPartSearchOpen(null);
    setPartSearchQuery('');
  };

  const triggerPhotoUpload = (cat: PhotoCategory) => {
    currentUploadCat.current = cat;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const cat = currentUploadCat.current;
    const readPromises: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      readPromises.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(f);
      }));
    }
    try {
      const urls = await Promise.all(readPromises);
      const newPhotos: PhotoAttachment[] = urls.map(data_url => {
        const p: PhotoAttachment = {
          id: genId(),
          work_order_id: id,
          data_url,
          category: cat === 'gauge' ? 'after' : cat,
          taken_at: new Date().toISOString(),
        };
        savePhoto(p).catch(console.error);
        return p;
      });
      setPhotosByCat(prev => ({
        ...prev,
        [cat]: [...prev[cat], ...newPhotos].slice(0, 9),
      }));
    } catch (err) {
      console.error(err);
      showToast('照片读取失败');
    } finally {
      e.target.value = '';
    }
  };

  const removePhoto = (cat: PhotoCategory, pid: string) => {
    setPhotosByCat(prev => ({
      ...prev,
      [cat]: prev[cat].filter(p => p.id !== pid),
    }));
  };

  const insertTag = (tag: string) => {
    setNote(prev => (prev ? prev + '\n' : '') + tag);
  };

  const filteredParts = useMemo(() => {
    const q = partSearchQuery.trim().toLowerCase();
    if (!q) return COMMON_PARTS;
    return COMMON_PARTS.filter(p =>
      p.name.toLowerCase().includes(q) || p.part_no.toLowerCase().includes(q)
    );
  }, [partSearchQuery]);

  if (!wo) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-brand-steel text-white p-6">
        <AlertTriangle className="w-16 h-16 text-status-warning mb-4" />
        <div className="text-xl font-bold mb-2">工单不存在</div>
        <button onClick={() => navigate(-1)} className="btn-industrial-primary mt-4">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
      </div>
    );
  }

  const SaveIndicator = () => {
    if (saveState === 'saving') {
      return (
        <div className="flex items-center gap-1.5 text-status-warning text-xs">
          <Save className="w-3.5 h-3.5 animate-pulse" />
          <span>保存中...</span>
        </div>
      );
    }
    if (saveState === 'pending' || !isOnline) {
      return (
        <div className="flex items-center gap-1.5 text-brand-orange text-xs">
          <HardDriveUpload className="w-3.5 h-3.5" />
          <span>{isOnline ? '已保存本地/待同步' : '已保存到本地'}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-status-safe text-xs">
        <Cloud className="w-3.5 h-3.5" />
        <span>已同步</span>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col bg-brand-steel max-w-[480px] mx-auto relative overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewPhoto.data_url}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-medium shadow-glow-orange animate-slide-up">
          {toast}
        </div>
      )}

      <div className="shrink-0 px-4 pt-3 pb-2 bg-brand-steel/95 backdrop-blur border-b border-white/5 z-10">
        <div className="flex items-center gap-3 min-h-[48px]">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center tactile"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white truncate">
              工单 #{wo.id.slice(-6).toUpperCase()}
            </div>
            <div className="mt-0.5"><SaveIndicator /></div>
          </div>
          <StatusBadge status={wo.status} />
        </div>

        <div className="flex items-center gap-0.5 mt-4 px-1">
          {STEP_LABELS.map((label, idx) => {
            const done = step > idx;
            const active = step === idx;
            return (
              <div key={label} className="flex-1 flex items-center last:flex-initial">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                    done
                      ? 'bg-status-safe border-status-safe text-white'
                      : active
                      ? 'bg-brand-orange border-brand-orange text-white shadow-glow-orange'
                      : 'bg-transparent border-white/15 text-brand-gray'
                  )}>
                    {done ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className={cn(
                    'text-[10px] font-medium whitespace-nowrap',
                    done || active ? 'text-white/80' : 'text-brand-gray'
                  )}>
                    {label}
                  </div>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1 -mt-4',
                    done ? 'bg-status-safe' : 'bg-white/10'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-40">
        {step < 2 && (
          <div className="p-4 space-y-4">
            <div className="industrial-card p-4">
              <div className="section-header !mb-3 !pb-2">
                <h3 className="section-title !text-base">设备详情</h3>
              </div>
              {device && (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <DeviceIcon type={device.type} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white">
                        {device.device_no} · {device.model}
                      </div>
                      <div className="text-xs text-brand-gray mt-0.5">{device.type}</div>
                    </div>
                    <StatusBadge status={device.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-1.5 text-brand-gray text-[10px] uppercase tracking-wider mb-1">
                        <Gauge className="w-3 h-3" />
                        运行小时
                      </div>
                      <div className="font-mono font-bold text-brand-orange text-lg">
                        {device.current_hours.toLocaleString()}h
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-1.5 text-brand-gray text-[10px] uppercase tracking-wider mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        故障码
                      </div>
                      <div className={cn(
                        'font-mono font-bold text-sm',
                        device.fault_code ? 'text-status-danger' : 'text-status-safe'
                      )}>
                        {device.fault_code ?? '无'}
                      </div>
                      {device.fault_name && (
                        <div className="text-[10px] text-brand-gray mt-0.5 truncate">
                          {device.fault_name}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="industrial-card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-orange" />
                <h3 className="font-semibold text-white text-sm">位置导航</h3>
              </div>
              <div className="map-grid-bg h-44 relative">
                <div className="absolute inset-0">
                  <svg className="w-full h-full">
                    <defs>
                      <pattern id="dash-pat" width="8" height="8" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="#FF6B1A" fillOpacity="0.6" />
                      </pattern>
                    </defs>
                    <line
                      x1="30%" y1="70%" x2="65%" y2="35%"
                      stroke="url(#dash-pat)" strokeWidth="4" strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="absolute" style={{ top: '65%', left: '26%' }}>
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-status-info border-2 border-white shadow-glow-green animate-pulse" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-status-info/90 text-white px-1.5 py-0.5 rounded">
                      我
                    </div>
                  </div>
                </div>
                <div className="absolute" style={{ top: '30%', left: '62%' }}>
                  <div className="relative">
                    <div className="w-5 h-5 rounded-full bg-brand-orange border-2 border-white shadow-glow-orange" />
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap bg-brand-orange/95 text-white px-1.5 py-0.5 rounded">
                      设备
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="industrial-card px-3 py-2 text-xs backdrop-blur">
                    <div className="flex items-center gap-1.5 text-white/80">
                      <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                      <span className="truncate">{device?.location_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {step === 1 && (
              <button
                onClick={handleArrive}
                className="w-full btn-industrial-primary min-h-[56px] text-lg font-bold"
              >
                <CheckCircle2 className="w-5 h-5" />
                确认到达现场
              </button>
            )}
          </div>
        )}

        {step >= 2 && step < 3 && (
          <div className="p-4 space-y-5">
            <div className="industrial-card p-4">
              <div className="section-header !mb-4 !pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-orange" />
                  <h3 className="section-title !text-base">停机时长</h3>
                </div>
                <div className="font-mono text-brand-orange font-bold text-sm">
                  共 {totalDowntimeMins} 分钟
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-xs text-brand-gray mb-1.5">小时</div>
                  <div className="flex items-center rounded-lg border border-white/10 bg-brand-steel-lighter overflow-hidden">
                    <button
                      onClick={() => setDowntimeHours(h => Math.max(0, h - 1))}
                      className="w-11 h-11 flex items-center justify-center text-white/70 hover:bg-white/5 tactile shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center font-mono font-bold text-xl text-white">
                      {downtimeHours}
                    </div>
                    <button
                      onClick={() => setDowntimeHours(h => h + 1)}
                      className="w-11 h-11 flex items-center justify-center text-white/70 hover:bg-white/5 tactile shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-gray mb-1.5">分钟</div>
                  <div className="flex items-center rounded-lg border border-white/10 bg-brand-steel-lighter overflow-hidden">
                    <button
                      onClick={() => setDowntimeMinutes(m => Math.max(0, m - 15))}
                      className="w-11 h-11 flex items-center justify-center text-white/70 hover:bg-white/5 tactile shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center font-mono font-bold text-xl text-white">
                      {downtimeMinutes}
                    </div>
                    <button
                      onClick={() => setDowntimeMinutes(m => Math.min(45, m + 15))}
                      className="w-11 h-11 flex items-center justify-center text-white/70 hover:bg-white/5 tactile shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_DOWNTIMES.map(q => (
                  <button
                    key={q.label}
                    onClick={() => applyDowntimeQuick(q.mins)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium border transition-all min-h-[36px] tactile',
                      totalDowntimeMins === q.mins
                        ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange'
                        : 'bg-white/5 border-white/10 text-white/70 hover:border-brand-orange/30'
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-brand-gray mb-1.5 block">停机开始时间</label>
                <input
                  type="datetime-local"
                  value={downtimeStart}
                  onChange={e => setDowntimeStart(e.target.value)}
                  className="input-industrial min-h-[44px]"
                />
              </div>
            </div>

            <div className="industrial-card p-4">
              <div className="section-header !mb-4 !pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-orange" />
                  <h3 className="section-title !text-base">用料清单</h3>
                </div>
                <div className="font-mono text-brand-orange font-bold">
                  {fmtMoney(totalAmount)}
                </div>
              </div>

              {materials.length === 0 ? (
                <button
                  onClick={() => addMaterial()}
                  className="w-full border-2 border-dashed border-white/15 rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-brand-gray hover:border-brand-orange/40 hover:text-brand-orange transition-all tactile min-h-[96px]"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">添加备件</span>
                </button>
              ) : (
                <div className="space-y-3">
                  {materials.map(m => (
                    <div
                      key={m.id}
                      className="relative rounded-lg bg-white/5 border border-white/10 p-3"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <button
                          onClick={() => removeMaterial(m.id)}
                          className="w-8 h-8 rounded-md bg-status-danger/10 text-status-danger flex items-center justify-center hover:bg-status-danger/20 tactile shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex-1 relative">
                          <button
                            onClick={() => setPartSearchOpen(partSearchOpen === m.id ? null : m.id)}
                            className="w-full text-left px-3 py-2 rounded-md bg-brand-steel-lighter border border-white/10 text-sm flex items-center justify-between group hover:border-brand-orange/30 transition-all min-h-[40px]"
                          >
                            <span className={cn('truncate pr-2', !m.part_name && 'text-brand-gray')}>
                              {m.part_name || '选择备件...'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-brand-gray shrink-0" />
                          </button>
                          {partSearchOpen === m.id && (
                            <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-brand-steel-light shadow-industrial-lg overflow-hidden">
                              <div className="p-2 border-b border-white/5">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                                  <input
                                    autoFocus
                                    value={partSearchQuery}
                                    onChange={e => setPartSearchQuery(e.target.value)}
                                    placeholder="搜索备件名称/编号"
                                    className="w-full pl-9 pr-3 py-2 rounded-md bg-brand-steel-lighter border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-brand-orange/50"
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredParts.length === 0 ? (
                                  <div className="p-4 text-center text-xs text-brand-gray">无匹配备件</div>
                                ) : (
                                  filteredParts.map(p => (
                                    <button
                                      key={p.part_no}
                                      onClick={() => selectCommonPart(m.id, p)}
                                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 tactile flex items-center justify-between gap-2 border-b border-white/5 last:border-0"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-sm text-white truncate">{p.name}</div>
                                        <div className="text-[10px] text-brand-gray font-mono">{p.part_no}</div>
                                      </div>
                                      <div className="text-brand-orange text-xs font-bold shrink-0">
                                        {fmtMoney(p.price)}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                          {m.part_no && (
                            <div className="mt-1 text-[10px] text-brand-gray font-mono px-1">
                              {m.part_no}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                        <div>
                          <div className="text-[10px] text-brand-gray mb-1">数量</div>
                          <div className="flex items-center rounded-md border border-white/10 bg-brand-steel-lighter overflow-hidden">
                            <button
                              onClick={() => updateMaterial(m.id, { quantity: Math.max(1, m.quantity - 1) })}
                              className="w-8 h-8 flex items-center justify-center text-white/70 tactile"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-8 text-center font-mono font-bold text-sm text-white">
                              {m.quantity}
                            </div>
                            <button
                              onClick={() => updateMaterial(m.id, { quantity: m.quantity + 1 })}
                              className="w-8 h-8 flex items-center justify-center text-white/70 tactile"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-brand-gray text-sm font-mono">×</div>
                        <div>
                          <div className="text-[10px] text-brand-gray mb-1">单价</div>
                          <div className="rounded-md border border-white/10 bg-brand-steel-lighter px-2 py-1.5">
                            <input
                              type="number"
                              value={m.unit_price}
                              onChange={e => updateMaterial(m.id, { unit_price: Number(e.target.value) || 0 })}
                              className="w-full bg-transparent outline-none text-brand-orange font-mono font-bold text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-brand-gray mb-1">小计</div>
                          <div className="font-mono font-bold text-brand-orange text-sm">
                            {fmtMoney(m.quantity * m.unit_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => addMaterial()}
                    className="w-full btn-industrial-secondary min-h-[44px] border-dashed"
                  >
                    <Plus className="w-4 h-4" />
                    添加备件
                  </button>
                </div>
              )}

              {materials.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="text-sm text-white/70">合计金额</div>
                  <div className="font-mono font-bold text-brand-orange text-xl">
                    {fmtMoney(totalAmount)}
                  </div>
                </div>
              )}
            </div>

            <div className="industrial-card p-4">
              <div className="section-header !mb-4 !pb-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-brand-orange" />
                  <h3 className="section-title !text-base">照片上传</h3>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-lg mb-4">
                {PHOTO_CATEGORIES.map(c => {
                  const active = photoCat === c.key;
                  const count = photosByCat[c.key].length;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setPhotoCat(c.key)}
                      className={cn(
                        'py-2 rounded-md text-xs font-medium transition-all tactile min-h-[38px] relative',
                        active
                          ? 'bg-brand-orange text-white shadow-glow-orange'
                          : 'text-brand-gray hover:text-white/80'
                      )}
                    >
                      {c.label}
                      {count > 0 && (
                        <span className={cn(
                          'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                          active ? 'bg-white text-brand-orange' : 'bg-brand-orange text-white'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {photosByCat[photoCat].map(p => (
                  <div
                    key={p.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
                  >
                    <img
                      src={p.data_url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewPhoto(p)}
                    />
                    <button
                      onClick={() => removePhoto(photoCat, p.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-status-danger/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, Math.min(3, 9 - photosByCat[photoCat].length)) }).map((_, i) => (
                  <button
                    key={`ph-${photoCat}-${i}`}
                    onClick={() => triggerPhotoUpload(photoCat)}
                    disabled={photosByCat[photoCat].length >= 9}
                    className="aspect-square rounded-lg border-2 border-dashed border-white/15 bg-white/5 hover:border-brand-orange/40 hover:bg-brand-orange/5 text-brand-gray hover:text-brand-orange transition-all tactile flex flex-col items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px]">拍照</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => triggerPhotoUpload(photoCat)}
                className="w-full btn-industrial-primary min-h-[44px]"
              >
                <Camera className="w-4 h-4" />
                拍照 / 从相册选择
              </button>
              <div className="text-[11px] text-brand-gray text-center mt-2">
                每类最多 9 张照片 · 共 {Object.values(photosByCat).flat().length} 张
              </div>
            </div>

            <div className="industrial-card p-4">
              <div className="section-header !mb-4 !pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-orange" />
                  <h3 className="section-title !text-base">保养说明</h3>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {QUICK_TAGS.map(t => (
                  <button
                    key={t}
                    onClick={() => insertTag(t)}
                    className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/70 hover:border-brand-orange/30 hover:text-brand-orange transition-all tactile min-h-[32px]"
                  >
                    + {t}
                  </button>
                ))}
              </div>

              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={5}
                placeholder="请详细填写保养内容、故障原因、处理方法等..."
                className="input-industrial resize-none"
              />
              <div className="text-[11px] text-brand-gray text-right mt-1.5">
                {note.length} 字
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-4">
            <div className="industrial-card p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-status-safe/15 border-4 border-status-safe/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-status-safe" />
              </div>
              <div className="text-xl font-bold text-white mb-1">已提交验收</div>
              <div className="text-sm text-brand-gray">等待客户确认评价</div>
              <div className="mt-5 pt-5 border-t border-white/5 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-gray">工单编号</span>
                  <span className="font-mono text-white">#{wo.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">停机时长</span>
                  <span className="text-white">{totalDowntimeMins} 分钟</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">用料金额</span>
                  <span className="font-mono text-brand-orange">{fmtMoney(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">照片数量</span>
                  <span className="text-white">{Object.values(photosByCat).flat().length} 张</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-gray">同步状态</span>
                  <StatusBadge status={isOnline && wo.sync_status === 'synced' ? '同步成功' : (wo.sync_status === 'failed' ? '同步失败' : '待同步')} />
                </div>
              </div>
              <button
                onClick={() => navigate('/tech/home')}
                className="w-full btn-industrial-primary min-h-[48px] mt-6"
              >
                返回工作台
              </button>
            </div>
          </div>
        )}
      </div>

      {!isOnline && (
        <div className="absolute left-0 right-0 bottom-0 z-20 px-4 pb-[88px]">
          <div className="rounded-lg bg-status-danger/15 border border-status-danger/30 px-3 py-2 flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-status-danger shrink-0" />
            <div className="text-xs text-status-danger flex-1">
              当前离线，数据暂存本地，恢复网络后自动同步
            </div>
          </div>
        </div>
      )}

      {step < 3 && (
        <div className="absolute left-0 right-0 bottom-0 z-10 px-4 pt-3 pb-4 bg-brand-steel/95 backdrop-blur border-t border-white/5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => persistDraft()}
              className="btn-industrial-secondary min-h-[48px]"
            >
              <Save className="w-4 h-4" />
              暂存草稿
            </button>
            <button
              onClick={step < 2 ? handleArrive : handleSubmit}
              className="btn-industrial-primary min-h-[48px] font-bold"
            >
              {step < 2 ? (
                <>
                  <MapPin className="w-4 h-4" />
                  确认到达
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  提交验收
                </>
              )}
            </button>
          </div>
          <div className="mobile-safe-bottom" />
        </div>
      )}
    </div>
  );
}
