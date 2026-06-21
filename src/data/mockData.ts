import type {
  Device,
  DeviceType,
  DeviceStatus,
  Technician,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderPriority,
  Client,
  MaterialItem,
  PhotoAttachment,
  MaintenanceLog,
  FaultSeverity,
  SyncStatus,
} from '../types';
import { MAINTENANCE_CONFIG, FAULT_CODES, COMMON_PARTS } from './config';

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, decimals: number = 4): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randomDateTimeWithin7Days = (): Date => {
  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(past7Days.getTime() + Math.random() * (now.getTime() - past7Days.getTime()));
};

const formatDateTime = (date: Date): string => date.toISOString();

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

const BEIJING_CENTER = { lat: 39.9042, lng: 116.4074 };

const CONSTRUCTION_SITES = [
  { name: '朝阳区CBD核心区项目', latOffset: 0.02, lngOffset: 0.04 },
  { name: '海淀区中关村科技园', latOffset: 0.06, lngOffset: -0.03 },
  { name: '丰台区丽泽商务区', latOffset: -0.05, lngOffset: 0.01 },
  { name: '通州区副中心工地', latOffset: 0.01, lngOffset: 0.12 },
  { name: '大兴区亦庄开发区', latOffset: -0.08, lngOffset: 0.06 },
  { name: '昌平区未来科学城', latOffset: 0.12, lngOffset: 0.02 },
  { name: '东城区旧城改造项目', latOffset: 0.005, lngOffset: -0.005 },
  { name: '石景山区首钢园区', latOffset: -0.03, lngOffset: -0.08 },
];

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const TECHNICIAN_NAMES = [
  '张伟', '李强', '王磊', '刘洋', '陈建国',
  '杨军', '赵德明', '黄师傅', '周海涛', '吴强',
];

const CLIENT_NAMES = [
  { name: '中建八局第一建设有限公司', contact: '李经理', phone: '13801234501' },
  { name: '北京城建集团有限责任公司', contact: '王总', phone: '13902345602' },
  { name: '中铁建设集团华北分公司', contact: '张工', phone: '13703456703' },
  { name: '北京建工集团总承包部', contact: '刘主任', phone: '13604567804' },
  { name: '中国建筑第二工程局', contact: '陈部长', phone: '13505678905' },
];

const ADDRESSES = [
  '北京市朝阳区建国路88号',
  '北京市海淀区中关村大街27号',
  '北京市丰台区丰台北路12号',
  '北京市通州区新华北路168号',
  '北京市大兴区荣昌东街甲5号',
];

const DEVICE_MODELS: Record<DeviceType, string[]> = {
  '挖机': ['CAT 336D2', '小松 PC360-8M0', '日立 ZX350H', '神钢 SK350LC-10', '斗山 DX340LC'],
  '吊车': ['徐工 QY50K', '中联重科 ZTC700V', '三一 STC800', '利勃海尔 LTM1100', '多田野 GT-800'],
  '压路机': ['徐工 XS223J', '三一 SSR220AC', '柳工 CLG6622E', '山推 SR26M-3', '戴纳派克 CC6200'],
};

export const generateMockClients = (): Client[] => {
  const clients: Client[] = [];
  for (let i = 0; i < CLIENT_NAMES.length; i++) {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - randomInt(1, 3));
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 2);

    clients.push({
      id: generateId(),
      name: CLIENT_NAMES[i].name,
      contact_person: CLIENT_NAMES[i].contact,
      phone: CLIENT_NAMES[i].phone,
      address: ADDRESSES[i],
      contract_start_date: formatDateTime(startDate),
      contract_end_date: formatDateTime(endDate),
      device_count: 0,
      status: 'active',
    });
  }
  return clients;
};

const determineDeviceStatus = (
  type: DeviceType,
  currentHours: number,
  lastMaintenanceHours: number,
  hasFault: boolean
): DeviceStatus => {
  if (hasFault) return '故障';
  const config = MAINTENANCE_CONFIG[type];
  const hoursSinceMaintenance = currentHours - lastMaintenanceHours;
  if (hoursSinceMaintenance >= config.urgent_threshold) return '待保养';
  if (hoursSinceMaintenance >= config.interval_hours - 100 && Math.random() < 0.3) return '保养中';
  return '运行中';
};

export const generateMockDevices = (clients: Client[]): Device[] => {
  const devices: Device[] = [];
  const types: DeviceType[] = ['挖机', '吊车', '压路机'];
  const totalCount = randomInt(12, 15);

  for (let i = 0; i < totalCount; i++) {
    const type = randomFrom(types);
    const model = randomFrom(DEVICE_MODELS[type]);
    const client = randomFrom(clients);
    const site = randomFrom(CONSTRUCTION_SITES);
    const config = MAINTENANCE_CONFIG[type];

    const baseHours = randomInt(100, 8000);
    const maintenanceCycles = Math.floor(baseHours / config.interval_hours);
    const lastMaintenanceHours = maintenanceCycles * config.interval_hours;
    const current_hours = lastMaintenanceHours + randomInt(10, config.interval_hours + 50);

    const hasFault = Math.random() < 0.2;
    const faultInfo = hasFault ? randomFrom(FAULT_CODES) : null;

    const status = determineDeviceStatus(type, current_hours, lastMaintenanceHours, hasFault);

    devices.push({
      id: generateId(),
      device_no: `${type === '挖机' ? 'WJ' : type === '吊车' ? 'DC' : 'YL'}-${String(randomInt(100, 999))}`,
      type,
      model,
      current_hours,
      last_maintenance_hours: lastMaintenanceHours,
      maintenance_interval: config.interval_hours,
      fault_code: faultInfo ? faultInfo.code : null,
      fault_name: faultInfo ? faultInfo.name : null,
      fault_severity: faultInfo ? (faultInfo.severity as FaultSeverity) : null,
      location_name: site.name,
      latitude: BEIJING_CENTER.lat + site.latOffset + randomFloat(-0.005, 0.005),
      longitude: BEIJING_CENTER.lng + site.lngOffset + randomFloat(-0.005, 0.005),
      client_id: client.id,
      client_name: client.name,
      synced_at: formatDateTime(randomDateTimeWithin7Days()),
      status,
    });
  }

  clients.forEach(client => {
    client.device_count = devices.filter(d => d.client_id === client.id).length;
  });

  return devices;
};

export const generateMockTechnicians = (devices: Device[]): Technician[] => {
  const technicians: Technician[] = [];
  const deviceSites = devices.map(d => ({ lat: d.latitude, lng: d.longitude, name: d.location_name }));

  for (let i = 0; i < 8; i++) {
    const types: DeviceType[] = ['挖机', '吊车', '压路机'];
    const skillCount = randomInt(1, 3);
    const skills: DeviceType[] = [];
    const shuffled = [...types].sort(() => Math.random() - 0.5);
    for (let j = 0; j < skillCount; j++) {
      skills.push(shuffled[j]);
    }

    const nearbySite = randomFrom(deviceSites);
    const name = TECHNICIAN_NAMES[i] || `技师${i + 1}`;

    technicians.push({
      id: generateId(),
      name,
      phone: `138${String(randomInt(10000000, 99999999))}`,
      avatar_color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      latitude: nearbySite.lat + randomFloat(-0.01, 0.01),
      longitude: nearbySite.lng + randomFloat(-0.01, 0.01),
      skills,
      workload: randomInt(1, 5),
      rating: parseFloat((4 + Math.random()).toFixed(1)),
      online: Math.random() < 0.7,
    });
  }

  return technicians;
};

export const generateMockWorkOrders = (
  devices: Device[],
  technicians: Technician[],
  clients: Client[]
): WorkOrder[] => {
  const workOrders: WorkOrder[] = [];
  const totalCount = randomInt(12, 18);
  const statuses: WorkOrderStatus[] = ['待派单', '已派单', '进行中', '待验收', '已完成', '已退回'];
  const priorities: WorkOrderPriority[] = ['低', '中', '高', '紧急'];
  const priorityWeights = [2, 4, 3, 1];

  const weightedPriority = (): WorkOrderPriority => {
    const total = priorityWeights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < priorities.length; i++) {
      if (r < priorityWeights[i]) return priorities[i];
      r -= priorityWeights[i];
    }
    return '中';
  };

  for (let i = 0; i < totalCount; i++) {
    const device = randomFrom(devices);
    const status = statuses[i % statuses.length];
    const priority = weightedPriority();
    const createdDate = randomDateTimeWithin7Days();

    let assignedDate: Date | null = null;
    let arrivedDate: Date | null = null;
    let completedDate: Date | null = null;
    let technicianId: string | null = null;

    const eligibleTechs = technicians.filter(t => t.skills.includes(device.type));
    const chosenTech = eligibleTechs.length > 0 ? randomFrom(eligibleTechs) : randomFrom(technicians);

    if (status !== '待派单') {
      technicianId = chosenTech.id;
      assignedDate = addMinutes(createdDate, randomInt(10, 120));

      if (status === '进行中' || status === '待验收' || status === '已完成' || status === '已退回') {
        arrivedDate = addMinutes(assignedDate, randomInt(20, 180));
      }

      if (status === '已完成' || status === '已退回') {
        completedDate = addMinutes(arrivedDate, randomInt(60, 480));
      }
    }

    const slaMap: Record<WorkOrderPriority, number> = {
      '低': 720,
      '中': 480,
      '高': 240,
      '紧急': 120,
    };

    const client = clients.find(c => c.id === device.client_id) || randomFrom(clients);

    const maintenanceNotes = [
      '检查液压系统，更换液压油滤芯，补充液压油。',
      '发动机常规保养，更换三滤及机油。',
      '故障排查：液压泵压力不足，清洗阀组后恢复正常。',
      '检查制动系统，更换磨损刹车片。',
      '电路系统检查，修复松动连接线束。',
      '更换空气滤芯，清理散热器积尘。',
    ];

    const feedbacks = [
      '服务很专业，师傅技术好，设备已恢复正常。',
      '响应速度快，处理及时，满意。',
      '师傅态度好，耐心解答问题。',
      '维修质量不错，后续继续观察。',
    ];

    workOrders.push({
      id: generateId(),
      device_id: device.id,
      device,
      technician_id: technicianId,
      technician: technicianId ? chosenTech : undefined,
      client_id: client.id,
      client_name: client.name,
      type: device.type,
      priority,
      status,
      created_at: formatDateTime(createdDate),
      assigned_at: assignedDate ? formatDateTime(assignedDate) : null,
      arrived_at: arrivedDate ? formatDateTime(arrivedDate) : null,
      completed_at: completedDate ? formatDateTime(completedDate) : null,
      sla_deadline_minutes: slaMap[priority],
      downtime_minutes: completedDate && arrivedDate
        ? Math.round((completedDate.getTime() - arrivedDate.getTime()) / 60000)
        : null,
      maintenance_note: status === '已完成' || status === '已退回' || status === '待验收'
        ? randomFrom(maintenanceNotes)
        : null,
      client_rating: status === '已完成' ? randomInt(3, 5) : null,
      client_feedback: status === '已完成' && Math.random() < 0.7 ? randomFrom(feedbacks) : null,
      sync_status: randomFrom<SyncStatus>(['synced', 'synced', 'synced', 'pending', 'failed']),
      materials: [],
      photos: [],
    });
  }

  return workOrders;
};

export const generateMockMaterialItems = (workOrders: WorkOrder[]): MaterialItem[] => {
  const items: MaterialItem[] = [];
  const completedOrders = workOrders.filter(
    wo => wo.status === '已完成' || wo.status === '待验收' || wo.status === '进行中'
  );

  completedOrders.forEach(wo => {
    if (Math.random() < 0.8) {
      const itemCount = randomInt(1, 4);
      const usedParts = new Set<string>();
      for (let i = 0; i < itemCount; i++) {
        const part = randomFrom(COMMON_PARTS);
        if (usedParts.has(part.part_no)) continue;
        usedParts.add(part.part_no);
        items.push({
          id: generateId(),
          work_order_id: wo.id,
          part_name: part.name,
          part_no: part.part_no,
          quantity: randomInt(1, 3),
          unit_price: part.price,
        });
      }
    }
  });

  return items;
};

export const generateMockPhotoAttachments = (workOrders: WorkOrder[]): PhotoAttachment[] => {
  const attachments: PhotoAttachment[] = [];
  const completedOrders = workOrders.filter(
    wo => wo.status === '已完成' || wo.status === '待验收' || wo.status === '进行中'
  );

  const categories: Array<'before' | 'during' | 'after'> = ['before', 'during', 'after'];

  completedOrders.forEach(wo => {
    if (Math.random() < 0.7) {
      const photoCount = randomInt(2, 5);
      for (let i = 0; i < photoCount; i++) {
        const category = categories[i % 3];
        const takenDate = wo.arrived_at
          ? addMinutes(new Date(wo.arrived_at), randomInt(5, 240))
          : randomDateTimeWithin7Days();
        attachments.push({
          id: generateId(),
          work_order_id: wo.id,
          data_url: '',
          category,
          taken_at: formatDateTime(takenDate),
        });
      }
    }
  });

  return attachments;
};

export const generateMockMaintenanceLogs = (
  devices: Device[],
  workOrders: WorkOrder[]
): MaintenanceLog[] => {
  const logs: MaintenanceLog[] = [];

  devices.forEach(device => {
    const config = MAINTENANCE_CONFIG[device.type];
    const cycles = Math.floor(device.last_maintenance_hours / config.interval_hours);
    const logCount = Math.min(cycles, randomInt(2, 5));

    for (let i = 0; i < logCount; i++) {
      const logDate = new Date();
      logDate.setMonth(logDate.getMonth() - randomInt(1, 18));
      const hoursAtMaintenance = (i + 1) * config.interval_hours;
      const relatedWO = workOrders.find(wo => wo.device_id === device.id && wo.status === '已完成');
      const partsUsed = COMMON_PARTS.slice(0, randomInt(2, 5)).map(p => p.name);

      logs.push({
        id: generateId(),
        device_id: device.id,
        work_order_id: relatedWO ? relatedWO.id : null,
        maintenance_type: randomFrom(['常规保养', '故障维修', '定期检查']),
        maintenance_hours: hoursAtMaintenance,
        technician_id: relatedWO?.technician_id || null,
        technician_name: relatedWO?.technician?.name || null,
        parts_used: partsUsed,
        total_cost: partsUsed.reduce((sum, name) => {
          const part = COMMON_PARTS.find(p => p.name === name);
          return sum + (part ? part.price * randomInt(1, 2) : 0);
        }, randomInt(200, 600)),
        note: Math.random() < 0.5 ? '设备状态良好，按计划完成保养作业。' : null,
        created_at: formatDateTime(logDate),
        synced_at: formatDateTime(logDate),
      });
    }
  });

  return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export interface MockDataSet {
  clients: Client[];
  devices: Device[];
  technicians: Technician[];
  workOrders: WorkOrder[];
  materialItems: MaterialItem[];
  photoAttachments: PhotoAttachment[];
  maintenanceLogs: MaintenanceLog[];
}

export const generateAllMockData = (): MockDataSet => {
  const clients = generateMockClients();
  const devices = generateMockDevices(clients);
  const technicians = generateMockTechnicians(devices);
  const workOrders = generateMockWorkOrders(devices, technicians, clients);
  const materialItems = generateMockMaterialItems(workOrders);
  const photoAttachments = generateMockPhotoAttachments(workOrders);
  const maintenanceLogs = generateMockMaintenanceLogs(devices, workOrders);

  return {
    clients,
    devices,
    technicians,
    workOrders,
    materialItems,
    photoAttachments,
    maintenanceLogs,
  };
};
