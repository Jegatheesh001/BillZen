
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { User, Expense, Event, EventFormData } from '@/lib/types';

const DEFAULT_USERS: User[] = [
  { id: 'user_alice', name: 'Alice', avatarUrl: 'https://placehold.co/100x100.png?text=A' },
  { id: 'user_bob', name: 'Bob', avatarUrl: 'https://placehold.co/100x100.png?text=B' },
  { id: 'user_charlie', name: 'Charlie', avatarUrl: 'https://placehold.co/100x100.png?text=C' },
];

interface AppDataContextState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  currentUser: User | null;
  addUser: (name: string, avatarUrl?: string) => User;
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Expense;
  updateExpense: (expenseId: string, updatedData: Omit<Expense, 'id' | 'date'>) => void;
  addEvent: (eventData: EventFormData) => Event;
  updateEvent: (eventId: string, updatedData: EventFormData) => void;
  updateUser: (userId: string, name: string, avatarUrl?: string) => void;
  setCurrentUserById: (userId: string | null) => void;
}

const AppDataContext = createContext<AppDataContextState | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USERS[0] || null);

  const addUser = useCallback((name: string, avatarUrl?: string): User => {
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, []);

  const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'date'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  }, []);

  const updateExpense = useCallback((expenseId: string, updatedData: Omit<Expense, 'id' | 'date'>) => {
    setExpenses(prevExpenses =>
      prevExpenses.map(expense =>
        expense.id === expenseId
          ? { ...expense, ...updatedData } // Preserve original id and date
          : expense
      )
    );
  }, []);
  
  const addEvent = useCallback((eventData: EventFormData): Event => {
    const newEvent: Event = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((eventId: string, updatedData: EventFormData) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, ...updatedData } // Preserve original id
          : event
      )
    );
  }, []);

  const updateUser = useCallback((userId: string, name: string, avatarUrl?: string) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? { ...user, name, avatarUrl: avatarUrl || user.avatarUrl } : user
      )
    );
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, name, avatarUrl: avatarUrl || prev.avatarUrl } : null);
    }
  }, [currentUser]);

  const setCurrentUserById = useCallback((userId: string | null) => {
    if (userId === null) {
      setCurrentUser(null);
    } else {
      const userToSet = users.find(u => u.id === userId);
      setCurrentUser(userToSet || null);
    }
  }, [users]);

  const contextValue = useMemo(() => ({
    users,
    expenses,
    events,
    currentUser,
    addUser,
    addExpense,
    updateExpense,
    addEvent,
    updateEvent,
    updateUser,
    setCurrentUserById,
  }), [users, expenses, events, currentUser, addUser, addExpense, updateExpense, addEvent, updateEvent, updateUser, setCurrentUserById]);

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
