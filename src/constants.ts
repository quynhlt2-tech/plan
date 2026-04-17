import { WeeklyData, Member } from './types';

export const MEMBERS: Member[] = [
  { id: 'po1', name: 'Quynh PO', email: 'po1', password: 'password', avatar: '👩‍💻', color: 'bg-pink-500' },
  { id: 'po2', name: 'Lam PO', email: 'po2', password: 'password', avatar: '👨‍💻', color: 'bg-blue-500' },
  { id: 'po3', name: 'An PO', email: 'po3', password: 'password', avatar: '🦸', color: 'bg-amber-500' },
];

export const INITIAL_DATA: WeeklyData = {
  weekKey: '2026-W16',
  weekNumber: 16,
  year: 2026,
  startDate: '13/04',
  endDate: '17/04',
  days: [
    {
      id: 'monday',
      name: 'Monday',
      date: '13/04',
      tasks: [
        { id: '1', text: 'Check report & update M28', completed: true, docType: 'doc', poId: 'po1' },
        { id: '2', text: 'Weekly Sync Meeting', completed: true, poId: 'po2' },
        { id: '3', text: 'Check report M22', completed: true, poId: 'po1' },
      ],
    },
    {
      id: 'tuesday',
      name: 'Tuesday',
      date: '14/04',
      tasks: [
        { id: '4', text: 'M04- Update ads luồng mở ....', completed: true, docType: 'doc', poId: 'po1' },
        { id: '5', text: 'Spec review Phase 6', completed: false, docType: 'doc', poId: 'po2' },
      ],
    },
    {
      id: 'wednesday',
      name: 'Wednesday',
      date: '15/04',
      tasks: [
        { id: '7', text: 'UI Acceptance Testing', completed: false, poId: 'po3' },
        { id: '8', text: 'Customer Research Call', completed: false, poId: 'po1' },
      ],
    },
    {
      id: 'thursday',
      name: 'Thursday',
      date: '16/04',
      tasks: [
        { id: '10', text: 'Refine Product Backlog', completed: false, poId: 'po2' },
      ],
    },
    {
      id: 'friday',
      name: 'Friday',
      date: '17/04',
      tasks: [
        { id: '12', text: 'Check report M01', completed: false, docType: 'sheet', poId: 'po3' },
      ],
    },
  ],
  goals: [
    { id: 'g1', text: 'M22: Check report & Update data order của MKT' },
    { id: 'g2', text: 'M04: Update ads luồng mở' },
  ],
};
