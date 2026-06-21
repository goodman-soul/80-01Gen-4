import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Clock,
  Star,
  StarHalf,
  StarOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
  MessageSquare,
  Headphones,
  Shield,
  Award,
  Navigation,
  CalendarDays,
  FileText,
  ArrowRight,
  Check,
  X,
  Camera,
  Home,
} from 'lucide-react';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import DeviceIcon from '@/components/DeviceIcon';
import { cn } from '@/lib/utils';
import type { WorkOrder, Device, Technician, MaterialItem, PhotoAttachment } from '@/types';

const MAINTENANCE_ITEMS = [
  '机油及滤芯更换',
  '柴油滤芯更换',
  '空气滤芯清洁/更换',
  '液压系统检查',
  '紧固件扭矩检查',
  '故障码排查修复',
];

const STEPS = ['派单', '到达现场', '作业完成', '客户验收', '已完成'];

const PLACEHOLDER_PHOTOS = {
  before:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g1' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232F3440'/><stop offset='1' stop-color='%231A1D23'/></linearGradient></defs><rect width='400' height='300' fill='url(%23g1)'/><g fill='none' stroke='%23FF6B1A' stroke-width='2' opacity='0.6'><rect x='50' y='80' width='130' height='80' rx='4'/><rect x='200' y='100' width='150' height='60' rx='4'/><circle cx='120' cy='220' r='25'/><circle cx='280' cy='220' r='25'/></g><text x='200' y='270' text-anchor='middle' fill='%238A8F98' font-size='14' font-family='monospace'>BEFORE · 作业前</text></svg>`
    ),
  during:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g2' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232F3440'/><stop offset='1' stop-color='%231A1D23'/></linearGradient></defs><rect width='400' height='300' fill='url(%23g2)'/><g fill='none' stroke='%233B82F6' stroke-width='2' opacity='0.7'><line x1='80' y1='60' x2='80' y2='240'/><line x1='80' y1='60' x2='320' y2='60'/><line x1='320' y1='60' x2='320' y2='240'/><line x1='80' y1='240' x2='320' y2='240'/><circle cx='200' cy='150' r='40' stroke-dasharray='8 4'/></g><text x='200' y='275' text-anchor='middle' fill='%238A8F98' font-size='14' font-family='monospace'>DURING · 作业中</text></svg>`
    ),
  after:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g3' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%232F3440'/><stop offset='1' stop-color='%231A1D23'/></linearGradient></defs><rect width='400' height='300' fill='url(%23g3)'/><g fill='none' stroke='%2310B981' stroke-width='2.5' opacity='0.7'><path d='M100 150 L170 200 L300 100' stroke-linecap='round' stroke-linejoin='round'/><rect x='60' y='60' width='280' height='180' rx='6'/></g><text x='200' y='275' text-anchor='middle' fill='%238A8F98' font-size='14' font-family='monospace'>AFTER · 作业后</text></svg>`
    ),
  meter:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g4' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%232F3440'/><stop offset='1' stop-color='%2314161A'/></linearGradient></defs><rect width='400' height='300' fill='url(%23g4)'/><g stroke='%23FF6B1A' fill='none' opacity='0.7'><rect x='80' y='80' width='240' height='140' rx='8' stroke-width='2'/><circle cx='200' cy='150' r='50' stroke-width='1.5'/><path d='M200 150 L200 115' stroke-width='3' stroke-linecap='round'/></g><text x='200' y='165' text-anchor='middle' fill='%23FF6B1A' font-size='18' font-family='monospace' font-weight='bold'>04,852 h</text><text x='200' y='260' text-anchor='middle' fill='%238A8F98' font-size='12' font-family='monospace'>METER · 仪表读数</text></svg>`
    ),
};

const PHOTO_CATEGORIES: Array<{ key: keyof typeof PLACEHOLDER_PHOTOS; label: string }> = [
  { key: 'before', label: '作业前' },
  { key: 'during', label: '作业中' },
  { key: 'after', label: '作业后' },
  { key: 'meter', label: '仪表读数' },
];

const ISSUE_TYPES = ['保养项目遗漏', '零件质量问题', '设备仍有故障', '现场清洁不到位', '其他问题'];

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateTime(iso: string | null): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

function formatDuration(minutes: number | null): { h: number; m: number } {
  if (!minutes) return { h: 0, m: 0 };
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

function formatCurrency(num: number): string {
  return num.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 });
}

function generateWorkOrderNo(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `WO${String(20260000 + (hash % 9999)).padStart(8, '0')}`;
}

function generateReportNo(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return `RPT-${String(2026060000 + (hash % 9999)).padStart(10, '0')}`;
}

interface RatingStarsProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  onHover?: (v: number | null) => void;
}

function RatingStars({ rating, size = 18, interactive = false, onChange, onHover }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? rating;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        let Icon: typeof Star | typeof StarHalf | typeof StarOff = Star;
        let filled = false;
        if (displayValue >= i) {
          filled = true;
        } else if (displayValue >= i - 0.5) {
          Icon = StarHalf;
        } else {
          Icon = StarOff;
        }
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i)}
            onMouseEnter={() => {
              if (interactive) {
                setHoverValue(i);
                onHover?.(i);
              }
            }}
            onMouseLeave={() => {
              if (interactive) {
                setHoverValue(null);
                onHover?.(null);
              }
            }}
            className={cn(
              'transition-all duration-150',
              interactive && 'cursor-pointer hover:scale-125 active:scale-110',
              !interactive && 'cursor-default'
            )}
            style={{ width: size, height: size }}
          >
            <Icon
              size={size}
              className={cn(
                filled ? 'text-brand-orange fill-brand-orange/30' : 'text-white/20',
                Icon === StarHalf && 'fill-brand-orange/60'
              )}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
}

interface TimelineItem {
  time: string;
  label: string;
  color: string;
}

export default function ClientConfirm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const workOrders = useAppStore((s) => s.workOrders);
  const devices = useAppStore((s) => s.devices);
  const technicians = useAppStore((s) => s.technicians);
  const updateWorkOrderStatus = useAppStore((s) => s.updateWorkOrderStatus);

  const [photoCategory, setPhotoCategory] = useState<keyof typeof PLACEHOLDER_PHOTOS>('before');
  const [photoIndex, setPhotoIndex] = useState(0);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnIssueType, setReturnIssueType] = useState(ISSUE_TYPES[0]);
  const [returnDescription, setReturnDescription] = useState('');
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);

  const [submitted, setSubmitted] = useState<'completed' | 'returned' | null>(null);

  const workOrder = useMemo<WorkOrder | null>(() => {
    if (!id) return null;
    if (id === 'demo') {
      return workOrders.find((wo) => wo.status === '待验收') || workOrders[0] || null;
    }
    return workOrders.find((wo) => wo.id === id) || null;
  }, [id, workOrders]);

  const device: Device | null = useMemo(() => {
    if (!workOrder) return null;
    return workOrder.device || devices.find((d) => d.id === workOrder.device_id) || null;
  }, [workOrder, devices]);

  const technician: Technician | null = useMemo(() => {
    if (!workOrder) return null;
    return workOrder.technician || technicians.find((t) => t.id === workOrder.technician_id) || null;
  }, [workOrder, technicians]);

  const materialItems: MaterialItem[] = useMemo(() => {
    if (!workOrder) return [];
    return [
      { id: 'm1', work_order_id: workOrder.id, part_name: '机油滤芯', part_no: 'FLT-OIL-001', quantity: 1, unit_price: 85 },
      { id: 'm2', work_order_id: workOrder.id, part_name: '柴油滤芯', part_no: 'FLT-FUE-004', quantity: 1, unit_price: 95 },
      { id: 'm3', work_order_id: workOrder.id, part_name: '空气滤芯', part_no: 'FLT-AIR-003', quantity: 1, unit_price: 120 },
      { id: 'm4', work_order_id: workOrder.id, part_name: '液压油 20L', part_no: 'OIL-HYD-20L', quantity: 1, unit_price: 580 },
      { id: 'm5', work_order_id: workOrder.id, part_name: '机油 18L', part_no: 'OIL-ENG-18L', quantity: 1, unit_price: 420 },
    ];
  }, [workOrder]);

  const totalCost = useMemo(
    () => materialItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [materialItems]
  );

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!workOrder) return [];
    const items: TimelineItem[] = [];
    if (workOrder.arrived_at) {
      items.push({ time: formatTime(workOrder.arrived_at), label: '到达现场', color: 'bg-status-info' });
    }
    if (workOrder.arrived_at) {
      const start = new Date(workOrder.arrived_at);
      start.setMinutes(start.getMinutes() + 15);
      items.push({ time: formatTime(start.toISOString()), label: '开始作业', color: 'bg-status-warning' });
    }
    if (workOrder.completed_at) {
      const end = new Date(workOrder.completed_at);
      end.setMinutes(end.getMinutes() - 10);
      items.push({ time: formatTime(end.toISOString()), label: '作业完成', color: 'bg-status-safe' });
    }
    if (workOrder.completed_at) {
      items.push({ time: formatTime(workOrder.completed_at), label: '离场时间', color: 'bg-brand-orange' });
    }
    return items;
  }, [workOrder]);

  const workDuration = useMemo(() => {
    if (!workOrder?.arrived_at || !workOrder?.completed_at) return { h: 0, m: 0 };
    const min = Math.round(
      (new Date(workOrder.completed_at).getTime() - new Date(workOrder.arrived_at).getTime()) / 60000
    );
    return formatDuration(min);
  }, [workOrder]);

  const photoSrcs = useMemo(() => {
    const base = PLACEHOLDER_PHOTOS[photoCategory];
    return [base, base, base, base];
  }, [photoCategory]);

  const handleSubmitConfirm = () => {
    setShowRatingModal(true);
  };

  const handleSubmitRating = () => {
    if (workOrder) {
      updateWorkOrderStatus(workOrder.id, '已完成');
    }
    setShowRatingModal(false);
    setSubmitted('completed');
    setTimeout(() => navigate('/'), 3000);
  };

  const handleSubmitReturn = () => {
    if (workOrder) {
      updateWorkOrderStatus(workOrder.id, '已退回');
    }
    setShowReturnForm(false);
    setSubmitted('returned');
    setTimeout(() => navigate('/'), 3000);
  };

  const handleAddReturnPhoto = () => {
    if (returnPhotos.length < 3) {
      setReturnPhotos([...returnPhotos, PLACEHOLDER_PHOTOS.after]);
    }
  };

  if (!workOrder || !device) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-brand-orange" />
          <p className="text-white/70 font-display">工单不存在</p>
        </div>
      </div>
    );
  }

  const workOrderNo = generateWorkOrderNo(workOrder.id);
  const reportNo = generateReportNo(workOrder.id);
  const nextMaintenanceHours = device.last_maintenance_hours + device.maintenance_interval;

  return (
    <div className="min-h-screen bg-brand-steel">
      <div className="sticky top-0 z-40 bg-brand-steel/95 backdrop-blur-md border-b border-white/8">
        <div className="container max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-brand-orange to-amber-600 flex items-center justify-center shadow-glow-orange">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-white tracking-wide">铁甲云维护</div>
              <div className="text-[11px] text-brand-gray">客户验收</div>
            </div>
          </div>
          <button className="btn-industrial-secondary !py-1.5 !px-3 !text-xs gap-1.5">
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">联系客服</span>
            <span className="sm:hidden">客服</span>
          </button>
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-5">
        <div className="mb-6">
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => {
              const stepIndex = 3;
              const isDone = idx < stepIndex;
              const isActive = idx === stepIndex;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                        isDone && 'bg-status-safe border-status-safe text-white shadow-glow-green',
                        isActive && 'bg-brand-orange border-brand-orange text-white shadow-glow-orange scale-110',
                        !isDone && !isActive && 'bg-brand-steel-light border-white/10 text-brand-gray'
                      )}
                    >
                      {isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
                      {isActive && (
                        <span className="absolute inset-0 rounded-full bg-brand-orange animate-ping opacity-40" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1.5 text-[10px] md:text-xs font-medium tracking-wide',
                        isDone && 'text-status-safe',
                        isActive && 'text-brand-orange',
                        !isDone && !isActive && 'text-brand-gray'
                      )}
                    >
                      {step}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-1 rounded-full mb-4',
                        idx < stepIndex ? 'bg-status-safe/60' : 'bg-white/8'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <section className="industrial-card p-5 md:p-6 mb-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-wider mb-2">
                保养验收报告
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-brand-orange/10 border border-brand-orange/30">
                  <FileText className="w-3.5 h-3.5 text-brand-orange" />
                  <span className="font-mono text-sm font-bold text-brand-orange tracking-wider">
                    {workOrderNo}
                  </span>
                </span>
                <StatusBadge status={workOrder.status} />
              </div>
            </div>
          </div>

          <div className="divider-rivet">
            <span />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-status-info/15 border border-status-info/30 flex items-center justify-center shrink-0">
                <Home className="w-4.5 h-4.5 text-status-info" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-brand-gray uppercase tracking-wider mb-0.5">客户名称</div>
                <div className="text-sm font-medium text-white truncate">{workOrder.client_name}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5 text-brand-orange" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-brand-gray uppercase tracking-wider mb-0.5">工地名称</div>
                <div className="text-sm font-medium text-white truncate">{device.location_name}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <div className="w-9 h-9 rounded-lg bg-status-warning/15 border border-status-warning/30 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4.5 h-4.5 text-status-warning" />
              </div>
              <div>
                <div className="text-[11px] text-brand-gray uppercase tracking-wider mb-0.5">作业日期时间</div>
                <div className="text-sm font-medium text-white">
                  {formatDateTime(workOrder.arrived_at)} ~ {formatTime(workOrder.completed_at)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="industrial-card p-5 md:p-6 mb-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-orange rounded" />
              技师信息
            </h2>
          </div>

          <div className="flex items-start gap-4 mb-5">
            <div
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ backgroundColor: technician?.avatar_color || '#6366f1' }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
              <span className="relative font-display text-2xl md:text-3xl font-bold text-white">
                {technician?.name?.charAt(0) || '技'}
              </span>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-status-safe border-2 border-brand-steel-light flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-lg font-bold text-white">{technician?.name || '张师傅'}</h3>
                <RatingStars rating={technician?.rating || 4.8} size={16} />
                <span className="text-xs font-mono text-brand-orange">{technician?.rating?.toFixed(1) || '4.8'}</span>
              </div>
              <a
                href={`tel:${technician?.phone || '13800138000'}`}
                className="inline-flex items-center gap-1.5 text-sm text-status-info hover:text-status-info/80 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="font-mono">{technician?.phone || '138-0013-8000'}</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-white/5 border border-white/8 text-center">
              <div className="text-[10px] text-brand-gray uppercase tracking-wider mb-1">到达</div>
              <div className="font-mono text-sm font-bold text-white">{formatTime(workOrder.arrived_at)}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/8 text-center">
              <div className="text-[10px] text-brand-gray uppercase tracking-wider mb-1">离场</div>
              <div className="font-mono text-sm font-bold text-white">{formatTime(workOrder.completed_at)}</div>
            </div>
            <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-center">
              <div className="text-[10px] text-brand-orange uppercase tracking-wider mb-1">用时</div>
              <div className="font-mono text-sm font-bold text-brand-orange">
                {workDuration.h}h {workDuration.m}m
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="tag-industrial bg-status-safe/10 border-status-safe/30 text-status-safe">
              <Award className="w-3 h-3" /> 持证上岗
            </span>
            <span className="tag-industrial bg-status-info/10 border-status-info/30 text-status-info">
              <Clock className="w-3 h-3" /> 5年经验
            </span>
            <span className="tag-industrial bg-brand-orange/10 border-brand-orange/30 text-brand-orange">
              <Navigation className="w-3 h-3" /> 附近3km
            </span>
          </div>
        </section>

        <section className="industrial-card p-5 md:p-6 mb-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-orange rounded" />
              设备与故障信息
            </h2>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <DeviceIcon type={device.type} size="lg" color="orange" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-brand-orange tracking-wider">
                  {device.device_no}
                </span>
                <StatusBadge status={device.status} />
              </div>
              <div className="font-display text-base font-bold text-white">{device.model}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-white/5 border border-white/8">
            <div className="flex-1 text-center">
              <div className="text-[10px] text-brand-gray uppercase tracking-wider mb-1">作业前小时数</div>
              <div className="font-mono text-lg font-bold text-white">
                {device.last_maintenance_hours.toLocaleString()}
                <span className="text-xs text-brand-gray ml-1">h</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-brand-orange" />
            </div>
            <div className="flex-1 text-center">
              <div className="text-[10px] text-brand-gray uppercase tracking-wider mb-1">作业后小时数</div>
              <div className="font-mono text-lg font-bold text-brand-orange">
                {device.current_hours.toLocaleString()}
                <span className="text-xs text-brand-gray ml-1">h</span>
              </div>
            </div>
          </div>

          {device.fault_code && (
            <div className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/20">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-status-danger shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold text-status-danger">{device.fault_code}</span>
                    <span className="text-xs text-white/70">故障码</span>
                  </div>
                  <div className="text-sm text-white/90">{device.fault_name || '系统检测异常'}</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-brand-gray uppercase tracking-wider mb-2">保养项目清单</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MAINTENANCE_ITEMS.map((item, i) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <div className="w-5 h-5 rounded bg-status-safe/20 border border-status-safe/40 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-status-safe" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-white/85">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="industrial-card p-5 md:p-6 mb-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-orange rounded" />
              停机时长统计
            </h2>
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="text-center">
              <div className="text-[11px] text-brand-gray uppercase tracking-[0.2em] mb-2">总停机时长</div>
              <div className="flex items-end justify-center gap-2 font-display">
                <span className="text-5xl md:text-6xl font-black text-brand-orange count-anim">
                  {workDuration.h}
                </span>
                <span className="text-lg text-brand-gray pb-2.5">小时</span>
                <span className="text-5xl md:text-6xl font-black text-white count-anim" style={{ animationDelay: '0.1s' }}>
                  {String(workDuration.m).padStart(2, '0')}
                </span>
                <span className="text-lg text-brand-gray pb-2.5">分钟</span>
              </div>
            </div>
          </div>

          <div className="relative px-2">
            <div className="absolute top-5 left-2 right-2 h-0.5 bg-white/10 rounded" />
            <div className="absolute top-5 left-2 h-0.5 rounded-full bg-gradient-to-r from-status-info via-status-warning to-status-safe" style={{ width: '100%' }} />
            <div className="relative flex justify-between">
              {timelineItems.map((item, i) => (
                <div key={i} className="flex flex-col items-center z-10" style={{ width: `${100 / (timelineItems.length || 1)}%` }}>
                  <div className="font-mono text-xs font-bold text-white mb-1">{item.time}</div>
                  <div className={cn('w-4 h-4 rounded-full border-2 border-brand-steel-light relative z-10', item.color)} />
                  <div className="mt-2 text-[10px] md:text-xs text-brand-gray text-center max-w-[60px]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="industrial-card p-5 md:p-6 mb-5 overflow-x-auto">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-orange rounded" />
              用料费用明细
            </h2>
          </div>

          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2.5 px-2 text-[11px] font-medium text-brand-gray uppercase tracking-wider">备件名称</th>
                <th className="text-left py-2.5 px-2 text-[11px] font-medium text-brand-gray uppercase tracking-wider font-mono">零件号</th>
                <th className="text-right py-2.5 px-2 text-[11px] font-medium text-brand-gray uppercase tracking-wider">数量</th>
                <th className="text-right py-2.5 px-2 text-[11px] font-medium text-brand-gray uppercase tracking-wider">单价</th>
                <th className="text-right py-2.5 px-2 text-[11px] font-medium text-brand-gray uppercase tracking-wider">小计</th>
              </tr>
            </thead>
            <tbody>
              {materialItems.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-2 text-white/90 font-medium">{item.part_name}</td>
                  <td className="py-3 px-2 font-mono text-xs text-brand-gray">{item.part_no}</td>
                  <td className="py-3 px-2 text-right font-mono text-white/80">×{item.quantity}</td>
                  <td className="py-3 px-2 text-right font-mono text-white/80">¥{item.unit_price}</td>
                  <td className="py-3 px-2 text-right font-mono text-white font-bold">¥{item.quantity * item.unit_price}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-4 pb-1 px-2 text-right text-sm text-brand-gray font-medium">合计金额</td>
                <td className="pt-4 pb-1 px-2 text-right">
                  <span className="font-display text-2xl md:text-3xl font-black text-brand-orange tracking-tight">
                    {formatCurrency(totalCost)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="industrial-card p-5 md:p-6 mb-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-orange rounded" />
              现场照片
            </h2>
          </div>

          <div className="flex gap-1.5 mb-4 p-1 rounded-lg bg-white/[0.04] border border-white/5">
            {PHOTO_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setPhotoCategory(cat.key);
                  setPhotoIndex(0);
                }}
                className={cn(
                  'flex-1 py-2 px-2 rounded-md text-xs font-medium transition-all duration-150',
                  photoCategory === cat.key
                    ? 'bg-brand-orange text-white shadow-glow-orange'
                    : 'text-brand-gray hover:text-white/80 hover:bg-white/5'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative group rounded-xl overflow-hidden border border-white/8 bg-black/20 aspect-[4/3]">
            <img src={photoSrcs[photoIndex]} alt="现场照片" className="w-full h-full object-cover" />
            <button
              onClick={() => setPhotoIndex((i) => (i - 1 + photoSrcs.length) % photoSrcs.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPhotoIndex((i) => (i + 1) % photoSrcs.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photoSrcs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === photoIndex ? 'bg-brand-orange w-5' : 'bg-white/30 hover:bg-white/50'
                  )}
                />
              ))}
            </div>
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
              <span className="text-[10px] font-medium text-white/90 uppercase tracking-wider">
                {photoIndex + 1} / {photoSrcs.length}
              </span>
            </div>
          </div>
        </section>

        <section className="industrial-card p-5 md:p-6 mb-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-orange rounded" />
              保养说明
            </h2>
          </div>

          <div className="mb-5">
            <div className="text-[11px] text-brand-gray uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              技师备注
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03] border border-white/8 text-sm text-white/85 leading-relaxed min-h-[96px]">
              {workOrder.maintenance_note ||
                '检查液压系统，更换液压油滤芯，补充液压油。各部位紧固件按规定扭矩检查紧固。发动机三滤及机油已全部更换。故障码E-001已排查修复，液压泵压力恢复正常范围。试车运行30分钟，各系统工作正常。'}
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-brand-orange/40 bg-brand-orange/[0.05] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-orange/10 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-brand-orange" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white mb-1">建议下次保养</div>
                <div className="text-xs text-brand-gray mb-1.5">按保养周期提醒</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black text-brand-orange tracking-wider">
                    {nextMaintenanceHours.toLocaleString()}
                  </span>
                  <span className="text-xs text-brand-gray">小时</span>
                  <span className="text-xs text-status-safe ml-auto inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    剩余 {(device.maintenance_interval - (device.current_hours - device.last_maintenance_hours)).toLocaleString()} h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {submitted && (
          <div className="mb-5 p-5 rounded-xl border-2 animate-slide-up" style={{
            borderColor: submitted === 'completed' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
            background: submitted === 'completed' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
          }}>
            <div className="flex items-start gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: submitted === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                }}
              >
                {submitted === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-status-safe" strokeWidth={2.5} />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-status-danger" strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-display font-bold text-white mb-1">
                  {submitted === 'completed' ? '验收提交成功！' : '已提交返工申请'}
                </h4>
                <p className="text-sm text-brand-gray">
                  {submitted === 'completed'
                    ? '感谢您的反馈，工单已标记完成。即将返回首页...'
                    : '调度中心已收到您的返工申请，将尽快重新安排技师。即将返回首页...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <section className="industrial-card p-5 md:p-6 mb-5">
            <div className="section-header">
              <h2 className="section-title flex items-center gap-2">
                <span className="w-1 h-5 bg-brand-orange rounded" />
                验收确认
              </h2>
            </div>

            <button
              onClick={handleSubmitConfirm}
              disabled={showRatingModal || showReturnForm}
              className="w-full btn-industrial-success !py-4 !text-lg !gap-2.5 font-display font-bold tracking-wider mb-3 disabled:opacity-60"
            >
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />
              设备已恢复正常作业
            </button>

            <div className="text-center mb-5">
              <button
                onClick={() => {
                  setShowReturnForm((v) => !v);
                  if (!showReturnForm) setShowRatingModal(false);
                }}
                className="inline-flex items-center gap-1.5 text-sm text-status-danger hover:text-status-danger/80 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>设备未恢复正常，申请返工</span>
                <ChevronDown
                  className={cn('w-4 h-4 transition-transform duration-200', showReturnForm && 'rotate-180')}
                />
              </button>
            </div>

            {showReturnForm && (
              <div className="p-4 mb-4 rounded-xl bg-status-danger/[0.05] border-2 border-status-danger/30 animate-slide-up">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-brand-gray uppercase tracking-wider mb-1.5">
                      问题类型
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ISSUE_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setReturnIssueType(t)}
                          className={cn(
                            'px-3 py-1.5 rounded text-xs font-medium border transition-all',
                            returnIssueType === t
                              ? 'bg-status-danger text-white border-status-danger'
                              : 'bg-white/[0.03] text-white/70 border-white/10 hover:border-status-danger/40'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray uppercase tracking-wider mb-1.5">
                      问题描述
                    </label>
                    <textarea
                      value={returnDescription}
                      onChange={(e) => setReturnDescription(e.target.value)}
                      rows={4}
                      placeholder="请详细描述设备存在的问题..."
                      className="input-industrial resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-brand-gray uppercase tracking-wider mb-1.5">
                      现场照片（最多3张）
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {returnPhotos.map((p, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                          <img src={p} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setReturnPhotos(returnPhotos.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-status-danger flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                      {returnPhotos.length < 3 && (
                        <button
                          onClick={handleAddReturnPhoto}
                          className="w-20 h-20 rounded-lg border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-brand-gray hover:border-brand-orange/50 hover:text-brand-orange transition-colors"
                        >
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span className="text-[10px]">拍照</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitReturn}
                    className="w-full btn-industrial-danger !py-3"
                  >
                    <Upload className="w-4 h-4" />
                    提交返工申请
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="pb-8 mobile-safe-bottom">
          <div className="industrial-card p-5 md:p-6 mb-4">
            <div className="text-center mb-2">
              <div className="text-[11px] text-brand-gray uppercase tracking-wider mb-2">客户确认签字</div>
              <div className="relative h-16 flex items-center justify-center">
                <svg viewBox="0 0 300 60" className="w-full max-w-sm h-full text-white/20">
                  <path
                    d="M10 50 Q 40 30, 80 45 T 150 35 T 220 48 T 290 42"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <div className="text-center sm:text-left">
              <div className="text-[11px] text-brand-gray">
                报告生成时间：{new Date().toLocaleString('zh-CN')}
              </div>
              <div className="text-[11px] font-mono text-brand-gray/70 tracking-wider">
                报告编号：{reportNo}
              </div>
            </div>
            <button className="btn-industrial-secondary !py-2 !px-4 gap-1.5">
              <Download className="w-4 h-4" />
              下载PDF报告
            </button>
          </div>
        </footer>
      </div>

      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md industrial-card p-6 animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-status-safe/20 border border-status-safe/30 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-status-safe" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-1">请为本次服务评分</h3>
              <p className="text-sm text-brand-gray">您的反馈是我们进步的动力</p>
            </div>

            <div className="mb-5 p-5 rounded-xl bg-white/[0.03] border border-white/8 text-center">
              <div className="flex items-center justify-center mb-3 scale-150 py-4">
                <RatingStars
                  rating={rating}
                  size={28}
                  interactive
                  onChange={setRating}
                  onHover={setHoverRating}
                />
              </div>
              <div className="font-display text-lg font-bold text-brand-orange">
                {(hoverRating ?? rating) === 5 && '非常满意'}
                {(hoverRating ?? rating) === 4 && '满意'}
                {(hoverRating ?? rating) === 3 && '一般'}
                {(hoverRating ?? rating) === 2 && '不满意'}
                {(hoverRating ?? rating) === 1 && '非常不满意'}
                <span className="ml-2 font-mono text-sm text-brand-gray">
                  {hoverRating ?? rating}.0 分
                </span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[11px] text-brand-gray uppercase tracking-wider mb-1.5">
                文字反馈（可选）
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
                placeholder="分享您的保养体验..."
                className="input-industrial resize-none"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 btn-industrial-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSubmitRating}
                className="flex-1 btn-industrial-primary"
              >
                <Check className="w-4 h-4" />
                提交评价
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
