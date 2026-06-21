import { create } from 'zustand';
import {
  generateAllMockData,
} from '../data/mockData';
import type {
  Device,
  Technician,
  WorkOrder,
  Client,
  MaterialItem,
  PhotoAttachment,
} from '../types';

export type UserRole = 'rental' | 'dispatch' | 'tech' | 'client' | null;

export interface MaintenanceStatus {
  remainingHours: number;
  percent: number;
  needsMaintenance: boolean;
  urgent: boolean;
}

export interface MatchResult {
  technician: Technician;
  score: number;
  distanceKm: number;
  matchedSkills: string[];
  loadFactor: number;
}

export interface AppState {
  devices: Device[];
  technicians: Technician[];
  workOrders: WorkOrder[];
  clients: Client[];
  currentRole: UserRole;
  currentUserId: string | null;
  onlineStatus: boolean;
  pendingSyncCount: number;
  loading: boolean;

  setRole: (role: UserRole, userId?: string) => void;
  setDevices: (devices: Device[]) => void;
  addOrUpdateDevice: (device: Device) => void;
  setTechnicians: (technicians: Technician[]) => void;
  setWorkOrders: (workOrders: WorkOrder[]) => void;
  addOrUpdateWorkOrder: (workOrder: WorkOrder) => void;
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => void;
  addMaterialItem: (workOrderId: string, item: MaterialItem) => void;
  addPhotoAttachment: (workOrderId: string, photo: PhotoAttachment) => void;
  setOnlineStatus: (online: boolean) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
  syncAllPending: () => Promise<void>;
}

const allMockData = generateAllMockData();

const workOrdersWithRelations: WorkOrder[] = allMockData.workOrders.map(wo => ({
  ...wo,
  materials: allMockData.materialItems.filter(m => m.work_order_id === wo.id),
  photos: allMockData.photoAttachments.filter(p => p.work_order_id === wo.id),
}));

const mockData = {
  devices: allMockData.devices,
  technicians: allMockData.technicians,
  workOrders: workOrdersWithRelations,
  clients: allMockData.clients,
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateMaintenanceStatus(device: Device): MaintenanceStatus {
  const hoursSinceMaintenance = device.current_hours - device.last_maintenance_hours;
  const remainingHours = Math.max(0, device.maintenance_interval - hoursSinceMaintenance);
  const percent = (hoursSinceMaintenance / device.maintenance_interval) * 100;
  const urgent = remainingHours <= device.maintenance_interval * 0.1;
  const needsMaintenance = remainingHours <= device.maintenance_interval * 0.2;

  return {
    remainingHours,
    percent: Math.min(100, Math.max(0, percent)),
    needsMaintenance,
    urgent,
  };
}

export function createStore(initialData = mockData) {
  return create<AppState>((set, get) => ({
    devices: initialData.devices,
    technicians: initialData.technicians,
    workOrders: initialData.workOrders,
    clients: initialData.clients,
    currentRole: null,
    currentUserId: null,
    onlineStatus: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingSyncCount: initialData.workOrders.filter(wo => wo.sync_status === 'pending').length,
    loading: false,

    setRole: (role, userId) => set({ currentRole: role, currentUserId: userId ?? null }),

    setDevices: (devices) => set({ devices }),

    addOrUpdateDevice: (device) => set((state) => {
      const idx = state.devices.findIndex(d => d.id === device.id);
      if (idx >= 0) {
        const devices = [...state.devices];
        devices[idx] = device;
        return { devices };
      }
      return { devices: [...state.devices, device] };
    }),

    setTechnicians: (technicians) => set({ technicians }),

    setWorkOrders: (workOrders) => set({ workOrders }),

    addOrUpdateWorkOrder: (workOrder) => set((state) => {
      const idx = state.workOrders.findIndex(wo => wo.id === workOrder.id);
      if (idx >= 0) {
        const workOrders = [...state.workOrders];
        workOrders[idx] = { ...workOrder, updated_at: new Date().toISOString() };
        return { workOrders };
      }
      return { workOrders: [...state.workOrders, { ...workOrder, updated_at: new Date().toISOString() }] };
    }),

    updateWorkOrderStatus: (id, status) => set((state) => ({
      workOrders: state.workOrders.map(wo =>
        wo.id === id
          ? {
              ...wo,
              status,
              updated_at: new Date().toISOString(),
              completed_at: status === '已完成' ? new Date().toISOString() : wo.completed_at,
            }
          : wo
      ),
    })),

    addMaterialItem: (workOrderId, item) => set((state) => ({
      workOrders: state.workOrders.map(wo =>
        wo.id === workOrderId
          ? { ...wo, materials: [...wo.materials, item], updated_at: new Date().toISOString() }
          : wo
      ),
    })),

    addPhotoAttachment: (workOrderId, photo) => set((state) => ({
      workOrders: state.workOrders.map(wo =>
        wo.id === workOrderId
          ? { ...wo, photos: [...wo.photos, photo], updated_at: new Date().toISOString() }
          : wo
      ),
    })),

    setOnlineStatus: (online) => set({ onlineStatus: online }),

    incrementPendingSync: () => set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),

    decrementPendingSync: () => set((state) => ({ pendingSyncCount: Math.max(0, state.pendingSyncCount - 1) })),

    syncAllPending: async () => {
      const { workOrders } = get();
      set({ loading: true });
      await new Promise(resolve => setTimeout(resolve, 800));
      const updatedWorkOrders = workOrders.map(wo =>
        wo.sync_status === 'pending'
          ? { ...wo, sync_status: 'synced' as const, updated_at: new Date().toISOString() }
          : wo
      );
      set({ workOrders: updatedWorkOrders, pendingSyncCount: 0, loading: false });
    },
  }));
}

export const useAppStore = createStore();

export function matchTechnicians(workOrderId: string, state: Pick<AppState, 'workOrders' | 'devices' | 'technicians'>): MatchResult[] {
  const workOrder = state.workOrders.find(wo => wo.id === workOrderId);
  if (!workOrder) return [];

  const device = state.devices.find(d => d.id === workOrder.device_id);
  if (!device) return [];

  const results: MatchResult[] = state.technicians.map(tech => {
    const distanceKm = calculateDistance(
      device.latitude, device.longitude,
      tech.latitude, tech.longitude
    );

    const matchedSkills = tech.skills.filter(s => device.type === s);
    const skillMatchRatio = matchedSkills.length > 0 ? 1 : 0.3;
    const loadFactor = 1 - (tech.workload / 8);
    const distanceScore = Math.max(0, 1 - (distanceKm / 20));

    const score = skillMatchRatio * 0.5 + distanceScore * 0.3 + loadFactor * 0.2;

    return {
      technician: tech,
      score,
      distanceKm: Math.round(distanceKm * 100) / 100,
      matchedSkills,
      loadFactor: Math.round(loadFactor * 100) / 100,
    };
  });

  return results.sort((a, b) => b.score - a.score);
}
