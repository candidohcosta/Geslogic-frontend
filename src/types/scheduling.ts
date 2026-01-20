// src/types/scheduling.ts
export enum ResourceType {
  USER = 'USER',
  ROOM = 'ROOM',
  EQUIPMENT = 'EQUIPMENT'
}

// Estrutura de um intervalo de tempo (Slot)
export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "18:00"
}

// Estrutura da Semana
export interface WorkingHours {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
  [key: string]: TimeSlot[] | undefined; // Index signature para facilitar iterações
}

export interface SchedulingResource {
  id: string;
  name: string;
  type: ResourceType;
  timezone: string;
  workingHours: WorkingHours;
  createdAt: string;
  locationName?: string;
  address?: string;  
}

export interface SchedulingProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  integratesWithQueue: boolean;
  linkedQueueService?: { id: string; name: string };
  assignableResources: SchedulingResource[];
}