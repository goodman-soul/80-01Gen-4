import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Plus,
  Minus,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  Clock,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import DeviceIcon from '@/components/DeviceIcon';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store';
import { FAULT_CODES } from '@/data/config';
import { cn } from '@/lib/utils';
import type { Device } from '@/types';

const CONSTRUCTION_SITES = [
  '朝阳区CBD核心区项目',
  '海淀区中关村科技园',
  '丰台区丽泽商务区',
  '通州区副中心工地',
  '大兴区亦庄开发区',
  '昌平区未来科学城',
  '东城区旧城改造项目',
  '石景山区首钢园区',
];

interface SyncRecord {
  id: string;
  device_no: string;
  time: string;
  status: '成功' | '失败';
  detail: string;
}

function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RentalSyncForm() {
  const navigate = useNavigate();
  const devices = useAppStore((state) => state.devices);
  const addOrUpdateDevice = useAppStore((state) => state.addOrUpdateDevice);

  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [currentHours, setCurrentHours] = useState<number>(0);
  const [faultCode, setFaultCode] = useState<string>('none');
  const [locationName, setLocationName] = useState<string>('');
  const [showLocationSuggest, setShowLocationSuggest] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [syncRecords, setSyncRecords] = useState<SyncRecord[]>(() => {
    const now = new Date();
    return [
      {
        id: '1',
        device_no: 'WJ-352',
        time: formatTime(new Date(now.getTime() - 10 * 60 * 1000)),
        status: '成功',
        detail: '小时数更新: 3450 → 3487',
      },
      {
        id: '2',
        device_no: 'DC-218',
        time: formatTime(new Date(now.getTime() - 45 * 60 * 1000)),
        status: '成功',
        detail: '工地位置更新',
      },
      {
        id: '3',
        device_no: 'YL-176',
        time: formatTime(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
        status: '失败',
        detail: '网络超时，请重试',
      },
      {
        id: '4',
        device_no: 'WJ-481',
        time: formatTime(new Date(now.getTime() - 5 * 60 * 60 * 1000)),
        status: '成功',
        detail: '批量同步 5 条数据',
      },
    ];
  });

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  const gpsDisplay = useMemo(() => {
    if (selectedDevice) {
      return {
        lat: selectedDevice.latitude.toFixed(4),
        lng: selectedDevice.longitude.toFixed(4),
      };
    }
    return { lat: '39.9042', lng: '116.4074' };
  }, [selectedDevice]);

  const filteredLocations = useMemo(() => {
    if (!locationName) return CONSTRUCTION_SITES.slice(0, 5);
    return CONSTRUCTION_SITES.filter((s) =>
      s.includes(locationName)
    ).slice(0, 5);
  }, [locationName]);

  useEffect(() => {
    if (selectedDevice) {
      setCurrentHours(selectedDevice.current_hours);
      setLocationName(selectedDevice.location_name);
      setFaultCode(selectedDevice.fault_code || 'none');
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (isSyncing) {
      setSyncProgress(0);
      const target = 85;
      const interval = setInterval(() => {
        setSyncProgress((prev) => {
          const next = prev + Math.random() * 8 + 2;
          if (next >= target) {
            clearInterval(interval);
            return target;
          }
          return next;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isSyncing]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3000);
  };

  const adjustHours = (delta: number) => {
    setCurrentHours((prev) => Math.max(0, prev + delta));
  };

  const handleSingleSync = () => {
    if (!selectedDeviceId) {
      showToast('error', '请选择设备');
      return;
    }
    if (!locationName.trim()) {
      showToast('error', '请填写所在工地');
      return;
    }
    const device = devices.find((d) => d.id === selectedDeviceId);
    if (!device) return;

    const faultInfo =
      faultCode === 'none'
        ? { fault_code: null, fault_name: null, fault_severity: null }
        : (() => {
            const fc = FAULT_CODES.find((f) => f.code === faultCode);
            return {
              fault_code: fc?.code || null,
              fault_name: fc?.name || null,
              fault_severity: fc?.severity || null,
            };
          })();

    const hasFault = faultInfo.fault_code !== null;
    let status: Device['status'] = device.status;
    if (hasFault) {
      status = '故障';
    } else {
      const hoursSince = currentHours - device.last_maintenance_hours;
      const remaining = device.maintenance_interval - hoursSince;
      if (remaining <= device.maintenance_interval * 0.05) {
        status = '待保养';
      } else if (device.status === '故障') {
        status = '运行中';
      }
    }

    const updatedDevice: Device = {
      ...device,
      current_hours: currentHours,
      location_name: locationName,
      synced_at: new Date().toISOString(),
      status,
      ...faultInfo,
    };

    addOrUpdateDevice(updatedDevice);

    const newRecord: SyncRecord = {
      id: Date.now().toString(),
      device_no: device.device_no,
      time: formatTime(new Date()),
      status: '成功',
      detail: `小时数更新: ${device.current_hours} → ${currentHours}`,
    };
    setSyncRecords((prev) => [newRecord, ...prev].slice(0, 8));
    showToast('success', `设备 ${device.device_no} 数据同步成功！`);
  };

  const handleBatchSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setSyncProgress(100);
      setTimeout(() => {
        setIsSyncing(false);
        const newRecord: SyncRecord = {
          id: Date.now().toString(),
          device_no: '批量',
          time: formatTime(new Date()),
          status: '成功',
          detail: '批量同步 12 条数据',
        };
        setSyncRecords((prev) => [newRecord, ...prev].slice(0, 8));
        showToast('success', '批量数据同步成功！共处理 12 条记录');
      }, 500);
    }, 3000);
  };

  const exampleRows = [
    ['WJ-352', 'CAT 336D2', '3487', '朝阳区CBD核心区项目', '39.9090', '116.4120', ''],
    ['DC-218', '徐工 QY50K', '2156', '海淀区中关村科技园', '39.9812', '116.3140', ''],
    ['YL-176', '徐工 XS223J', '1892', '丰台区丽泽商务区', '39.8570', '116.4180', 'W-015'],
    ['WJ-481', '小松 PC360-8M0', '5623', '通州区副中心工地', '39.9150', '116.5300', ''],
    ['DC-305', '三一 STC800', '4108', '大兴区亦庄开发区', '39.7980', '116.5020', 'E-001'],
  ];

  return (
    <div className="p-6 min-h-screen relative">
      {toast.show && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up border',
            toast.type === 'success'
              ? 'bg-status-safe/15 border-status-safe/40 text-status-safe'
              : 'bg-status-danger/15 border-status-danger/40 text-status-danger'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-brand-gray hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl uppercase tracking-wider text-white">
              设备运行数据同步
            </h1>
            <p className="text-brand-gray text-sm mt-1">
              单条录入或批量上传设备运行数据
            </p>
          </div>
        </div>

        <div className="industrial-card overflow-hidden">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('single')}
              className={cn(
                'flex-1 px-6 py-4 text-sm font-medium transition-all relative',
                activeTab === 'single'
                  ? 'text-brand-orange'
                  : 'text-brand-gray hover:text-white/80'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />
                单条同步
              </div>
              {activeTab === 'single' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />
              )}
            </button>
            <div className="w-px bg-white/10" />
            <button
              onClick={() => setActiveTab('batch')}
              className={cn(
                'flex-1 px-6 py-4 text-sm font-medium transition-all relative',
                activeTab === 'batch'
                  ? 'text-brand-orange'
                  : 'text-brand-gray hover:text-white/80'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                批量同步
              </div>
              {activeTab === 'batch' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />
              )}
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'single' ? (
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    选择设备
                  </label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="input-industrial"
                  >
                    <option value="">-- 请选择设备 --</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.device_no} - {d.model} ({d.type})
                      </option>
                    ))}
                  </select>
                  {selectedDevice && (
                    <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 flex items-center gap-4">
                      <DeviceIcon type={selectedDevice.type} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white">
                            {selectedDevice.device_no}
                          </span>
                          <StatusBadge status={selectedDevice.status} />
                        </div>
                        <div className="text-sm text-brand-gray mt-1">
                          {selectedDevice.model} · 当前 {selectedDevice.current_hours.toLocaleString()}h
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    当前小时数
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustHours(-10)}
                      className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-brand-gray hover:text-white transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={currentHours}
                        onChange={(e) =>
                          setCurrentHours(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="input-industrial font-mono text-lg text-center tabular-nums"
                      />
                    </div>
                    <button
                      onClick={() => adjustHours(10)}
                      className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-brand-gray hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-brand-gray font-mono">h</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {[1, 5, 50, 100].map((v) => (
                      <button
                        key={v}
                        onClick={() => adjustHours(v)}
                        className="px-3 py-1 text-xs rounded-md bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 transition-colors"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    故障码
                  </label>
                  <select
                    value={faultCode}
                    onChange={(e) => setFaultCode(e.target.value)}
                    className="input-industrial"
                  >
                    <option value="none">无故障</option>
                    {FAULT_CODES.map((fc) => (
                      <option key={fc.code} value={fc.code}>
                        {fc.code} - {fc.name} ({fc.severity === 'high' ? '严重' : fc.severity === 'medium' ? '中等' : '轻微'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    所在工地
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-orange" />
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => {
                        setLocationName(e.target.value);
                        setShowLocationSuggest(true);
                      }}
                      onFocus={() => setShowLocationSuggest(true)}
                      onBlur={() =>
                        setTimeout(() => setShowLocationSuggest(false), 150)
                      }
                      placeholder="输入或选择工地名称"
                      className="input-industrial pl-10"
                    />
                  </div>
                  {showLocationSuggest && filteredLocations.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 rounded-lg bg-brand-steel-light border border-white/10 shadow-lg overflow-hidden">
                      {filteredLocations.map((loc) => (
                        <button
                          key={loc}
                          onMouseDown={() => {
                            setLocationName(loc);
                            setShowLocationSuggest(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-brand-orange/15 hover:text-white transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                            {loc}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    GPS 坐标
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-status-info rotate-45" />
                      <input
                        type="text"
                        value={gpsDisplay.lat}
                        readOnly
                        placeholder="纬度"
                        className="input-industrial pl-10 font-mono text-sm text-brand-gray bg-white/5"
                      />
                    </div>
                    <div className="relative">
                      <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-status-info -rotate-45" />
                      <input
                        type="text"
                        value={gpsDisplay.lng}
                        readOnly
                        placeholder="经度"
                        className="input-industrial pl-10 font-mono text-sm text-brand-gray bg-white/5"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-brand-gray mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-status-safe" />
                    坐标根据设备上次位置自动填充
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSingleSync}
                    className="btn-industrial-primary w-full py-3 text-base"
                  >
                    <UploadCloud className="w-5 h-5" />
                    同步数据
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleBatchSync();
                  }}
                  onClick={handleBatchSync}
                  className={cn(
                    'relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300',
                    isDragging
                      ? 'border-brand-orange bg-brand-orange/10 scale-[1.01]'
                      : 'border-white/20 bg-white/5 hover:border-brand-orange/50 hover:bg-brand-orange/5'
                  )}
                >
                  <div
                    className={cn(
                      'mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all',
                      isDragging
                        ? 'bg-brand-orange/30 scale-110'
                        : 'bg-white/10'
                    )}
                  >
                    <UploadCloud
                      className={cn(
                        'w-8 h-8 transition-all',
                        isDragging ? 'text-brand-orange' : 'text-brand-gray'
                      )}
                    />
                  </div>
                  <p
                    className={cn(
                      'font-medium mb-1',
                      isDragging ? 'text-brand-orange' : 'text-white'
                    )}
                  >
                    {isDragging ? '释放文件开始上传' : '拖拽 CSV 文件到此处'}
                  </p>
                  <p className="text-sm text-brand-gray mb-4">
                    或点击此区域选择文件
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-orange/15 border border-brand-orange/30 text-brand-orange text-sm">
                    <FileText className="w-4 h-4" />
                    选择文件
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleBatchSync}
                  />
                </div>

                {isSyncing && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/80">同步进度</span>
                      <span className="text-sm font-mono text-brand-orange">
                        {Math.round(syncProgress)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-orange to-brand-orange-hover transition-all duration-200 relative"
                        style={{ width: `${syncProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white/80">
                      示例数据预览
                    </h3>
                    <span className="text-xs text-brand-gray">
                      设备编号,型号,小时数,工地,纬度,经度,故障码
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/5">
                            {['设备编号', '型号', '小时数', '工地', '纬度', '经度', '故障码'].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="text-left py-2.5 px-3 font-medium text-brand-gray uppercase tracking-wider whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {exampleRows.map((row, i) => (
                            <tr
                              key={i}
                              className="hover:bg-white/5 transition-colors"
                            >
                              {row.map((cell, j) => (
                                <td
                                  key={j}
                                  className={cn(
                                    'py-2.5 px-3 whitespace-nowrap',
                                    j === 6 && cell
                                      ? 'text-status-danger font-medium'
                                      : j === 2
                                      ? 'text-white/90 font-mono tabular-nums'
                                      : 'text-white/70'
                                  )}
                                >
                                  {cell || <span className="text-brand-gray">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="industrial-card p-5">
          <div className="section-header">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-orange" />
              <h2 className="section-title">最近同步记录</h2>
            </div>
          </div>
          <div className="space-y-2">
            {syncRecords.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/5 transition-colors"
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    record.status === '成功'
                      ? 'bg-status-safe/15'
                      : 'bg-status-danger/15'
                  )}
                >
                  {record.status === '成功' ? (
                    <CheckCircle className="w-5 h-5 text-status-safe" />
                  ) : (
                    <XCircle className="w-5 h-5 text-status-danger" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">
                      {record.device_no}
                    </span>
                    <StatusBadge
                      status={record.status === '成功' ? '同步成功' : '同步失败'}
                    />
                  </div>
                  <p className="text-xs text-brand-gray mt-0.5 truncate">
                    {record.detail}
                  </p>
                </div>
                <div className="text-xs text-brand-gray font-mono shrink-0">
                  {record.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
