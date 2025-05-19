
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Expense, Event, EventFormData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase'; // Import Firebase services
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';


const DEFAULT_USERS_DATA_SEED: Omit<User, 'id'>[] = [ // Seed data doesn't need ID
  { name: 'Alice', avatarUrl: 'https://placehold.co/100x100.png?text=A' },
  { name: 'Bob', avatarUrl: 'https://placehold.co/100x100.png?text=B' },
  { name: 'Charlie', avatarUrl: 'https://placehold.co/100x100.png?text=C' },
];

const INITIAL_CATEGORIES_DATA_SEED: string[] = [
  "Food", "Transport", "Shopping", "Utilities", "Entertainment", "Groceries", "Travel", "Health", "Settlement", "Other",
].sort();


interface AppDataContextState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  categories: string[];
  currentUser: User | null; // This will be our app's user profile
  firebaseUser: FirebaseUser | null; // This is the Firebase Auth user
  isLoading: boolean;
  error: string | null;
  addUser: (name: string, avatarUrl?: string, firebaseUid?: string) => Promise<User>;
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Promise<Expense>;
  updateExpense: (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => Promise<void>;
  addEvent: (eventData: EventFormData) => Promise<Event>;
  updateEvent: (eventId: string, updatedData: Partial<EventFormData>) => Promise<void>;
  updateUser: (userId: string, name: string, avatarUrl?: string) => Promise<void>;
  setCurrentUserById: (userId: string | null) => void;
  addCategory: (categoryName: string) => Promise<boolean>;
  updateCategory: (oldCategoryName: string, newCategoryName: string) => Promise<boolean>;
  removeCategory: (categoryName: string) => Promise<void>;
  addSettlement: (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }) => Promise<Expense>;
  clearError: () => void;
}

const AppDataContext = createContext<AppDataContextState | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = () => setError(null);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is signed in, see if we have a profile for them
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          setCurrentUser(appUser);
          localStorage.setItem('currentUserId', appUser.id);
        } else {
          // No profile yet, create one
          // For now, if no profile, we might set currentUser to null or a temporary state
          // Or automatically create a profile. This part will be refined with full auth UI.
          // Let's try to add a user if their profile doesn't exist.
           try {
            const newAppUser = await addUser(user.displayName || "New User", user.photoURL || undefined, user.uid);
            setCurrentUser(newAppUser);
            localStorage.setItem('currentUserId', newAppUser.id);
          } catch (e) {
            console.error("Error creating user profile on auth change:", e);
            setError("Failed to create user profile.");
          }
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        localStorage.removeItem('currentUserId');
      }
      // Initial data load will be triggered by firebaseUser/currentUser changes if needed
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // addUser will be wrapped in useCallback

  const fetchData = useCallback(async () => {
    if (!db) return; // Firebase not initialized
    setIsLoading(true);
    setError(null);
    try {
      // Fetch Users
      const usersCol = collection(db, "users");
      const userSnapshot = await getDocs(usersCol);
      const usersList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);

      // Fetch Expenses
      // For now, fetch all expenses. In a real app, you'd filter by user involvement.
      const expensesCol = collection(db, "expenses");
      const expensesQuery = query(expensesCol, orderBy("date", "desc"));
      const expenseSnapshot = await getDocs(expensesQuery);
      const expensesList = expenseSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          date: (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString() // Convert Firestore Timestamp
        } as Expense;
      });
      setExpenses(expensesList);
      
      // Fetch Events
      const eventsCol = collection(db, "events");
      const eventSnapshot = await getDocs(eventsCol);
      const eventsList = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsList);

      // Fetch Categories (from a single document for simplicity)
      const categoriesDocRef = doc(db, "appConfig", "categories");
      const categoriesDocSnap = await getDoc(categoriesDocRef);
      if (categoriesDocSnap.exists()) {
        setCategories((categoriesDocSnap.data().list as string[]).sort() || []);
      } else {
        // Seed categories if document doesn't exist
        await setDoc(categoriesDocRef, { list: INITIAL_CATEGORIES_DATA_SEED });
        setCategories(INITIAL_CATEGORIES_DATA_SEED);
      }

      // Seed Users if collection is empty (simple seeding)
      if (usersList.length === 0 && !firebaseUser) { // Only seed if no users and no logged-in user yet
          const batch = writeBatch(db);
          DEFAULT_USERS_DATA_SEED.forEach(userSeed => {
            // In a real scenario with auth, user IDs would be Firebase UIDs
            // For now, let Firestore generate IDs for these seed users.
            const userDocRef = doc(collection(db, "users")); 
            batch.set(userDocRef, userSeed);
          });
          await batch.commit();
          // Re-fetch users after seeding
          const seededUserSnapshot = await getDocs(usersCol);
          const seededUsersList = seededUserSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          setUsers(seededUsersList);
          if (seededUsersList.length > 0 && !currentUser) {
            setCurrentUser(seededUsersList[0]);
            localStorage.setItem('currentUserId', seededUsersList[0].id);
          }
      } else if (usersList.length > 0 && !currentUser && !firebaseUser) {
         // If users exist from Firebase but no currentUser is set (and no FirebaseUser to trigger selection)
        const savedUserId = localStorage.getItem('currentUserId');
        const userToSet = savedUserId ? usersList.find(u => u.id === savedUserId) : usersList[0];
        setCurrentUser(userToSet || usersList[0] || null);
      }


    } catch (e: any) {
      console.error("Error fetching data from Firebase:", e);
      setError(e.message || "Failed to load data from Firebase.");
      toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser, firebaseUser]); // Dependencies for re-fetching logic


  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is memoized

  const addUser = useCallback(async (name: string, avatarUrl?: string, firebaseUid?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const userRef = firebaseUid ? doc(db, "users", firebaseUid) : doc(collection(db, "users"));
      const newUserPayload: Omit<User, 'id'> = {
        name,
        avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
      };
      await setDoc(userRef, newUserPayload);
      const newUser: User = { id: userRef.id, ...newUserPayload };
      
      setUsers(prev => [...prev, newUser]);
      if (users.length === 0 && !currentUser) { // if this is the very first user added by interaction
          setCurrentUser(newUser);
          localStorage.setItem('currentUserId', newUser.id);
      }
      setIsLoading(false);
      return newUser;
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to add user.");
      toast({ title: "Error Adding User", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [users, currentUser, toast]);


  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
    setIsLoading(true);
    try {
      const newExpensePayload = {
        ...expenseData,
        date: serverTimestamp(), // Use server timestamp
      };
      const docRef = await addDoc(collection(db, "expenses"), newExpensePayload);
      // For client-side state, we need an actual date.
      // Firestore returns a Timestamp; we'll convert it or use client date for immediate UI.
      // For simplicity, re-fetch or use a client-generated date for immediate UI update
      const newExpense: Expense = {
        ...expenseData,
        id: docRef.id,
        date: new Date().toISOString(), // Use client date for immediate state
      };
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setIsLoading(false);
      return newExpense;
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to add expense.");
      toast({ title: "Error Adding Expense", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const updateExpense = useCallback(async (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => {
    setIsLoading(true);
    try {
      const expenseRef = doc(db, "expenses", expenseId);
      // Firestore update doesn't change 'date' unless specified
      await updateDoc(expenseRef, updatedData);
      
      setExpenses(prevExpenses =>
        prevExpenses.map(expense =>
          expense.id === expenseId
            ? { ...expense, ...updatedData, date: expense.date } // Keep original date unless updatedData has it
            : expense
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to update expense.");
      toast({ title: "Error Updating Expense", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);
  
  const addEvent = useCallback(async (eventData: EventFormData): Promise<Event> => {
    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, "events"), eventData);
      const newEvent: Event = { ...eventData, id: docRef.id };
      setEvents(prev => [newEvent, ...prev]);
      setIsLoading(false);
      return newEvent;
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to add event.");
      toast({ title: "Error Adding Event", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const updateEvent = useCallback(async (eventId: string, updatedData: Partial<EventFormData>) => {
    setIsLoading(true);
    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, updatedData);
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId
            ? { ...event, ...updatedData } 
            : event
        )
      );
      setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to update event.");
      toast({ title: "Error Updating Event", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const updateUser = useCallback(async (userId: string, name: string, avatarUrl?: string) => {
    setIsLoading(true);
    try {
      const finalAvatarUrl = avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`;
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { name, avatarUrl: finalAvatarUrl });
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, name, avatarUrl: finalAvatarUrl } : user
        )
      );
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, name, avatarUrl: finalAvatarUrl } : null);
      }
      setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to update user.");
      toast({ title: "Error Updating User", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [currentUser, toast]);

  const setCurrentUserById = useCallback((userId: string | null) => {
    // This function now primarily relies on users list already fetched from Firebase.
    // Actual Firebase Auth state change will set firebaseUser and trigger profile fetch.
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
    setIsLoading(true);
    try {
      const trimmedName = categoryName.trim();
      const categoriesDocRef = doc(db, "appConfig", "categories");
      const currentCategoriesSnap = await getDoc(categoriesDocRef);
      const currentCategoriesList = currentCategoriesSnap.exists() ? (currentCategoriesSnap.data().list as string[]) : [];

      if (!trimmedName || currentCategoriesList.find(c => c.toLowerCase() === trimmedName.toLowerCase())) {
        setIsLoading(false);
        return false; 
      }
      
      await updateDoc(categoriesDocRef, { list: arrayUnion(trimmedName) });
      setCategories(prev => [...prev, trimmedName].sort());
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to add category.");
      toast({ title: "Error Adding Category", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const updateCategory = useCallback(async (oldCategoryName: string, newCategoryName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const trimmedNewName = newCategoryName.trim();
      const categoriesDocRef = doc(db, "appConfig", "categories");
      const currentCategoriesSnap = await getDoc(categoriesDocRef);
      const currentCategoriesList = currentCategoriesSnap.exists() ? (currentCategoriesSnap.data().list as string[]) : [];

      if (!trimmedNewName || currentCategoriesList.find(c => c.toLowerCase() === trimmedNewName.toLowerCase() && c.toLowerCase() !== oldCategoryName.toLowerCase())) {
        setIsLoading(false);
        return false; 
      }
      // To update an item in an array in Firestore: remove old, add new
      await updateDoc(categoriesDocRef, { list: arrayRemove(oldCategoryName) });
      await updateDoc(categoriesDocRef, { list: arrayUnion(trimmedNewName) });
      
      setCategories(prev => prev.map(c => c.toLowerCase() === oldCategoryName.toLowerCase() ? trimmedNewName : c).sort());
      
      // Update expenses using this category (this is a client-side update post category name change)
      // This is complex with Firestore; ideally, expenses store category IDs, not names.
      // For now, we'll just update client state. Batch update in Firestore is possible but harder.
      setExpenses(prevExpenses => prevExpenses.map(exp => 
        exp.category && exp.category.toLowerCase() === oldCategoryName.toLowerCase() 
          ? { ...exp, category: trimmedNewName } 
          : exp
      ));
      // TODO: Batch update expenses in Firestore if category name changes. This is non-trivial.
      setIsLoading(false);
      return true;
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to update category.");
      toast({ title: "Error Updating Category", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const removeCategory = useCallback(async (categoryName: string) => {
    setIsLoading(true);
    try {
      const categoriesDocRef = doc(db, "appConfig", "categories");
      await updateDoc(categoriesDocRef, { list: arrayRemove(categoryName) });

      setCategories(prev => prev.filter(c => c.toLowerCase() !== categoryName.toLowerCase()));
      // Update expenses: clear category if it was removed
      setExpenses(prevExpenses => prevExpenses.map(exp =>
        exp.category && exp.category.toLowerCase() === categoryName.toLowerCase()
          ? { ...exp, category: undefined }
          : exp
      ));
      // TODO: Batch update expenses in Firestore to remove/clear category.
      setIsLoading(false);
    } catch (e: any) {
      setIsLoading(false);
      setError(e.message || "Failed to remove category.");
      toast({ title: "Error Removing Category", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);

  const addSettlement = useCallback(async (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }): Promise<Expense> => {
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
    firebaseUser,
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
    clearError,
  }), [users, expenses, events, categories, currentUser, firebaseUser, isLoading, error, addUser, addExpense, updateExpense, addEvent, updateEvent, updateUser, setCurrentUserById, addCategory, updateCategory, removeCategory, addSettlement]);

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
