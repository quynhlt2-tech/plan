/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  FileSpreadsheet, 
  FileStack, 
  Link as LinkIcon, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  Moon,
  Sun,
  ChevronDown,
  Calendar,
  Filter,
  User as UserIcon,
  Users,
  Target,
  LogOut,
  Eye,
  EyeOff,
  Save,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { WeeklyData, Task, DayData, PlannerStorage, Member, Role, User } from './types';
import { INITIAL_DATA, MEMBERS } from './constants';
import { generateEmptyWeek, getCurrentWeekKey, isToday, getWeekRangeStr } from './lib/dateUtils';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';

const STORAGE_KEY = 'po_planner_all_weeks';
const FILTER_KEY = 'po_planner_selected_po';
const LAST_WEEK_KEY = 'po_planner_last_week';
const MEMBERS_KEY = 'po_planner_members';

export default function App() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  
  const [storage, setStorage] = useState<PlannerStorage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return { [INITIAL_DATA.weekKey]: INITIAL_DATA };
  });

  const [members, setMembers] = useState<Member[]>(() => {
    // Sync members with all users in simulated DB
    const savedUsers = localStorage.getItem('po_planner_all_users');
    if (savedUsers) {
      const users = JSON.parse(savedUsers);
      return users.filter((u: User) => u.role === 'Member');
    }
    return MEMBERS.filter(m => m.id !== 'all');
  });

  const [currentWeekKey, setCurrentWeekKey] = useState(getCurrentWeekKey());
  const [selectedPoId, setSelectedPoId] = useState('');

  // Auto-set selectedPoId based on user role
  useEffect(() => {
    if (user) {
      if (user.role === 'Member') {
        setSelectedPoId(user.id);
      } else if (!selectedPoId || !members.find(m => m.id === selectedPoId)) {
        // Find "admin" in members if exists, otherwise first member
        const defaultPo = members.find(m => m.id === 'po1') || members[0];
        setSelectedPoId(defaultPo?.id || '');
      }
      // Focus Today on login
      goToToday();
    }
  }, [user, user?.role, members]);

  const [darkMode, setDarkMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'task' | 'goal'>('task');
  const [isWeekPickerOpen, setIsWeekPickerOpen] = useState(false);
  const [isPOManagerOpen, setIsPOManagerOpen] = useState(false);

  // Drag and drop sensor configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const data = useMemo(() => {
    return storage[currentWeekKey] || generateEmptyWeek(parseInt(currentWeekKey.split('-W')[1]), parseInt(currentWeekKey.split('-W')[0]));
  }, [storage, currentWeekKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }, [storage]);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, selectedPoId);
  }, [selectedPoId]);

  useEffect(() => {
    localStorage.setItem(LAST_WEEK_KEY, currentWeekKey);
  }, [currentWeekKey]);

  useEffect(() => {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  }, [members]);

  const currentUser = useMemo(() => 
    members.find(m => m.id === selectedPoId) || (user?.role === 'Member' && user.id === selectedPoId ? user : null), 
  [members, selectedPoId, user]);

  const filteredData = useMemo(() => {
    return {
      ...data,
      days: data.days.map(day => ({
        ...day,
        tasks: day.tasks.filter(task => task.poId === selectedPoId)
      })),
      goals: data.goals.filter(goal => !goal.poId || goal.poId === selectedPoId)
    };
  }, [data, selectedPoId]);

  const progress = useMemo(() => {
    const allTasks = filteredData.days.flatMap(d => d.tasks);
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.completed).length;
    return Math.round((completed / allTasks.length) * 100);
  }, [filteredData]);

  const updateCurrentWeek = (weekData: WeeklyData) => {
    setStorage(prev => ({
      ...prev,
      [currentWeekKey]: weekData
    }));
  };

  const navigateWeek = (direction: 'next' | 'prev') => {
    const [year, weekStr] = currentWeekKey.split('-W');
    let y = parseInt(year);
    let w = parseInt(weekStr);

    if (direction === 'next') {
      w++;
      if (w > 52) { w = 1; y++; }
    } else {
      w--;
      if (w < 1) { w = 52; y--; }
    }

    const nextKey = `${y}-W${w.toString().padStart(2, '0')}`;
    
    // Ensure data exists for the next week
    if (!storage[nextKey]) {
      setStorage(prev => ({
        ...prev,
        [nextKey]: generateEmptyWeek(w, y)
      }));
    }
    setCurrentWeekKey(nextKey);
  };

  const goToToday = () => {
    const todayKey = getCurrentWeekKey();
    if (!storage[todayKey]) {
      const parts = todayKey.split('-W');
      setStorage(prev => ({
        ...prev,
        [todayKey]: generateEmptyWeek(parseInt(parts[1]), parseInt(parts[0]))
      }));
    }
    setCurrentWeekKey(todayKey);
    
    // Smooth scroll to today card
    setTimeout(() => {
      const todayEl = document.querySelector('[data-today="true"]');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const addMember = (name: string, email: string, password?: string) => {
    const newId = `po-${Date.now()}`;
    const newMember: User = {
      id: newId,
      name,
      email: email || name.toLowerCase().replace(/\s+/g, ''),
      password: password || '123456',
      role: 'Member',
      avatar: '👨‍💼',
      color: 'bg-indigo-500'
    };
    
    // Update all users list
    const savedUsers = localStorage.getItem('po_planner_all_users');
    const allUsers = savedUsers ? JSON.parse(savedUsers) : [];
    localStorage.setItem('po_planner_all_users', JSON.stringify([...allUsers, newMember]));
    
    setMembers(prev => [...prev, {
      id: newMember.id,
      name: newMember.name,
      email: newMember.email,
      password: newMember.password,
      avatar: newMember.avatar,
      color: newMember.color
    }]);
    setSelectedPoId(newMember.id);
  };

  const updateMember = (id: string, name: string, email?: string, password?: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { 
      ...m, 
      name, 
      ...(email ? { email } : {}), 
      ...(password ? { password } : {}) 
    } : m));
    
    const savedUsers = localStorage.getItem('po_planner_all_users');
    if (savedUsers) {
      const allUsers = JSON.parse(savedUsers);
      localStorage.setItem('po_planner_all_users', JSON.stringify(
        allUsers.map((u: User) => u.id === id ? { 
          ...u, 
          name, 
          ...(email ? { email } : {}), 
          ...(password ? { password } : {}) 
        } : u)
      ));
    }
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(prev => prev.filter(m => m.id !== id));
    
    const savedUsers = localStorage.getItem('po_planner_all_users');
    if (savedUsers) {
      const allUsers = JSON.parse(savedUsers);
      localStorage.setItem('po_planner_all_users', JSON.stringify(
        allUsers.filter((u: User) => u.id !== id)
      ));
    }

    if (selectedPoId === id) {
      setSelectedPoId(members.find(m => m.id !== id)?.id || '');
    }
  };

  const selectWeek = (weekNum: number) => {
    const year = parseInt(currentWeekKey.split('-W')[0]);
    const nextKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    if (!storage[nextKey]) {
      setStorage(prev => ({
        ...prev,
        [nextKey]: generateEmptyWeek(weekNum, year)
      }));
    }
    setCurrentWeekKey(nextKey);
    setIsWeekPickerOpen(false);
  };

  const toggleTask = (dayId: string, taskId: string) => {
    const task = data.days.find(d => d.id === dayId)?.tasks.find(t => t.id === taskId);
    if (!task || task.poId !== selectedPoId) return;

    const newData = {
      ...data,
      days: data.days.map(day => 
        day.id === dayId 
          ? { 
              ...day, 
              tasks: day.tasks.map(task => 
                task.id === taskId ? { ...task, completed: !task.completed } : task
              ) 
            }
          : day
      )
    };
    updateCurrentWeek(newData);
  };

  const updateTaskText = (dayId: string, taskId: string, newText: string) => {
    const task = data.days.find(d => d.id === dayId)?.tasks.find(t => t.id === taskId);
    if (!task || task.poId !== selectedPoId) return;

    const newData = {
      ...data,
      days: data.days.map(day => 
        day.id === dayId 
          ? { 
              ...day, 
              tasks: day.tasks.map(task => 
                task.id === taskId ? { ...task, text: newText } : task
              ) 
            }
          : day
      )
    };
    updateCurrentWeek(newData);
  };

  const updateGoalText = (goalId: string, newText: string) => {
    const newData = {
      ...data,
      goals: data.goals.map(goal => 
        goal.id === goalId ? { ...goal, text: newText } : goal
      )
    };
    updateCurrentWeek(newData);
  };

  const addTask = (dayId: string, text: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      poId: selectedPoId,
      docType: text.toLowerCase().includes('report') ? 'sheet' : 
               text.toLowerCase().includes('spec') ? 'doc' : undefined
    };

    const newData = {
      ...data,
      days: data.days.map(day => 
        day.id === dayId ? { ...day, tasks: [...day.tasks, newTask] } : day
      )
    };
    updateCurrentWeek(newData);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeDay = data.days.find(d => d.tasks.some(t => t.id === activeId));
    const overDay = data.days.find(d => d.id === overId || d.tasks.some(t => t.id === overId));

    if (!activeDay || !overDay || activeDay === overDay) return;

    const activeTask = activeDay.tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const newDays = data.days.map(day => {
      if (day.id === activeDay.id) {
        return { ...day, tasks: day.tasks.filter(t => t.id !== activeId) };
      }
      if (day.id === overDay.id) {
        return { ...day, tasks: [...day.tasks, activeTask] };
      }
      return day;
    });

    updateCurrentWeek({ ...data, days: newDays });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      const activeDay = data.days.find(d => d.tasks.some(t => t.id === activeId));
      if (!activeDay) return;

      const oldIndex = activeDay.tasks.findIndex(t => t.id === activeId);
      const newIndex = activeDay.tasks.findIndex(t => t.id === overId);

      if (newIndex !== -1) {
        const newTasks = arrayMove(activeDay.tasks, oldIndex, newIndex);
        const newDays = data.days.map(day => 
          day.id === activeDay.id ? { ...day, tasks: newTasks } : day
        );
        updateCurrentWeek({ ...data, days: newDays });
      }
    }
  };

  const addGoal = (text: string) => {
    const newData = {
      ...data,
      goals: [...data.goals, { id: crypto.randomUUID(), text, poId: selectedPoId }]
    };
    updateCurrentWeek(newData);
  };

  const removeTask = (dayId: string, taskId: string) => {
    const task = data.days.find(d => d.id === dayId)?.tasks.find(t => t.id === taskId);
    if (!task || task.poId !== selectedPoId) return;

    const newData = {
      ...data,
      days: data.days.map(day => 
        day.id === dayId ? { ...day, tasks: day.tasks.filter(t => t.id !== taskId) } : day
      )
    };
    updateCurrentWeek(newData);
  };

  const removeGoal = (goalId: string) => {
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal || (user?.role === 'Member' && goal.poId !== user.id)) return;

    const newData = {
      ...data,
      goals: data.goals.filter(g => g.id !== goalId)
    };
    updateCurrentWeek(newData);
  };

  if (isAuthLoading) return null;
  if (!user) return <Login />;

  return (
    <div className={`flex flex-col min-h-screen font-sans bg-bg-primary text-text-main transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="h-[60px] bg-header-bg text-white flex items-center justify-between px-6 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-blue flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20">
              PO
            </div>
            <h1 className="text-[18px] font-bold tracking-tight">Weekly Planner</h1>
          </div>
          
          {user.role === 'Leader' ? (
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 group relative">
                <UserIcon size={14} className="text-blue-300" />
                <select 
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer pr-1"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id} className="text-slate-900">{m.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setIsPOManagerOpen(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-blue-200"
                title="Manage Teams"
              >
                <Users size={16} />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 cursor-default">
              <UserIcon size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300">{user.name}</span>
              <span className="text-[10px] font-black bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-400 uppercase">Self</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-blue-100 mr-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <div className={`w-2 h-2 rounded-full ${currentUser?.color || 'bg-slate-400'}`}></div>
            <span className="text-xs font-bold tracking-tight">
              {user.role === 'Leader' ? `Viewing: ${currentUser?.name || 'All'}` : `Planner: ${user.name}`}
            </span>
          </div>
          
          <button 
            onClick={goToToday}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
          >
            <Target size={16} />
            <span className="hidden sm:inline">Today</span>
          </button>
          
          <div className="h-6 w-[1px] bg-white/20 mx-2" />
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button 
            onClick={logout}
            className="flex items-center gap-2 p-2 rounded-full hover:bg-red-500/20 transition-colors text-red-300"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <section className="flex-1 p-[24px] flex flex-col gap-[20px] overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {/* Week Info & Navigation */}
          <div className="flex flex-col gap-4">
            {/* Welcome banner after login */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-accent-blue/5 border border-accent-blue/10 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${user.color} flex items-center justify-center text-xl shadow-lg shadow-blue-500/10`}>
                  {user.avatar}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Welcome back, {user.name}! 🚀
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {user.role === 'Leader' 
                      ? "You are logged in as a Leader. You can view all member dashboards." 
                      : "Focused and ready. Only your private planner is visible."}
                  </p>
                </div>
              </div>
              <div className="pr-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Week Performance
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-accent-blue">{progress}%</span>
                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-accent-blue"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button 
                    onClick={() => setIsWeekPickerOpen(!isWeekPickerOpen)}
                    className="group flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 border border-border-color dark:border-slate-800 rounded-xl shadow-sm hover:border-accent-blue transition-all"
                  >
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-accent-blue transition-colors">
                      <Calendar size={18} className="text-accent-blue group-hover:text-white" />
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Viewing</span>
                      <span className="font-extrabold text-slate-800 dark:text-white">Week {data.weekNumber}: {data.startDate} - {data.endDate}</span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isWeekPickerOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isWeekPickerOpen && (
                      <WeekPicker 
                        currentWeek={data.weekNumber} 
                        currentYear={data.year}
                        onSelect={selectWeek} 
                        onClose={() => setIsWeekPickerOpen(false)}
                        darkMode={darkMode}
                      />
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 border border-border-color dark:border-slate-800 shadow-sm">
                  <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="text-[12px] font-bold text-text-muted uppercase tracking-widest">Progress</div>
                <div className="flex items-center gap-3">
                  <div className="text-[18px] font-extrabold text-accent-blue">{progress}%</div>
                </div>
              </div>
            </div>

            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: `${progress}%` }}
                className="h-full bg-accent-blue shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              />
            </div>
          </div>

          {/* Days Grid */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 flex-1 min-h-0">
              {filteredData.days.map((day) => (
                <DayCard 
                  key={day.id} 
                  day={day} 
                  weekKey={currentWeekKey}
                  onToggleTask={toggleTask}
                  onUpdateTask={updateTaskText}
                  onRemoveTask={removeTask}
                  onAddTask={addTask}
                  darkMode={darkMode}
                  members={members}
                  currentPoId={selectedPoId}
                />
              ))}
            </div>
          </DndContext>
        </section>

        <AnimatePresence>
          {isPOManagerOpen && (
            <POManager 
              members={members}
              onAdd={addMember}
              onUpdate={updateMember}
              onRemove={removeMember}
              onClose={() => setIsPOManagerOpen(false)}
              darkMode={darkMode}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className="w-[260px] bg-bg-sidebar p-[24px] relative flex-shrink-0 border-l border-border-color h-full overflow-y-auto hidden lg:flex flex-col">
          <h3 className="text-[16px] font-bold mb-4 text-text-main uppercase tracking-widest cursor-default">
            Weekly Focus Goals
          </h3>
          <div className="flex flex-col gap-4">
            {filteredData.goals.map((goal) => (
              <GoalItem 
                key={goal.id} 
                goal={goal} 
                onUpdate={updateGoalText}
                onRemove={removeGoal}
                darkMode={darkMode}
                isOwner={!goal.poId || goal.poId === selectedPoId}
              />
            ))}
          </div>

          <button 
            onClick={() => {
              setModalType('goal');
              setIsModalOpen(true);
            }}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-accent-blue text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] flex items-center justify-center text-2xl transition-transform hover:scale-105 active:scale-95"
          >
            <Plus size={24} />
          </button>
        </aside>
      </main>

      {/* FAB for Mobile/Quick Add */}
      <button 
        onClick={() => {
          setModalType('task');
          setIsModalOpen(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-12 h-12 rounded-full bg-accent-blue text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] flex items-center justify-center text-2xl z-40"
      >
        <Plus size={24} />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <Modal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            type={modalType}
            days={data.days}
            onAdd={(val, dayId) => {
              if (modalType === 'task' && dayId) {
                addTask(dayId, val);
              } else {
                addGoal(val);
              }
              setIsModalOpen(false);
            }}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekPicker({ 
  currentWeek, 
  currentYear,
  onSelect, 
  onClose,
  darkMode 
}: { 
  currentWeek: number; 
  currentYear: number;
  onSelect: (num: number) => void; 
  onClose: () => void;
  darkMode: boolean;
}) {
  const refinedQuarters = [
    { name: 'Q1', weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13] },
    { name: 'Q2', weeks: [14,15,16,17,18,19,20,21,22,23,24,25,26] },
    { name: 'Q3', weeks: [27,28,29,30,31,32,33,34,35,36,37,38,39] },
    { name: 'Q4', weeks: [40,41,42,43,44,45,46,47,48,49,50,51,52] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute top-full left-0 mt-3 w-[450px] bg-white dark:bg-slate-900 border border-border-color dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-5 overflow-hidden"
    >
      <div className="grid grid-cols-2 gap-6">
        {refinedQuarters.map(q => (
          <div key={q.name}>
            <div className="text-[11px] font-extrabold text-accent-blue uppercase mb-3 tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
               {q.name}
            </div>
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {q.weeks.map(w => (
                <button
                  key={w}
                  onClick={() => onSelect(w)}
                  className={`group relative w-full text-left px-3 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                    currentWeek === w 
                      ? 'bg-accent-blue text-white shadow-md shadow-blue-500/20' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-text-main dark:text-slate-300'
                  }`}
                >
                  <span className="text-[12px] font-bold">Week {w}</span>
                  <span className={`text-[9px] font-medium opacity-60 ${currentWeek === w ? 'text-white' : 'text-text-muted'}`}>
                    {getWeekRangeStr(w, currentYear)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

interface DayCardProps {
  key?: string | number;
  day: DayData;
  weekKey: string;
  onToggleTask: (dayId: string, taskId: string) => void;
  onUpdateTask: (dayId: string, taskId: string, newText: string) => void;
  onRemoveTask: (dayId: string, taskId: string) => void;
  onAddTask: (dayId: string, text: string) => void;
  darkMode: boolean;
  members: Member[];
  currentPoId: string;
}

function DayCard({ 
  day, 
  weekKey,
  onToggleTask, 
  onUpdateTask, 
  onRemoveTask,
  onAddTask,
  darkMode,
  members,
  currentPoId
}: DayCardProps) {
  const [quickAddText, setQuickAddText] = useState('');
  const itIsToday = isToday(day.name, weekKey);

  const handleQuickAdd = () => {
    if (quickAddText.trim()) {
      onAddTask(day.id, quickAddText);
      setQuickAddText('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-today={itIsToday}
      className={`relative flex flex-col gap-4 p-5 rounded-2xl transition-all duration-300 ${
        itIsToday 
          ? 'bg-white dark:bg-slate-950 border-2 border-accent-blue shadow-xl shadow-blue-500/10 scale-[1.02] z-10' 
          : 'bg-white dark:bg-slate-900 border border-border-color dark:border-slate-800 shadow-sm'
      }`}
    >
      {itIsToday && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-accent-blue text-white text-[9px] font-black uppercase tracking-wider rounded shadow-lg z-20">
          Today
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
        <div className="flex flex-col">
          <span className={`text-[12px] font-bold uppercase tracking-widest ${itIsToday ? 'text-accent-blue' : 'text-text-muted'}`}>
            {day.name}
          </span>
          <span className="text-[16px] font-extrabold text-slate-800 dark:text-white">
            {day.date}
          </span>
        </div>
        {itIsToday && <Target size={18} className="text-accent-blue/40" />}
      </div>
      <div className="flex flex-col gap-2.5 mb-2 min-h-[40px]">
        <SortableContext
          items={day.tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {day.tasks.map(task => (
            <TaskItem 
              key={task.id} 
              id={task.id}
              task={task} 
              onToggle={() => onToggleTask(day.id, task.id)}
              onUpdate={(val) => onUpdateTask(day.id, task.id, val)}
              onRemove={() => onRemoveTask(day.id, task.id)}
              darkMode={darkMode}
              member={members.find(m => m.id === task.poId)}
              isOwner={task.poId === currentPoId}
            />
          ))}
        </SortableContext>
      </div>
      
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="relative flex items-center group/add">
          <input 
            type="text"
            placeholder="+ Quick Add"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            className="w-full text-[12px] pl-2 pr-8 py-1.5 rounded-md border border-transparent focus:border-accent-blue/30 outline-none transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 bg-transparent text-text-muted placeholder:text-slate-400"
          />
          {quickAddText.trim() && (
            <button 
              onClick={handleQuickAdd}
              className="absolute right-2 p-1 rounded-md text-accent-blue hover:bg-accent-blue/10 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface TaskItemProps {
  key?: string | number;
  id: string;
  task: Task;
  onToggle: () => void;
  onUpdate: (val: string) => void;
  onRemove: () => void;
  darkMode: boolean;
  member?: Member;
  isOwner: boolean;
}

function TaskItem({ 
  id,
  task, 
  onToggle, 
  onUpdate,
  onRemove,
  darkMode,
  member,
  isOwner
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id,
    disabled: !isOwner
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSubmit = () => {
    if (editValue.trim()) {
      onUpdate(editValue);
    } else {
      setEditValue(task.text);
    }
    setIsEditing(false);
  };

  const IconComponent = () => {
    if (task.docType === 'doc') return <FileText size={12} className="text-blue-500 inline ml-1 opacity-70 shrink-0" />;
    if (task.docType === 'sheet') return <FileSpreadsheet size={12} className="text-emerald-500 inline ml-1 opacity-70 shrink-0" />;
    return null;
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 group bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-transparent hover:border-border-color transition-all"
    >
      <div {...attributes} {...listeners} className="mt-1 text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500">
        <MoreVertical size={14} />
      </div>

      <input 
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        className="mt-1 w-[14px] h-[14px] cursor-pointer"
      />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full text-[13px] bg-transparent border-b border-accent-blue outline-none py-0.5"
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 group/text">
              <span 
                onClick={() => isOwner && setIsEditing(true)}
                className={`text-[13px] leading-snug break-words transition-all ${
                  isOwner ? 'cursor-text' : 'cursor-default opacity-80'
                } ${
                  task.completed 
                    ? 'line-through text-slate-400 dark:text-slate-600 italic' 
                    : 'text-slate-700 dark:text-slate-200 font-medium'
                } ${isOwner && !task.completed ? 'hover:text-accent-blue' : ''}`}
              >
                {task.text}
              </span>
              <div 
                onClick={() => isOwner && onToggle()}
                className={`transition-colors ${isOwner ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
              >
                <IconComponent />
              </div>
            </div>
            
            {isOwner && (
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 items-center gap-3">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-tighter transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={onRemove}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-tighter transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface GoalItemProps {
  key?: string | number;
  goal: { id: string; text: string; poId?: string };
  onUpdate: (id: string, val: string) => void;
  onRemove: (id: string) => void;
  darkMode: boolean;
  isOwner: boolean;
}

function GoalItem({ 
  goal, 
  onUpdate,
  onRemove,
  darkMode,
  isOwner
}: GoalItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(goal.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSubmit = () => {
    if (editValue.trim()) {
      onUpdate(goal.id, editValue);
    } else {
      setEditValue(goal.text);
    }
    setIsEditing(false);
  };

  const colonIndex = goal.text.indexOf(':');
  const title = colonIndex !== -1 ? goal.text.substring(0, colonIndex + 1) : '';
  const description = colonIndex !== -1 ? goal.text.substring(colonIndex + 1).trim() : goal.text;

  return (
    <div className="flex gap-3 group">
      <div className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full text-sm bg-transparent border-b border-accent-blue outline-none"
          />
        ) : (
          <div className="flex items-start gap-2">
            <div 
              onClick={() => setIsEditing(true)}
              className="flex-1 flex flex-col cursor-text"
            >
              {title && <strong className="text-[14px] font-bold text-text-main block">{title}</strong>}
              <span className={`text-[13px] leading-relaxed ${title ? 'text-text-muted' : 'text-text-main'}`}>
                {description}
              </span>
            </div>
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 self-start">
               <button 
                onClick={() => onRemove(goal.id)}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                title="Delete goal"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function POAccountRow({ 
  member, 
  onUpdate, 
  onRemove, 
  isExpanded, 
  onToggleExpand 
}: { 
  member: Member; 
  onUpdate: (id: string, name: string, email?: string, password?: string) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  key?: string | number;
}) {
  const [editName, setEditName] = useState(member.name);
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdate(member.id, editName, member.email, editPassword || undefined);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm">
      <div className="flex items-center gap-3 p-3 group">
        <div className={`w-10 h-10 rounded-xl ${member.color} flex items-center justify-center text-white text-lg shadow-sm shrink-0`}>
          {member.avatar}
        </div>
        <div className="flex-1 min-w-0" onClick={onToggleExpand}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-white cursor-pointer hover:text-accent-blue transition-colors">
              {member.name}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md uppercase tracking-tight">
              {member.email}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleExpand}
            className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 ${isExpanded ? 'rotate-180 text-accent-blue bg-accent-blue/5' : ''}`}
          >
            <ChevronDown size={18} />
          </button>
          <button 
            onClick={() => onRemove(member.id)}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all text-slate-400"
            title="Remove Account"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800 pt-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Display Name</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-blue/20 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Username (No Change)</label>
                <input 
                  type="text"
                  value={member.email}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none opacity-60 cursor-not-allowed dark:text-slate-400"
                />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Update Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-blue/20 dark:text-slate-100"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-1">
                <button 
                  onClick={handleSave}
                  className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    isSaved 
                    ? 'bg-green-500 text-white' 
                    : 'bg-accent-blue text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                  }`}
                >
                  {isSaved ? <ShieldCheck size={16} /> : <Save size={16} />}
                  {isSaved ? 'Done' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function POManager({ 
  members, 
  onAdd, 
  onUpdate, 
  onRemove, 
  onClose,
  darkMode 
}: { 
  members: Member[]; 
  onAdd: (name: string, email: string, password?: string) => void;
  onUpdate: (id: string, name: string, email?: string, password?: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  darkMode: boolean;
}) {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    if (newName.trim() && newEmail.trim()) {
      onAdd(newName, newEmail, newPassword || '123456');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-accent-blue" size={24} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">PO Account Management</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 ml-1">
              Create New Account
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <input 
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-blue/20 transition-all dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <input 
                  type="text"
                  placeholder="Username / Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-blue/20 transition-all dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative flex-1">
                  <input 
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-blue/20 transition-all dark:text-white pr-10"
                  />
                  <button 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button 
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newEmail.trim()}
                  className="w-full py-2.5 bg-accent-blue text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Account
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 mb-2">
              Existing Accounts ({members.length})
            </h4>
            {members.map(m => (
              <POAccountRow 
                key={m.id}
                member={m}
                onUpdate={onUpdate}
                onRemove={onRemove}
                isExpanded={expandedId === m.id}
                onToggleExpand={() => setExpandedId(expandedId === m.id ? null : m.id)}
              />
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Finished Setup
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Modal({ 
  isOpen, 
  onClose, 
  type, 
  days, 
  onAdd,
  darkMode 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  type: 'task' | 'goal';
  days: DayData[];
  onAdd: (text: string, dayId?: string) => void;
  darkMode: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedDay, setSelectedDay] = useState(days[0].id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
      >
        <h3 className="text-xl font-bold mb-6">Add New {type === 'task' ? 'Task' : 'Weekly Goal'}</h3>
        
        <div className="space-y-4">
          {type === 'task' && (
            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Select Day</label>
              <select 
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={`w-full p-3 rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {days.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{type === 'task' ? 'Task Description' : 'Goal Description'}</label>
            <textarea 
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type your ${type} here...`}
              autoFocus
              className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            Cancel
          </button>
          <button 
            disabled={!inputValue.trim()}
            onClick={() => onAdd(inputValue, selectedDay)}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            Add {type === 'task' ? 'Task' : 'Goal'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
