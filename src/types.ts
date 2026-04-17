export type Role = 'Leader' | 'Member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  color: string;
  password?: string; // Optional because we don't send it to client in real apps, but for mock it's okay
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  docType?: 'doc' | 'sheet' | 'slide' | 'link';
  poId: string; // ID of the PO assigned to this task (ownerId)
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface DayData {
  id: string;
  name: string;
  date: string;
  tasks: Task[];
}

export interface WeeklyData {
  weekKey: string; // Format: YYYY-Wxx
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  days: DayData[];
  goals: { id: string; text: string; poId?: string }[];
}

export interface PlannerStorage {
  [weekKey: string]: WeeklyData;
}
