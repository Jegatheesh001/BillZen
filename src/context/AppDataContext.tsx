
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
  deleteField
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
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Promise<Expense | null>;
  updateExpense: (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addEvent: (eventData: EventFormData) => Promise<Event | null>;
  updateEvent: (eventId: string, updatedData: Partial<EventFormData>) => Promise<void>;
  updateUser: (userId: string, name: string, avatarUrl?: string) => Promise<void>;
  setCurrentUserById: (userId: string | null) => void;
  addCategory: (categoryName: string) => Promise<boolean>;
  updateCategory: (oldCategoryName: string, newCategoryName: string) => Promise<boolean>;
  removeCategory: (categoryName: string) => Promise<void>;
  addSettlement: (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }) => Promise<Expense | null>;
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
      if (!fbUser) {
        setFirebaseUser(null);
        setCurrentUser(null);
        localStorage.removeItem('currentUserId');
        setIsLoading(false);
        return;
      }

      setFirebaseUser(fbUser);
      // setIsLoading(true) here is fine as subsequent fetchData will set it false
      // or if user doc creation fails, error will be set and loading eventually false.

      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          setCurrentUser(appUser);
          localStorage.setItem('currentUserId', appUser.id);
        } else {
          // User authenticated with Firebase, but no profile in our 'users' collection yet.
          // Create one.
          const newUserPayload: Omit<User, 'id'> = {
            name: fbUser.displayName || `User-${fbUser.uid.substring(0,5)}`,
            avatarUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${(fbUser.displayName || "U").charAt(0).toUpperCase()}`,
          };
          await setDoc(userDocRef, newUserPayload); // Use fbUser.uid as the document ID
          const newAppUser: User = { id: fbUser.uid, ...newUserPayload };
          setCurrentUser(newAppUser);
          localStorage.setItem('currentUserId', newAppUser.id);
          // Add to local users list if not already present (fetchData will also get it)
          setUsers(prev => {
              const userExists = prev.some(u => u.id === newAppUser.id);
              return userExists ? prev : [...prev, newAppUser].sort((a, b) => a.name.localeCompare(b.name));
          });
        }
      } catch (e: any) {
        console.error("Error processing Firebase Auth state:", e);
        setError("Failed to process user authentication. " + e.message);
        toast({ title: "Authentication Error", description: e.message, variant: "destructive" });
        // setIsLoading(false) will be handled by the main data fetching useEffect's finally block
      }
      // Don't set isLoading to false here, let the main fetchData effect handle it
      // to ensure data is loaded AFTER auth state is resolved.
    });
    return () => unsubscribe();
  }, [toast]); // Removed users, addUser from dependency array


  // Main data fetching logic
  const fetchData = useCallback(async () => {
    if (!db) {
      setError("Firebase not initialized correctly.");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    let fetchedUsersList: User[] = [];

    try {
      // Fetch Users
      const usersCol = collection(db, "users");
      const userSnapshot = await getDocs(query(usersCol, orderBy("name")));
      fetchedUsersList = userSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      setUsers(fetchedUsersList);

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
      const eventSnapshot = await getDocs(query(eventsCol, orderBy("name")));
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

      if (fetchedUsersList.length === 0 && !firebaseUser) {
          const batch = writeBatch(db);
          const seededUsers: User[] = [];
          DEFAULT_USERS_DATA_SEED.forEach(userSeed => {
            const userDocRef = doc(collection(db, "users")); 
            batch.set(userDocRef, userSeed);
            seededUsers.push({id: userDocRef.id, ...userSeed});
          });
          await batch.commit();
          fetchedUsersList = seededUsers; 
          setUsers(fetchedUsersList.sort((a,b) => a.name.localeCompare(b.name))); // Ensure sorted after seed
      }
      return fetchedUsersList; 
    } catch (e: any) {
      console.error("Error fetching data from Firebase:", e);
      setError(e.message || "Failed to load data from Firebase.");
      toast({ title: "Error Loading Data", description: e.message, variant: "destructive" });
      return fetchedUsersList;
    } finally {
      setIsLoading(false);
    }
  }, [toast, firebaseUser]);

  // Effect to load data and then set current user
  useEffect(() => {
    fetchData().then((fetchedUsers) => {
      // This logic runs after initial data is fetched OR if firebaseUser changes (triggering fetchData)
      // We only set currentUser if it hasn't been set by the onAuthStateChanged listener
      if (!currentUser && fetchedUsers && fetchedUsers.length > 0) {
        const savedUserId = localStorage.getItem('currentUserId');
        let userToSet = null;
        if (savedUserId) {
          userToSet = fetchedUsers.find(u => u.id === savedUserId);
        }
        if (!userToSet && fetchedUsers.length > 0) { // Fallback to first user if no saved or saved not found
          userToSet = fetchedUsers[0];
        }
        
        if (userToSet) {
          setCurrentUser(userToSet);
          if(!localStorage.getItem('currentUserId')) localStorage.setItem('currentUserId', userToSet.id);
        }
      }
    });
  }, [fetchData]); // Only depends on fetchData (which itself depends on firebaseUser)


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
        // Ensure no duplicates and maintain sort order
        const userExists = prev.some(u => u.id === newUser.id);
        if (userExists) return prev.map(u => u.id === newUser.id ? newUser : u).sort((a,b) => a.name.localeCompare(b.name));
        return [...prev, newUser].sort((a,b) => a.name.localeCompare(b.name));
      });

      // If this is the first user being added (e.g. not by auth flow, and users array was empty)
      // And no firebaseUser is trying to set one up
      if (users.length === 0 && !currentUser && !firebaseUser) {
          setCurrentUser(newUser);
          localStorage.setItem('currentUserId', newUser.id);
      }
      return newUser;
    } catch (e: any) {
      setError(e.message || "Failed to add user.");
      toast({ title: "Error Adding User", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast, users, currentUser, firebaseUser]);


  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense | null> => {
    setIsLoading(true);
    try {
      const payloadForFirestore: any = {
        ...expenseData,
        date: serverTimestamp(),
      };
      
      // Explicitly delete keys if their values are undefined, as Firestore doesn't allow undefined.
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
      return newExpense;
    } catch (e: any) {
      setError(e.message || "Failed to add expense.");
      toast({ title: "Error Adding Expense", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateExpense = useCallback(async (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => {
    setIsLoading(true);
    try {
      const expenseRef = doc(db, "expenses", expenseId);
      const payloadForFirestore: any = { ...updatedData };

      // Handle fields that might be cleared
      if (updatedData.hasOwnProperty('category')) {
        payloadForFirestore.category = updatedData.category === undefined ? deleteField() : updatedData.category;
      }
      if (updatedData.hasOwnProperty('eventId')) {
        payloadForFirestore.eventId = updatedData.eventId === undefined ? deleteField() : updatedData.eventId;
      }
      
      await updateDoc(expenseRef, payloadForFirestore);
      
      setExpenses(prevExpenses =>
        prevExpenses.map(expense => {
          if (expense.id === expenseId) {
            // Create a new object for the updated expense
            const newUpdatedExpense = { ...expense, ...updatedData };
            // If category was meant to be removed via undefined, delete it from the local state object
            if (updatedData.hasOwnProperty('category') && updatedData.category === undefined) {
              delete newUpdatedExpense.category;
            }
            // If eventId was meant to be removed via undefined, delete it from the local state object
            if (updatedData.hasOwnProperty('eventId') && updatedData.eventId === undefined) {
              delete newUpdatedExpense.eventId;
            }
            return newUpdatedExpense;
          }
          return expense;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (e: any) {
      setError(e.message || "Failed to update expense.");
      toast({ title: "Error Updating Expense", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const deleteExpense = useCallback(async (expenseId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const expenseRef = doc(db, "expenses", expenseId);
      await deleteDoc(expenseRef);
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== expenseId));
      toast({ title: "Expense Deleted", description: "The expense has been successfully deleted." });
    } catch (e: any) {
      setError(e.message || "Failed to delete expense.");
      toast({ title: "Error Deleting Expense", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addEvent = useCallback(async (eventData: EventFormData): Promise<Event | null> => {
    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, "events"), eventData);
      const newEvent: Event = { ...eventData, id: docRef.id };
      setEvents(prev => [newEvent, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
      return newEvent;
    } catch (e: any) {
      setError(e.message || "Failed to add event.");
      toast({ title: "Error Adding Event", description: e.message, variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
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
        ).sort((a,b) => a.name.localeCompare(b.name))
      );
    } catch (e: any) {
      setError(e.message || "Failed to update event.");
      toast({ title: "Error Updating Event", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
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
    } catch (e: any) {
      setError(e.message || "Failed to update user.");
      toast({ title: "Error Updating User", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
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
        toast({ title: "Category Exists", description: `Category "${trimmedName}" already exists or is empty.`, variant: "default" });
        return false; 
      }
      
      await updateDoc(categoriesDocRef, { list: arrayUnion(trimmedName) }, { merge: true });
      setCategories(prev => [...prev, trimmedName].sort());
      return true;
    } catch (e: any) {
      setError(e.message || "Failed to add category.");
      toast({ title: "Error Adding Category", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
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
        toast({ title: "Category Exists", description: `Category "${trimmedNewName}" may already exist or is empty.`, variant: "default" });
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
      return true;
    } catch (e: any) {
      setError(e.message || "Failed to update category.");
      toast({ title: "Error Updating Category", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
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
            const { category, ...rest } = exp; 
            return rest;
          }
          return exp;
        }
      ));
    } catch (e: any) {
      setError(e.message || "Failed to remove category.");
      toast({ title: "Error Removing Category", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addSettlement = useCallback(async (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }): Promise<Expense | null> => {
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
    deleteExpense,
    addEvent,
    updateEvent,
    updateUser,
    setCurrentUserById,
    addCategory,
    updateCategory,
    removeCategory,
    addSettlement,
    clearError,
  }), [users, expenses, events, categories, currentUser, firebaseUser, isLoading, error, addUser, addExpense, updateExpense, deleteExpense, addEvent, updateEvent, updateUser, setCurrentUserById, addCategory, updateCategory, removeCategory, addSettlement]);

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
