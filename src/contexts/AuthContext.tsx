import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'po_planner_all_users';
const CURRENT_USER_KEY = 'po_planner_current_user';

// Initial Mock Accounts
export const MOCK_ACCOUNTS: User[] = [
  {
    id: 'admin',
    name: 'Admin Leader',
    email: 'admin',
    password: 'admin123',
    role: 'Leader',
    avatar: '👑',
    color: 'bg-red-500'
  },
  {
    id: 'po1',
    name: 'Quynh PO',
    email: 'po1',
    password: '123456',
    role: 'Member',
    avatar: '👩‍💻',
    color: 'bg-pink-500'
  },
  {
    id: 'po2',
    name: 'Lam PO',
    email: 'po2',
    password: '123456',
    role: 'Member',
    avatar: '👨‍💻',
    color: 'bg-blue-500'
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize users store if empty
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!savedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(MOCK_ACCOUNTS));
    }

    // Check for active session
    const activeUser = localStorage.getItem(CURRENT_USER_KEY);
    if (activeUser) {
      setUser(JSON.parse(activeUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const allUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const foundUser = allUsers.find((u: User) => u.email === email && u.password === password);

    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));
    } else {
      setError('Invalid email or password');
      throw new Error('Invalid email or password');
    }
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
