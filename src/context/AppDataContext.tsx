
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
  arrayRemove,
  deleteField // Import deleteField
} from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';


const DEFAULT_USERS_DATA_SEED: Omit<User, 'id'>[] = [
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
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
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
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = () => setError(null);

  // Handles Firebase Auth state changes and initial user profile setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // setIsLoading(true) will be handled by the main data fetching effect or here if no fbUser
      if (!fbUser) {
        setFirebaseUser(null);
        setCurrentUser(null);
        localStorage.removeItem('currentUserId');
        // If there's no Firebase user, we might still need to fetch general data if the app supports it,
        // or ensure loading is false if it relies on an authenticated user.
        // For now, data fetching is triggered by firebaseUser state change in another useEffect.
        setIsLoading(false); // Set loading to false if no user, as data fetch might not run or might depend on user
        return;
      }

      setFirebaseUser(fbUser); // Set firebaseUser early
      setIsLoading(true); // Start loading when fbUser is identified

      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          setCurrentUser(appUser);
          localStorage.setItem('currentUserId', appUser.id);
        } else {
          const newUserPayload: Omit<User, 'id'> = {
            name: fbUser.displayName || `User-${fbUser.uid.substring(0,5)}`,
            avatarUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${(fbUser.displayName || "U").charAt(0).toUpperCase()}`,
          };
          await setDoc(userDocRef, newUserPayload);
          const newAppUser: User = { id: fbUser.uid, ...newUserPayload };
          setCurrentUser(newAppUser);
          localStorage.setItem('currentUserId', newAppUser.id);
          setUsers(prev => {
              const userExists = prev.some(u => u.id === newAppUser.id);
              return userExists ? prev : [...prev, newAppUser];
          });
        }
      } catch (e: any) {
        console.error("Error processing Firebase Auth state:", e);
        setError("Failed to process user authentication. " + e.message);
        toast({ title: "Authentication Error", description: e.message, variant: "destructive" });
      } finally {
        // setIsLoading(false) will be handled by the main data fetching effect that depends on firebaseUser
      }
    });
    return () => unsubscribe();
  }, [toast]);


  // Main data fetching logic
  const fetchData = useCallback(async () => {
    if (!db) return; // Should not happen if Firebase initializes correctly
    
    setIsLoading(true);
    setError(null);
    let usersList: User[] = [];

    try {
      // Fetch Users
      const usersCol = collection(db, "users");
      const userSnapshot = await getDocs(usersCol);
      usersList = userSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setUsers(usersList);

      // Fetch Expenses
      const expensesCol = collection(db, "expenses");
      const expensesQuery = query(expensesCol, orderBy("date", "desc"));
      const expenseSnapshot = await getDocs(expensesQuery);
      const expensesList = expenseSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          date: (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString()
        } as Expense;
      });
      setExpenses(expensesList);
      
      // Fetch Events
      const eventsCol = collection(db, "events");
      const eventSnapshot = await getDocs(eventsCol);
      const eventsList = eventSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
      setEvents(eventsList);

      // Fetch Categories
      const categoriesDocRef = doc(db, "appConfig", "categories");
      const categoriesDocSnap = await getDoc(categoriesDocRef);
      if (categoriesDocSnap.exists()) {
        setCategories((categoriesDocSnap.data().list as string[]).sort() || []);
      } else {
        await setDoc(categoriesDocRef, { list: INITIAL_CATEGORIES_DATA_SEED });
        setCategories(INITIAL_CATEGORIES_DATA_SEED);
      }

      if (usersList.length === 0 && !firebaseUser) { // Seed only if no users AND no one is logged in (to avoid race conditions)
          const batch = writeBatch(db);
          const seededUsers: User[] = [];
          DEFAULT_USERS_DATA_SEED.forEach(userSeed => {
            const userDocRef = doc(collection(db, "users")); 
            batch.set(userDocRef, userSeed);
            seededUsers.push({id: userDocRef.id, ...userSeed});
          });
          await batch.commit();
          usersList = seededUsers; 
          setUsers(usersList);
      }
      return usersList;
    } catch (e: any) {
      console.error("Error fetching data from Firebase:", e);
      setError(e.message || "Failed to load data from Firebase.");
      toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
      return usersList; 
    } finally {
      setIsLoading(false);
    }
  }, [toast, firebaseUser]); // firebaseUser dependency ensures re-fetch if auth state broadly changes.

  // Effect to load data and then set current user
  useEffect(() => {
    // Only fetch data if firebaseUser state has been determined (even if null, meaning not logged in)
    // This avoids fetching before we know if a user is logged in, which might affect initial user selection.
    // The auth listener above handles setting `currentUser` if a `firebaseUser` is present.
    // This effect primarily handles the initial data load and setting a default current user if none was set by auth.
    fetchData().then((fetchedUsers) => {
      if (!currentUser && fetchedUsers.length > 0) { // Check if currentUser is still null after auth processing and data fetch
        const savedUserId = localStorage.getItem('currentUserId');
        let userToSet = null;
        if (savedUserId) {
          userToSet = fetchedUsers.find(u => u.id === savedUserId);
        }
        // If no saved user, or saved user not in fetched list, and not logged in via Firebase (auth would set currentUser)
        if (!userToSet && fetchedUsers.length > 0 && !firebaseUser) {
          userToSet = fetchedUsers[0];
        }
        
        if (userToSet) {
          setCurrentUser(userToSet);
          if(!localStorage.getItem('currentUserId')) localStorage.setItem('currentUserId', userToSet.id);
        }
      }
    });
  }, [firebaseUser, fetchData]); // Removed `currentUser` from here


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
      
      setUsers(prev => {
        if (!prev.find(u => u.id === newUser.id)) {
            return [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name));
        }
        return prev.sort((a, b) => a.name.localeCompare(b.name));
      });

      if (users.length === 0 && !currentUser && !firebaseUser) {
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
  }, [toast, users, currentUser, firebaseUser]);


  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
    setIsLoading(true);
    try {
      const payloadForFirestore: any = {
        ...expenseData,
        date: serverTimestamp(),
      };
      // Remove undefined fields before sending to Firestore
      if (payloadForFirestore.category === undefined) {
        delete payloadForFirestore.category;
      }
      if (payloadForFirestore.eventId === undefined) {
        delete payloadForFirestore.eventId;
      }

      const docRef = await addDoc(collection(db, "expenses"), payloadForFirestore);
      
      // Construct the local Expense object carefully
      const newExpense: Expense = {
        description: expenseData.description,
        amount: expenseData.amount,
        paidById: expenseData.paidById,
        participantIds: expenseData.participantIds,
        id: docRef.id,
        date: new Date().toISOString(), // Use current date for local state until fetched
      };
      if (expenseData.category !== undefined) {
        newExpense.category = expenseData.category;
      }
      if (expenseData.eventId !== undefined) {
        newExpense.eventId = expenseData.eventId;
      }
      
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
      const payloadForFirestore: any = { ...updatedData };

      if (updatedData.hasOwnProperty('category') && updatedData.category === undefined) {
        payloadForFirestore.category = deleteField();
      }
      if (updatedData.hasOwnProperty('eventId') && updatedData.eventId === undefined) {
        payloadForFirestore.eventId = deleteField();
      }
      
      await updateDoc(expenseRef, payloadForFirestore);
      
      setExpenses(prevExpenses =>
        prevExpenses.map(expense => {
          if (expense.id === expenseId) {
            // Create a new object for the updated expense
            const updatedExpense = { ...expense, ...updatedData };
            // If category was meant to be removed via undefined, delete it from the local state object
            if (updatedData.hasOwnProperty('category') && updatedData.category === undefined) {
              delete updatedExpense.category;
            }
            // If eventId was meant to be removed via undefined, delete it from the local state object
            if (updatedData.hasOwnProperty('eventId') && updatedData.eventId === undefined) {
              delete updatedExpense.eventId;
            }
            return updatedExpense;
          }
          return expense;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
        ).sort((a, b) => a.name.localeCompare(b.name))
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
      const currentCategoriesList = currentCategoriesSnap.exists() ? (currentCategoriesSnap.data().list as string[]).map(c=>c.toLowerCase()) : [];

      if (!trimmedName || currentCategoriesList.includes(trimmedName.toLowerCase())) {
        setIsLoading(false);
        toast({ title: "Category Exists", description: `Category "${trimmedName}" already exists or is empty.`, variant: "default" });
        return false; 
      }
      
      await updateDoc(categoriesDocRef, { list: arrayUnion(trimmedName) }, { merge: true });
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
      const currentCategoriesList = currentCategoriesSnap.exists() ? (currentCategoriesSnap.data().list as string[]).map(c=>c.toLowerCase()) : [];

      if (!trimmedNewName || (currentCategoriesList.includes(trimmedNewName.toLowerCase()) && trimmedNewName.toLowerCase() !== oldCategoryName.toLowerCase())) {
        setIsLoading(false);
        toast({ title: "Category Exists", description: `Category "${trimmedNewName}" already exists or is empty.`, variant: "default" });
        return false; 
      }
      
      const batch = writeBatch(db);
      batch.update(categoriesDocRef, { list: arrayRemove(oldCategoryName) });
      batch.update(categoriesDocRef, { list: arrayUnion(trimmedNewName) });
      
      const expensesToUpdateQuery = query(collection(db, "expenses"), where("category", "==", oldCategoryName));
      const expensesToUpdateSnap = await getDocs(expensesToUpdateQuery);
      expensesToUpdateSnap.forEach(expenseDoc => {
        batch.update(doc(db, "expenses", expenseDoc.id), { category: trimmedNewName });
      });
      await batch.commit();
      
      setCategories(prev => prev.map(c => c.toLowerCase() === oldCategoryName.toLowerCase() ? trimmedNewName : c).sort());
      setExpenses(prevExpenses => prevExpenses.map(exp => 
        exp.category && exp.category.toLowerCase() === oldCategoryName.toLowerCase() 
          ? { ...exp, category: trimmedNewName } 
          : exp
      ));
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
      const batch = writeBatch(db);
      batch.update(categoriesDocRef, { list: arrayRemove(categoryName) });

      const expensesToUpdateQuery = query(collection(db, "expenses"), where("category", "==", categoryName));
      const expensesToUpdateSnap = await getDocs(expensesToUpdateQuery);
      expensesToUpdateSnap.forEach(expenseDoc => {
        batch.update(doc(db, "expenses", expenseDoc.id), { category: deleteField() }); 
      });
      await batch.commit();

      setCategories(prev => prev.filter(c => c.toLowerCase() !== categoryName.toLowerCase()));
      setExpenses(prevExpenses => prevExpenses.map(exp => {
          if (exp.category && exp.category.toLowerCase() === categoryName.toLowerCase()) {
            const { category, ...rest } = exp; // Create new object without category
            return rest;
          }
          return exp;
        }
      ));
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
      category: "Settlement", // This category should be added to INITIAL_CATEGORIES_DATA_SEED if not present
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
