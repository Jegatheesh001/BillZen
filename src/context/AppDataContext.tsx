
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Expense, Event, EventFormData } from '@/lib/types';
import * as apiClient from '@/lib/api-client'; // Import the API client
import { useToast } from '@/hooks/use-toast';


const DEFAULT_USERS_DATA: User[] = [
  { id: 'user_alice', name: 'Alice', avatarUrl: 'https://placehold.co/100x100.png?text=A' },
  { id: 'user_bob', name: 'Bob', avatarUrl: 'https://placehold.co/100x100.png?text=B' },
  { id: 'user_charlie', name: 'Charlie', avatarUrl: 'https://placehold.co/100x100.png?text=C' },
];

const INITIAL_CATEGORIES_DATA: string[] = [
  "Food", "Transport", "Shopping", "Utilities", "Entertainment", "Groceries", "Travel", "Health", "Settlement", "Other",
].sort();

export type PersistenceMode = 'inMemory' | 'api';

interface AppDataContextState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  categories: string[];
  currentUser: User | null;
  persistenceMode: PersistenceMode;
  isLoading: boolean; // Global loading state for API operations
  error: string | null; // Global error state for API operations
  addUser: (name: string, avatarUrl?: string) => Promise<User>;
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Promise<Expense>;
  updateExpense: (expenseId: string, updatedData: Omit<Expense, 'id' | 'date'>) => Promise<void>;
  addEvent: (eventData: EventFormData) => Promise<Event>;
  updateEvent: (eventId: string, updatedData: EventFormData) => Promise<void>;
  updateUser: (userId: string, name: string, avatarUrl?: string) => Promise<void>;
  setCurrentUserById: (userId: string | null) => void;
  addCategory: (categoryName: string) => Promise<boolean>;
  updateCategory: (oldCategoryName: string, newCategoryName: string) => Promise<boolean>;
  removeCategory: (categoryName: string) => Promise<void>;
  addSettlement: (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }) => Promise<Expense>;
  togglePersistenceMode: (newMode: PersistenceMode) => Promise<void>;
  clearError: () => void;
}

const AppDataContext = createContext<AppDataContextState | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS_DATA);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES_DATA);
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USERS_DATA[0] || null);
  const [persistenceMode, setPersistenceMode] = useState<PersistenceMode>('inMemory');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = () => setError(null);

  const resetToInMemoryDefaults = () => {
    setUsers(DEFAULT_USERS_DATA);
    setExpenses([]);
    setEvents([]);
    setCategories(INITIAL_CATEGORIES_DATA);
    setCurrentUser(DEFAULT_USERS_DATA[0] || null);
    setError(null);
  };

  const loadDataFromApi = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [apiUsers, apiExpenses, apiEvents, apiCategories] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getExpenses(),
        apiClient.getEvents(),
        apiClient.getCategories(),
      ]);
      setUsers(apiUsers || []);
      setExpenses(apiExpenses || []);
      setEvents(apiEvents || []);
      setCategories(apiCategories || []);
      if (apiUsers && apiUsers.length > 0) {
        const currentUserId = localStorage.getItem('currentUserId');
        const userToSet = currentUserId ? apiUsers.find(u => u.id === currentUserId) : apiUsers[0];
        setCurrentUser(userToSet || apiUsers[0] || null);
      } else {
        setCurrentUser(null);
      }
      toast({ title: "Switched to API Mode", description: "Data loaded from API." });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load data from API';
      setError(errorMessage);
      toast({ title: "API Error", description: errorMessage, variant: "destructive" });
      // Optionally revert to inMemory or leave data empty
      resetToInMemoryDefaults(); // Revert to in-memory if API load fails catastrophically
      setPersistenceMode('inMemory'); // Force back to inMemory
      localStorage.setItem('persistenceMode', 'inMemory');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    const savedMode = localStorage.getItem('persistenceMode') as PersistenceMode | null;
    const savedUserId = localStorage.getItem('currentUserId');

    if (savedMode) {
      setPersistenceMode(savedMode);
      if (savedMode === 'api') {
        loadDataFromApi();
      } else {
        // For inMemory, ensure currentUser is set from localStorage or default
        const userToSet = savedUserId ? users.find(u => u.id === savedUserId) : users[0];
        setCurrentUser(userToSet || users[0] || null);
      }
    } else {
       // Default to inMemory, ensure currentUser is set
       const userToSet = savedUserId ? users.find(u => u.id === savedUserId) : users[0];
       setCurrentUser(userToSet || users[0] || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const togglePersistenceMode = useCallback(async (newMode: PersistenceMode) => {
    setIsLoading(true); // Set loading true immediately for UX
    setPersistenceMode(newMode);
    localStorage.setItem('persistenceMode', newMode);
    if (newMode === 'api') {
      await loadDataFromApi();
    } else {
      resetToInMemoryDefaults();
      setIsLoading(false); // Reset loading after in-memory defaults are set
      toast({ title: "Switched to In-Memory Mode", description: "Using local data." });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addUser = useCallback(async (name: string, avatarUrl?: string): Promise<User> => {
    setError(null);
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const newUser = await apiClient.addUser({ name, avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}` });
        setUsers(prev => [...prev, newUser]);
        return newUser;
      } catch (err: any) {
        setError(err.message || 'Failed to add user via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
      };
      setUsers(prev => [...prev, newUser]);
      return newUser;
    }
  }, [persistenceMode]);

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
    setError(null);
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        // API should handle 'id' and 'date'
        const newExpense = await apiClient.addExpense(expenseData);
        setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        return newExpense;
      } catch (err: any) {
        setError(err.message || 'Failed to add expense via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: new Date().toISOString(),
      };
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      return newExpense;
    }
  }, [persistenceMode]);

  const updateExpense = useCallback(async (expenseId: string, updatedData: Omit<Expense, 'id' | 'date'>) => {
    setError(null);
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const updatedExpense = await apiClient.updateExpense(expenseId, updatedData);
        setExpenses(prevExpenses =>
          prevExpenses.map(expense =>
            expense.id === expenseId ? { ...expense, ...updatedExpense } : expense
          ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
      } catch (err: any) {
        setError(err.message || 'Failed to update expense via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      setExpenses(prevExpenses =>
        prevExpenses.map(expense =>
          expense.id === expenseId
            ? { ...expense, ...updatedData, date: expense.date } // Keep original date unless API sends new one
            : expense
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    }
  }, [persistenceMode]);
  
  const addEvent = useCallback(async (eventData: EventFormData): Promise<Event> => {
    setError(null);
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const newEvent = await apiClient.addEvent(eventData); // API handles ID
        setEvents(prev => [newEvent, ...prev]);
        return newEvent;
      } catch (err: any) {
        setError(err.message || 'Failed to add event via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      const newEvent: Event = {
        ...eventData,
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };
      setEvents(prev => [newEvent, ...prev]);
      return newEvent;
    }
  }, [persistenceMode]);

  const updateEvent = useCallback(async (eventId: string, updatedData: EventFormData) => {
    setError(null);
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const updatedEvent = await apiClient.updateEvent(eventId, updatedData);
        setEvents(prevEvents =>
          prevEvents.map(event =>
            event.id === eventId ? { ...event, ...updatedEvent } : event
          )
        );
      } catch (err: any) {
        setError(err.message || 'Failed to update event via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId
            ? { ...event, ...updatedData } 
            : event
        )
      );
    }
  }, [persistenceMode]);

  const updateUser = useCallback(async (userId: string, name: string, avatarUrl?: string) => {
    setError(null);
    const finalAvatarUrl = avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`;
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const updatedUser = await apiClient.updateUser(userId, { name, avatarUrl: finalAvatarUrl });
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, ...updatedUser } : user
          )
        );
        if (currentUser?.id === userId) {
           setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update user via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, name, avatarUrl: finalAvatarUrl } : user
        )
      );
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, name, avatarUrl: finalAvatarUrl } : null);
      }
    }
  }, [persistenceMode, currentUser]);

  const setCurrentUserById = useCallback((userId: string | null) => {
    if (userId === null) {
      setCurrentUser(null);
      localStorage.removeItem('currentUserId');
    } else {
      const userToSet = users.find(u => u.id === userId);
      setCurrentUser(userToSet || null);
      if (userToSet) {
        localStorage.setItem('currentUserId', userId);
      } else {
         localStorage.removeItem('currentUserId');
      }
    }
  }, [users]);

  const addCategory = useCallback(async (categoryName: string): Promise<boolean> => {
    setError(null);
    const trimmedName = categoryName.trim();
    if (!trimmedName || categories.find(c => c.toLowerCase() === trimmedName.toLowerCase())) {
      return false; 
    }
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const { category: newCategoryFromApi } = await apiClient.addCategory(trimmedName);
        setCategories(prev => [...prev, newCategoryFromApi].sort());
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to add category via API');
        return false; // Indicate failure
      } finally {
        setIsLoading(false);
      }
    } else {
      setCategories(prev => [...prev, trimmedName].sort());
      return true;
    }
  }, [persistenceMode, categories]);

  const updateCategory = useCallback(async (oldCategoryName: string, newCategoryName: string): Promise<boolean> => {
    setError(null);
    const trimmedNewName = newCategoryName.trim();
    if (!trimmedNewName || categories.find(c => c.toLowerCase() === trimmedNewName.toLowerCase() && c.toLowerCase() !== oldCategoryName.toLowerCase())) {
      return false; 
    }
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        const { category: updatedCategoryFromApi } = await apiClient.updateCategory(oldCategoryName, trimmedNewName);
        setCategories(prev => prev.map(c => c.toLowerCase() === oldCategoryName.toLowerCase() ? updatedCategoryFromApi : c).sort());
        // Note: Updating expenses' categories after API call might require re-fetching expenses or a specific API endpoint
        setExpenses(prevExpenses => prevExpenses.map(exp => 
          exp.category && exp.category.toLowerCase() === oldCategoryName.toLowerCase() 
            ? { ...exp, category: updatedCategoryFromApi } 
            : exp
        ));
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to update category via API');
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
      setCategories(prev => prev.map(c => c.toLowerCase() === oldCategoryName.toLowerCase() ? trimmedNewName : c).sort());
      setExpenses(prevExpenses => prevExpenses.map(exp => 
        exp.category && exp.category.toLowerCase() === oldCategoryName.toLowerCase() 
          ? { ...exp, category: trimmedNewName } 
          : exp
      ));
      return true;
    }
  }, [persistenceMode, categories]);

  const removeCategory = useCallback(async (categoryName: string) => {
    setError(null);
    if (persistenceMode === 'api') {
      setIsLoading(true);
      try {
        await apiClient.removeCategory(categoryName);
        setCategories(prev => prev.filter(c => c.toLowerCase() !== categoryName.toLowerCase()));
        // Note: Updating expenses' categories might require re-fetching or a specific API handling
        setExpenses(prevExpenses => prevExpenses.map(exp =>
          exp.category && exp.category.toLowerCase() === categoryName.toLowerCase()
            ? { ...exp, category: undefined }
            : exp
        ));
      } catch (err: any) {
        setError(err.message || 'Failed to remove category via API');
        throw err;
      } finally {
        setIsLoading(false);
      }
    } else {
      setCategories(prev => prev.filter(c => c.toLowerCase() !== categoryName.toLowerCase()));
      setExpenses(prevExpenses => prevExpenses.map(exp =>
        exp.category && exp.category.toLowerCase() === categoryName.toLowerCase()
          ? { ...exp, category: undefined }
          : exp
      ));
    }
  }, [persistenceMode]);

  const addSettlement = useCallback(async (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }): Promise<Expense> => {
    // This function will use the existing addExpense, which is already mode-aware
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
    persistenceMode,
    isLoading,
    error,
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
    togglePersistenceMode,
    clearError,
  }), [users, expenses, events, categories, currentUser, persistenceMode, isLoading, error, addUser, addExpense, updateExpense, addEvent, updateEvent, updateUser, setCurrentUserById, addCategory, updateCategory, removeCategory, addSettlement, togglePersistenceMode]);

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
