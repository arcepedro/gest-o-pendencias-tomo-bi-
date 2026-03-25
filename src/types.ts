import { LucideIcon } from 'lucide-react';

export enum Unit {
  NARANDIBA = 'Narandiba',
  PARAGUACU = 'Paraguaçu',
  SP = 'SP'
}

export interface Occurrence {
  id: string;
  unit: string;
  creator: string;
  number: string;
  supervisor: string;
  farm: string;
  plot: string;
  sector: string;
  category: string;
  subcategory: string;
  observation: string;
  isCompleted: boolean;
  createdAt: string;
  completedAt: string;
  isDeleted: boolean;
  actionPlanStatus?: string;
  rawData?: Record<string, any>;
}

export interface ActionPlan {
  id: string;
  occurrenceId: string;
  unit: string;
  creator: string;
  supervisor: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  description: string;
  isCompleted: boolean;
  farm: string;
  plot: string;
  rawData?: Record<string, any>;
}

export interface SupervisorStats {
  name: string;
  totalOccurrences: number;
  pendingOccurrences: number;
  totalActionPlans: number;
  pendingActionPlans: number;
}
