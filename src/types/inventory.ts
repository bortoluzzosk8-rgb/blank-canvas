export type EquipmentStatus = 'disponivel' | 'manutencao';

export type Equipment = {
  id: string;
  name: string;
  value: number;
  rentalValue: number;
  code: string;
  manufactureDate?: string;
  franchiseId: string;
  status: EquipmentStatus;
  maintenanceNote?: string;
  imageUrl?: string[];
  notes?: string;
  blocksReservations?: boolean;
};

export type MovementHistory = {
  id: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  fromFranchiseId?: string;
  toFranchiseId: string;
  movedAt: string;
  movedBy?: string;
  notes?: string;
  fromFranchiseName?: string;
  fromFranchiseCity?: string;
  toFranchiseName?: string;
  toFranchiseCity?: string;
};

export type ArchivedEquipment = {
  id: string;
  originalItemId?: string;
  name: string;
  value: number;
  rentalValue: number;
  code: string;
  manufactureDate?: string;
  franchiseId: string;
  deletedAt: string;
  deletedBy?: string;
  reason: 'vendido' | 'sucateado' | 'outro';
  notes?: string;
  imageUrl?: string[];
};

export type Franchise = {
  id: string;
  name: string;
  city: string;
};

export type MovementNeed = {
  saleId: string;
  clientName: string;
  rentalStartDate: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  originFranchiseId: string;
  originFranchiseName: string;
  originFranchiseCity: string;
  targetFranchiseId: string;
  targetFranchiseName: string;
  targetFranchiseCity: string;
};
