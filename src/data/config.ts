import type { DeviceType, FaultSeverity } from '../types';

export interface MaintenanceConfigItem {
  interval_hours: number;
  urgent_threshold: number;
}

export const MAINTENANCE_CONFIG: Record<DeviceType, MaintenanceConfigItem> = {
  '挖机': { interval_hours: 500, urgent_threshold: 480 },
  '吊车': { interval_hours: 400, urgent_threshold: 380 },
  '压路机': { interval_hours: 300, urgent_threshold: 280 },
};

export interface FaultCode {
  code: string;
  name: string;
  severity: FaultSeverity;
}

export const FAULT_CODES: FaultCode[] = [
  { code: 'E-001', name: '液压系统压力异常', severity: 'high' },
  { code: 'E-002', name: '发动机水温过高', severity: 'high' },
  { code: 'W-015', name: '滤芯堵塞警告', severity: 'medium' },
  { code: 'W-023', name: '刹车片磨损', severity: 'medium' },
  { code: 'I-008', name: '传感器信号异常', severity: 'low' },
];

export interface CommonPart {
  name: string;
  part_no: string;
  price: number;
}

export const COMMON_PARTS: CommonPart[] = [
  { name: '机油滤芯', part_no: 'FLT-OIL-001', price: 85 },
  { name: '液压油滤芯', part_no: 'FLT-HYD-002', price: 180 },
  { name: '空气滤芯', part_no: 'FLT-AIR-003', price: 120 },
  { name: '柴油滤芯', part_no: 'FLT-FUE-004', price: 95 },
  { name: '液压油 20L', part_no: 'OIL-HYD-20L', price: 580 },
  { name: '机油 18L', part_no: 'OIL-ENG-18L', price: 420 },
  { name: '刹车片组件', part_no: 'BRK-PAD-01', price: 320 },
  { name: 'O型密封圈套装', part_no: 'SEAL-O-RING', price: 65 },
];
