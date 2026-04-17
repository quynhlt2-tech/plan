import { WeeklyData, DayData } from '../types';

export const getWeekDays = (weekNumber: number, year: number) => {
  const janFirst = new Date(year, 0, 1);
  const dayOffset = (janFirst.getDay() + 6) % 7;
  const firstMonday = new Date(year, 0, 1 + (0 - dayOffset + (dayOffset > 3 ? 7 : 0)));
  
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  
  const days: { name: string; date: string; fullDate: Date }[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(targetMonday);
    d.setDate(targetMonday.getDate() + i);
    days.push({
      name: dayNames[i],
      date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      fullDate: d
    });
  }
  
  return {
    days,
    startDate: days[0].date,
    endDate: days[4].date
  };
};

export const generateEmptyWeek = (weekNumber: number, year: number): WeeklyData => {
  const { days, startDate, endDate } = getWeekDays(weekNumber, year);
  
  return {
    weekKey: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
    weekNumber,
    year,
    startDate,
    endDate,
    days: days.map(d => ({
      id: d.name.toLowerCase(),
      name: d.name,
      date: d.date,
      tasks: []
    })),
    goals: []
  };
};

export const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const getCurrentWeekKey = () => {
  const now = new Date();
  const week = getWeekNumber(now);
  const year = now.getFullYear();
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

export const isToday = (dayName: string, weekKey: string) => {
  const now = new Date();
  const currentWeekKey = getCurrentWeekKey();
  if (weekKey !== currentWeekKey) return false;
  
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const todayIndex = now.getDay() - 1; // 0 = Monday, 4 = Friday
  
  return dayNames[todayIndex] === dayName.toLowerCase();
};

export const getWeekRangeStr = (weekNumber: number, year: number) => {
  const { startDate, endDate } = getWeekDays(weekNumber, year);
  return `${startDate} - ${endDate}`;
};
