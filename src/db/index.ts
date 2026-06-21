import Dexie, { type Table } from 'dexie';
import type { WorkOrder, MaterialItem, PhotoAttachment } from '../types';

interface DBWorkOrder extends Omit<WorkOrder, 'materials' | 'photos' | 'technician_id'> {
  sync_status: 'synced' | 'pending' | 'failed';
  updated_at: string;
  technician_id?: string | null;
}

type DBMaterial = MaterialItem;

type DBPhoto = PhotoAttachment;

export class MaintenanceDB extends Dexie {
  work_orders!: Table<DBWorkOrder, string>;
  materials!: Table<DBMaterial, string>;
  photos!: Table<DBPhoto, string>;

  constructor() {
    super('MaintenanceDB');
    this.version(1).stores({
      work_orders: 'id, status, sync_status, technician_id, updated_at',
      materials: 'id, work_order_id',
      photos: 'id, work_order_id'
    });
  }
}

export const db = new MaintenanceDB();

function toDBWorkOrder(wo: WorkOrder): DBWorkOrder {
  return {
    id: wo.id,
    device_id: wo.device_id,
    device: wo.device,
    technician_id: wo.technician_id ?? undefined,
    technician: wo.technician,
    client_id: wo.client_id,
    client_name: wo.client_name,
    type: wo.type,
    priority: wo.priority,
    status: wo.status,
    created_at: wo.created_at,
    assigned_at: wo.assigned_at,
    arrived_at: wo.arrived_at,
    completed_at: wo.completed_at,
    sla_deadline_minutes: wo.sla_deadline_minutes,
    downtime_minutes: wo.downtime_minutes,
    maintenance_note: wo.maintenance_note,
    client_rating: wo.client_rating,
    client_feedback: wo.client_feedback,
    sync_status: wo.sync_status ?? 'pending',
    updated_at: wo.updated_at ?? new Date().toISOString(),
  };
}

function fromDBWorkOrder(dbwo: DBWorkOrder, materials: DBMaterial[], photos: DBPhoto[]): WorkOrder {
  return {
    ...dbwo,
    sync_status: dbwo.sync_status,
    updated_at: dbwo.updated_at,
    technician_id: dbwo.technician_id ?? null,
    materials,
    photos
  };
}

export async function saveWorkOrderDraft(wo: WorkOrder): Promise<void> {
  const dbwo = toDBWorkOrder(wo);
  dbwo.sync_status = 'pending';
  dbwo.updated_at = new Date().toISOString();

  await db.transaction('rw', db.work_orders, db.materials, db.photos, async () => {
    await db.work_orders.put(dbwo);

    await db.materials.where('work_order_id').equals(wo.id).delete();
    if (wo.materials.length > 0) {
      await db.materials.bulkPut(wo.materials);
    }

    await db.photos.where('work_order_id').equals(wo.id).delete();
    if (wo.photos.length > 0) {
      await db.photos.bulkPut(wo.photos);
    }
  });
}

export async function getPendingWorkOrders(): Promise<WorkOrder[]> {
  const dbwos = await db.work_orders.where('sync_status').equals('pending').toArray();
  const ids = dbwos.map(wo => wo.id);

  const materials = await db.materials.where('work_order_id').anyOf(ids).toArray();
  const photos = await db.photos.where('work_order_id').anyOf(ids).toArray();

  return dbwos.map(dbwo => fromDBWorkOrder(
    dbwo,
    materials.filter(m => m.work_order_id === dbwo.id),
    photos.filter(p => p.work_order_id === dbwo.id)
  ));
}

export async function saveMaterial(item: MaterialItem): Promise<void> {
  await db.materials.put(item);
}

export async function savePhoto(photo: PhotoAttachment): Promise<void> {
  await db.photos.put(photo);
}

export async function markSynced(id: string): Promise<void> {
  await db.work_orders.update(id, {
    sync_status: 'synced',
    updated_at: new Date().toISOString()
  });
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.work_orders, db.materials, db.photos, async () => {
    await db.work_orders.clear();
    await db.materials.clear();
    await db.photos.clear();
  });
}
