import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Activity,
  AlertTriangle,
  AlertCircle,
  MapPin,
  RefreshCw,
  FileDown,
  History,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import StatCard from '@/components/StatCard';
import DeviceIcon from '@/components/DeviceIcon';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Device } from '@/types';

interface MaintenanceInfo {
  hoursSince: number;
  percent: number;
  remaining: number;
  urgent: boolean;
  warning: boolean;
}

function getMaintenanceInfo(device: Device): MaintenanceInfo {
  const hoursSince = device.current_hours - device.last_maintenance_hours;
  const percent = (hoursSince / device.maintenance_interval) * 100;
  const remaining = device.maintenance_interval - hoursSince;
  const urgent = remaining <= device.maintenance_interval * 0.05;
  const warning = remaining <= device.maintenance_interval * 0.15;
  return {
    hoursSince,
    percent: Math.min(100, Math.max(0, percent)),
    remaining: Math.max(0, remaining),
    urgent,
    warning,
  };
}

function getProgressColor(info: MaintenanceInfo): string {
  if (info.urgent) return 'bg-status-danger';
  if (info.warning) return 'bg-status-warning';
  return 'bg-status-safe';
}

function getProgressBgColor(info: MaintenanceInfo): string {
  if (info.urgent) return 'bg-status-danger/20';
  if (info.warning) return 'bg-status-warning/20';
  return 'bg-status-safe/20';
}

export default function RentalDashboard() {
  const navigate = useNavigate();
  const devices = useAppStore((state) => state.devices);

  const [blinkKey, setBlinkKey] = useState(0);

  useMemo(() => {
    const interval = setInterval(() => {
      setBlinkKey((k) => k + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const total = devices.length;
    const excavatorCount = devices.filter((d) => d.type === '挖机').length;
    const craneCount = devices.filter((d) => d.type === '吊车').length;
    const rollerCount = devices.filter((d) => d.type === '压路机').length;

    const running = devices.filter((d) => d.status === '运行中').length;
    const runningRate = total > 0 ? Math.round((running / total) * 100) : 0;

    const maintenanceWarning = devices.filter((d) => {
      const info = getMaintenanceInfo(d);
      return info.warning || d.status === '待保养';
    }).length;

    const fault = devices.filter((d) => d.status === '故障').length;

    return {
      total,
      excavatorCount,
      craneCount,
      rollerCount,
      running,
      runningRate,
      maintenanceWarning,
      fault,
    };
  }, [devices]);

  const chartData = useMemo(() => {
    return devices.slice(0, 10).map((d) => {
      const info = getMaintenanceInfo(d);
      return {
        device_no: d.device_no,
        hours_since: Math.round(info.hoursSince),
        maintenance_interval: d.maintenance_interval,
        urgent: info.urgent,
        warning: info.warning,
      };
    });
  }, [devices]);

  const getBarColor = (entry: { urgent: boolean; warning: boolean }) => {
    if (entry.urgent) return '#EF4444';
    if (entry.warning) return '#F59E0B';
    return '#10B981';
  };

  const handleExport = () => {
    const headers = [
      '设备编号',
      '类型',
      '型号',
      '当前小时数',
      '保养进度',
      '故障码',
      '所在工地',
      '客户名称',
      '状态',
    ];
    const rows = devices.map((d) => {
      const info = getMaintenanceInfo(d);
      return [
        d.device_no,
        d.type,
        d.model,
        d.current_hours.toString(),
        `${Math.round(info.percent)}% (剩余${info.remaining}h)`,
        d.fault_code || '无',
        d.location_name,
        d.client_name,
        d.status,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `设备报表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wider text-white">
            租赁公司设备监控面板
          </h1>
          <p className="text-brand-gray text-sm mt-1">
            实时监控所有租赁设备的运行状态与保养进度
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/rental/sync')}
            className="btn-industrial-primary"
          >
            <RefreshCw className="w-4 h-4" />
            同步设备数据
          </button>
          <button onClick={handleExport} className="btn-industrial-secondary">
            <FileDown className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="设备总数"
          value={stats.total}
          color="orange"
          icon={<Cpu className="w-6 h-6" />}
          trend={`挖${stats.excavatorCount} / 吊${stats.craneCount} / 压${stats.rollerCount}`}
          trendUp
        />
        <StatCard
          title="运行中设备"
          value={stats.running}
          color="green"
          icon={<Activity className="w-6 h-6" />}
          trend={`运行率 ${stats.runningRate}%`}
          trendUp={stats.runningRate >= 70}
        />
        <StatCard
          title="待保养预警"
          value={stats.maintenanceWarning}
          color="orange"
          icon={
            <AlertTriangle
              key={blinkKey}
              className={cn(
                'w-6 h-6 transition-opacity duration-300',
                stats.maintenanceWarning > 0 && blinkKey % 2 === 0
                  ? 'opacity-100'
                  : 'opacity-60'
              )}
            />
          }
          trend="需立即关注"
          trendUp={false}
        />
        <StatCard
          title="故障设备"
          value={stats.fault}
          color="red"
          icon={<AlertCircle className="w-6 h-6" />}
          trend={stats.fault > 0 ? '需要维修' : '运行正常'}
          trendUp={stats.fault === 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 industrial-card p-5">
          <div className="section-header">
            <h2 className="section-title">设备列表</h2>
            <span className="text-xs text-brand-gray">
              共 {devices.length} 台设备
            </span>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    设备
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    型号
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    当前小时数
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    保养进度
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    故障码
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    所在工地
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    客户
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    状态
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-brand-gray uppercase text-xs tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {devices.map((device) => {
                  const info = getMaintenanceInfo(device);
                  const hoursHighlight = info.urgent || info.warning;
                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <DeviceIcon type={device.type} size="sm" />
                          <div>
                            <div className="font-medium text-white">
                              {device.device_no}
                            </div>
                            <div className="text-xs text-brand-gray">
                              {device.type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-white/80">
                        {device.model}
                      </td>
                      <td
                        className={cn(
                          'py-3 px-2 font-mono font-semibold tabular-nums',
                          hoursHighlight
                            ? 'text-brand-orange'
                            : 'text-white/80'
                        )}
                      >
                        {device.current_hours.toLocaleString()}h
                      </td>
                      <td className="py-3 px-2 min-w-[160px]">
                        <div className="space-y-1">
                          <div
                            className={cn(
                              'h-2 rounded-full overflow-hidden',
                              getProgressBgColor(info)
                            )}
                          >
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                getProgressColor(info)
                              )}
                              style={{ width: `${info.percent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={cn(
                                'font-medium',
                                info.urgent
                                  ? 'text-status-danger'
                                  : info.warning
                                  ? 'text-status-warning'
                                  : 'text-brand-gray'
                              )}
                            >
                              剩余 {info.remaining}h
                            </span>
                            <span className="text-brand-gray">
                              {Math.round(info.percent)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {device.fault_code ? (
                          <span className="tag-industrial bg-status-danger/15 border-status-danger/40 text-status-danger">
                            {device.fault_code}
                          </span>
                        ) : (
                          <span className="text-brand-gray text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5 text-white/80">
                          <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                          <span className="text-xs truncate max-w-[140px]">
                            {device.location_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-white/80 text-xs truncate max-w-[140px]">
                        {device.client_name}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={device.status} />
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate('/rental/sync')}
                            className="p-1.5 rounded-md bg-white/5 hover:bg-brand-orange/20 text-brand-gray hover:text-brand-orange transition-colors"
                            title="同步数据"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 rounded-md bg-white/5 hover:bg-status-info/20 text-brand-gray hover:text-status-info transition-colors"
                            title="查看历史"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="industrial-card p-5">
          <div className="section-header">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-orange" />
              <h2 className="section-title">保养周期统计</h2>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="device_no"
                  tick={{ fill: '#8A8F98', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: '#8A8F98', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  label={{
                    value: '小时数',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#8A8F98',
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#242832',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}h`,
                    name === 'hours_since' ? '已运行小时' : name,
                  ]}
                  labelFormatter={(label) => `设备: ${label}`}
                />
                <ReferenceLine
                  y={500}
                  stroke="#FF6B1A"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: '保养阈值',
                    fill: '#FF6B1A',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Bar dataKey="hours_since" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-white/8 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm bg-status-safe" />
              <span className="text-brand-gray">正常 (&gt;15% 剩余)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm bg-status-warning" />
              <span className="text-brand-gray">预警 (5%-15% 剩余)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-sm bg-status-danger" />
              <span className="text-brand-gray">紧急 (≤5% 剩余)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-0.5 bg-brand-orange border-dashed border-t border-brand-orange" />
              <span className="text-brand-gray">保养阈值参考线</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
