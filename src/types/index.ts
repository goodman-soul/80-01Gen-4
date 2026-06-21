export type DeviceType = '挖机' | '吊车' | '压路机';

export type DeviceStatus = '运行中' | '待保养' | '保养中' | '故障';

export type WorkOrderStatus = '待派单' | '已派单' | '进行中' | '待验收' | '已完成' | '已退回';

export type WorkOrderPriority = '低' | '中' | '高' | '紧急';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export type FaultSeverity = 'high' | 'medium' | 'low';

export interface Device {
  id: string;
  device_no: string;
  type: DeviceType;
  model: string;
  current_hours: number;
  last_maintenance_hours: number;
  maintenance_interval: number;
  fault_code: string | null;
  fault_name: string | null;
  fault_severity: FaultSeverity | null;
  location_name: string;
  latitude: number;
  longitude: number;
  client_id: string;
  client_name: string;
  synced_at: string;
  status: DeviceStatus;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  avatar_color: string;
  latitude: number;
  longitude: number;
  skills: DeviceType[];
  workload: number;
  rating: number;
  online: boolean;
}

export interface WorkOrder {
  id: string;
  device_id: string;
  device?: Device;
  technician_id: string | null;
  technician?: Technician;
  client_id: string;
  client_name: string;
  type: DeviceType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  created_at: string;
  assigned_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  sla_deadline_minutes: number;
  downtime_minutes: number | null;
  maintenance_note: string | null;
  client_rating: number | null;
  client_feedback: string | null;
  sync_status: SyncStatus;
  updated_at?: string;
  materials: MaterialItem[];
  photos: PhotoAttachment[];
}

export interface MaterialItem {
  id: string;
  work_order_id: string;
  part_name: string;
  part_no: string;
  quantity: number;
  unit_price: number;
}

export interface PhotoAttachment {
  id: string;
  work_order_id: string;
  data_url: string;
  category: 'before' | 'during' | 'after';
  taken_at: string;
}

export interface MaintenanceLog {
  id: string;
  device_id: string;
  work_order_id: string | null;
  maintenance_type: '常规保养' | '故障维修' | '定期检查';
  maintenance_hours: number;
  technician_id: string | null;
  technician_name: string | null;
  parts_used: string[];
  total_cost: number;
  note: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface Client {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
  contract_start_date: string;
  contract_end_date: string;
  device_count: number;
  status: 'active' | 'inactive';
}
