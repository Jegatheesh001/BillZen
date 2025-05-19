
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Expense, Event, EventFormData } from '@/lib/types';
// import * as apiClient from '@/lib/api-client'; // Removed
import { useToast } from '@/hooks/use-toast';


const DEFAULT_USERS_DATA: User[] = [
  { id: 'user_alice', name: 'Alice', avatarUrl: 'https://placehold.co/100x100.png?text=A' },
  { id: 'user_bob', name: 'Bob', avatarUrl: 'https://placehold.co/100x100.png?text=B' },
  { id: 'user_charlie', name: 'Charlie', avatarUrl: 'https://placehold.co/100x100.png?text=C' },
];

const INITIAL_CATEGORIES_DATA: string[] = [
  "Food", "Transport", "Shopping", "Utilities", "Entertainment", "Groceries", "Travel", "Health", "Settlement", "Other",
].sort();

// PersistenceMode type is no longer needed here
// export type PersistenceMode = 'inMemory' | 'api';

interface AppDataContextState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  categories: string[];
  currentUser: User | null;
  // isLoading: boolean; // Removed global API loading state
  // error: string | null; // Removed global API error state
  addUser: (name: string, avatarUrl?: string) => Promise<User>; // Will become async for Firebase
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Promise<Expense>; // Will become async for Firebase
  updateExpense: (expenseId: string, updatedData: Omit<Expense, 'id' | 'date'>) => Promise<void>; // Will become async for Firebase
  addEvent: (eventData: EventFormData) => Promise<Event>; // Will become async for Firebase
  updateEvent: (eventId: string, updatedData: EventFormData) => Promise<void>; // Will become async for Firebase
  updateUser: (userId: string, name: string, avatarUrl?: string) => Promise<void>; // Will become async for Firebase
  setCurrentUserById: (userId: string | null) => void;
  addCategory: (categoryName: string) => Promise<boolean>; // Will become async for Firebase
  updateCategory: (oldCategoryName: string, newCategoryName: string) => Promise<boolean>; // Will become async for Firebase
  removeCategory: (categoryName: string) => Promise<void>; // Will become async for Firebase
  addSettlement: (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }) => Promise<Expense>; // Will become async for Firebase
  // togglePersistenceMode: (newMode: PersistenceMode) => Promise<void>; // Removed
  // setApiBaseUrl: (newUrl: string) => void; // Removed
  // clearError: () => void; // Removed
}

const AppDataContext = createContext<AppDataContextState | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS_DATA);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES_DATA);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Initialize to null, set in useEffect
  
  // const [isLoading, setIsLoading] = useState<boolean>(false); // Removed
  // const [error, setError] = useState<string | null>(null); // Removed
  const { toast } = useToast();

  // const clearError = () => setError(null); // Removed

  useEffect(() => {
    // Initialize currentUser from localStorage or default
    const savedUserId = localStorage.getItem('currentUserId');
    const userToSet = savedUserId ? DEFAULT_USERS_DATA.find(u => u.id === savedUserId) : DEFAULT_USERS_DATA[0];
    setCurrentUser(userToSet || DEFAULT_USERS_DATA[0] || null);
  }, []);


  const addUser = useCallback(async (name: string, avatarUrl?: string): Promise<User> => {
    // TODO: Implement Firebase logic here
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
    };
    setUsers(prev => [...prev, newUser]);
    // If this is the first user being added, set them as current user
    if (users.length === 0) {
        setCurrentUser(newUser);
        localStorage.setItem('currentUserId', newUser.id);
    }
    return newUser;
  }, [users]); // Added users dependency

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
    // TODO: Implement Firebase logic here
    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return newExpense;
  }, []);

  const updateExpense = useCallback(async (expenseId: string, updatedData: Omit<Expense, 'id' | 'date'>) => {
    // TODO: Implement Firebase logic here
    setExpenses(prevExpenses =>
      prevExpenses.map(expense =>
        expense.id === expenseId
          ? { ...expense, ...updatedData, date: expense.date } 
          : expense
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  }, []);
  
  const addEvent = useCallback(async (eventData: EventFormData): Promise<Event> => {
    // TODO: Implement Firebase logic here
    const newEvent: Event = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    setEvents(prev => [newEvent, ...prev]);
    return newEvent;
  }, []);

  const updateEvent = useCallback(async (eventId: string, updatedData: EventFormData) => {
    // TODO: Implement Firebase logic here
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, ...updatedData } 
          : event
      )
    );
  }, []);

  const updateUser = useCallback(async (userId: string, name: string, avatarUrl?: string) => {
    // TODO: Implement Firebase logic here
    const finalAvatarUrl = avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`;
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? { ...user, name, avatarUrl: finalAvatarUrl } : user
      )
    );
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, name, avatarUrl: finalAvatarUrl } : null);
    }
  }, [currentUser]);

  const setCurrentUserById = useCallback((userId: string | null) => {
    if (userId === null) {
      setCurrentUser(null);
      localStorage.removeItem('currentUserId');
    } else {
      const userToSet = users.find(u => u.id === userId); // users state already updated by addUser
      setCurrentUser(userToSet || null);
      if (userToSet) {
        localStorage.setItem('currentUserId', userId);
      } else {
         localStorage.removeItem('currentUserId');
      }
    }
  }, [users]); // users dependency ensures this uses the latest list

  const addCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    // TODO: Implement Firebase logic here
    const trimmedName = categoryName.trim();
    if (!trimmedName || categories.find(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      return false; 
    }
    setCategories(prev => [...prev, trimmedName].sort());
    return true;
  }, [categories]);

  const updateCategory = useCallback(async (oldCategoryName: string, newCategoryName: string): Promise<boolean> => {
    // TODO: Implement Firebase logic here
    const trimmedNewName = newCategoryName.trim();
    if (!trimmedNewName || categories.find(c => c.toLowerCase() === trimmedNewName.toLowerCase() && c.toLowerCase() !== oldCategoryName.toLowerCase())) {
      return false; 
    }
    setCategories(prev => prev.map(c => c.toLowerCase() === oldCategoryName.toLowerCase() ? trimmedNewName : c).sort());
    setExpenses(prevExpenses => prevExpenses.map(exp => 
      exp.category && exp.category.toLowerCase() === oldCategoryName.toLowerCase() 
        ? { ...exp, category: trimmedNewName } 
        : exp
    ));
    return true;
  }, [categories]);

  const removeCategory = useCallback(async (categoryName: string) => {
    // TODO: Implement Firebase logic here
    setCategories(prev => prev.filter(c => c.toLowerCase() !== categoryName.toLowerCase()));
    setExpenses(prevExpenses => prevExpenses.map(exp =>
      exp.category && exp.category.toLowerCase() === categoryName.toLowerCase()
        ? { ...exp, category: undefined }
        : exp
    ));
  }, []);

  const addSettlement = useCallback(async (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }): Promise<Expense> => {
    // This will call the (soon to be Firebase-backed) addExpense
    const settlementExpenseData = {
      description: `Settlement: ${details.payerName} to ${details.recipientName}`,
      amount: details.amount,
      paidById: details.payerId,
      participantIds: [details.recipientId],
      category: "Settlement",
    };
    return addExpense(settlementExpenseData);
  }, [addExpense]);

  const contextValue = useMemo(() => ({
    users,
    expenses,
    events,
    categories,
    currentUser,
    // persistenceMode, // Removed
    // apiBaseUrl, // Removed
    // isLoading, // Removed
    // error, // Removed
    addUser,
    addExpense,
    updateExpense,
    addEvent,
    updateEvent,
    updateUser,
    setCurrentUserById,
    addCategory,
    updateCategory,
    removeCategory,
    addSettlement,
    // togglePersistenceMode, // Removed
    // setApiBaseUrl, // Removed
    // clearError, // Removed
  }), [users, expenses, events, categories, currentUser, addUser, addExpense, updateExpense, addEvent, updateEvent, updateUser, setCurrentUserById, addCategory, updateCategory, removeCategory, addSettlement]);

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
