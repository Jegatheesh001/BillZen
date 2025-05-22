
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Expense, Event, EventFormData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase'; 
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
  deleteField,
  type FirestoreError,
} from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';


const DEFAULT_USERS_DATA_SEED: Omit<User, 'id'>[] = [
  { name: 'Alice', avatarUrl: 'https://placehold.co/100x100.png?text=A', email: 'alice@example.com' },
  { name: 'Bob', avatarUrl: 'https://placehold.co/100x100.png?text=B' },
  { name: 'Charlie', avatarUrl: 'https://placehold.co/100x100.png?text=C', email: 'charlie@example.com' },
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
  addUser: (name: string, avatarUrl?: string, email?: string, firebaseUid?: string) => Promise<User>;
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Promise<Expense | null>;
  updateExpense: (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  addEvent: (eventData: EventFormData) => Promise<Event | null>;
  updateEvent: (eventId: string, updatedData: Partial<EventFormData>) => Promise<void>;
  updateUser: (userId: string, name: string, avatarUrl?: string, email?: string) => Promise<void>;
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

  const handleFirestoreError = (e: any, defaultMessage: string) => {
    const firestoreError = e as FirestoreError;
    const message = firestoreError.message || defaultMessage;
    setError(message);
    toast({ title: "Firebase Error", description: message, variant: "destructive" });
    console.error(defaultMessage, firestoreError);
  };
  
  const fetchData = useCallback(async () => {
    if (!db) {
      setError("Firebase not initialized correctly.");
      setIsLoading(false); 
      return { fetchedUsers: [], initialLoadComplete: true, wasError: true };
    }
    
    setIsLoading(true);
    setError(null);
    let fetchedUsersList: User[] = [];

    try {
      const usersCol = collection(db, "users");
      const expensesCol = collection(db, "expenses");
      const eventsCol = collection(db, "events");
      const categoriesDocRef = doc(db, "appConfig", "categories");

      const [
        userSnapshot, 
        expenseSnapshot, 
        eventSnapshot, 
        categoriesDocSnap
      ] = await Promise.all([
        getDocs(query(usersCol, orderBy("name"))),
        getDocs(query(expensesCol, orderBy("date", "desc"))),
        getDocs(query(eventsCol, orderBy("name"))),
        getDoc(categoriesDocRef)
      ]);

      fetchedUsersList = userSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as User));
      
      const expensesList = expenseSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          date: (data.date as Timestamp)?.toDate().toISOString() || new Date().toISOString()
        } as Expense;
      });
      
      const eventsList = eventSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Event));
      
      let currentCategories = INITIAL_CATEGORIES_DATA_SEED;
      if (categoriesDocSnap.exists()) {
        const categoriesData = categoriesDocSnap.data();
        currentCategories = (categoriesData?.list as string[])?.sort() || INITIAL_CATEGORIES_DATA_SEED;
      } else {
        await setDoc(categoriesDocRef, { list: INITIAL_CATEGORIES_DATA_SEED });
      }
      setCategories(currentCategories);
      
      if (fetchedUsersList.length === 0 && !auth.currentUser) { 
          const batch = writeBatch(db);
          const seededUsers: User[] = [];
          DEFAULT_USERS_DATA_SEED.forEach(userSeed => {
            const userDocRef = doc(collection(db, "users")); 
            batch.set(userDocRef, userSeed);
            seededUsers.push({id: userDocRef.id, ...userSeed});
          });
          await batch.commit();
          fetchedUsersList = seededUsers.sort((a,b) => a.name.localeCompare(b.name));
      }
      
      setUsers(fetchedUsersList);
      setExpenses(expensesList);
      setEvents(eventsList);

      return { fetchedUsers: fetchedUsersList, initialLoadComplete: true, wasError: false };
    } catch (e: any) {
      handleFirestoreError(e, "Failed to load data from Firebase.");
      return { fetchedUsers: [], initialLoadComplete: true, wasError: true };
    } finally {
      setIsLoading(false);
    }
  }, [toast]); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser); 
      if (fbUser) {
        const userDocRef = doc(db, "users", fbUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;
            setCurrentUser(appUser);
            localStorage.setItem('currentUserId', appUser.id);
          } else {
            const newUserPayload: Omit<User, 'id'> = {
              name: fbUser.displayName || `User-${fbUser.uid.substring(0,5)}`,
              avatarUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${(fbUser.displayName || "U").charAt(0).toUpperCase()}`,
              email: fbUser.email || undefined,
            };
            await setDoc(userDocRef, newUserPayload); // Directly write to Firestore
            const newAppUser: User = { id: fbUser.uid, ...newUserPayload };
            setCurrentUser(newAppUser);
            localStorage.setItem('currentUserId', newAppUser.id);
            setUsers(prev => {
              const userExists = prev.some(u => u.id === newAppUser.id);
              return userExists ? prev.map(u => u.id === newAppUser.id ? newAppUser : u).sort((a,b) => a.name.localeCompare(b.name)) 
                                : [...prev, newAppUser].sort((a, b) => a.name.localeCompare(b.name));
            });
          }
        } catch (e: any) {
          handleFirestoreError(e, "Failed to load or create user profile after auth change.");
        }
      } else {
        setCurrentUser(null); 
        localStorage.removeItem('currentUserId');
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Minimal stable dependencies

  useEffect(() => {
    let isMounted = true;
    const loadDataAndSetUser = async () => {
      const { fetchedUsers, initialLoadComplete, wasError } = await fetchData();
  
      if (!isMounted || !initialLoadComplete || wasError) {
        if (isMounted && wasError && !isLoading) setIsLoading(false);
        return;
      }
  
      if (!firebaseUser && !currentUser && fetchedUsers.length > 0) {
        const savedUserId = localStorage.getItem('currentUserId');
        let userToSet = null;
        if (savedUserId) {
          userToSet = fetchedUsers.find(u => u.id === savedUserId);
        }
        if (!userToSet && fetchedUsers.length > 0) { 
          userToSet = fetchedUsers[0];
        }
        if (userToSet && isMounted) {
          setCurrentUser(userToSet);
          if(!localStorage.getItem('currentUserId')) localStorage.setItem('currentUserId', userToSet.id);
        }
      }
    };
  
    loadDataAndSetUser();
  
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, fetchData]);


  const addUser = useCallback(async (name: string, avatarUrl?: string, email?: string, firebaseUid?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const userRef = firebaseUid ? doc(db, "users", firebaseUid) : doc(collection(db, "users"));
      const newUserPayload: Omit<User, 'id'> = {
        name,
        avatarUrl: avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
      };
      if (email) {
        newUserPayload.email = email;
      }

      await setDoc(userRef, newUserPayload);
      const newUser: User = { id: userRef.id, ...newUserPayload };
      
      setUsers(prev => {
        const userExists = prev.some(u => u.id === newUser.id);
        if (userExists) return prev.map(u => u.id === newUser.id ? newUser : u).sort((a,b) => a.name.localeCompare(b.name));
        return [...prev, newUser].sort((a,b) => a.name.localeCompare(b.name));
      });

      if (users.length === 0 && !currentUser && !auth.currentUser) {
          setCurrentUser(newUser);
          localStorage.setItem('currentUserId', newUser.id);
      }
      toast({ title: "User Added", description: `${newUser.name} added successfully.`});
      return newUser;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to add user.");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast, users, currentUser]);


  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense | null> => {
    setIsLoading(true);
    try {
      const payloadForFirestore: any = {
        ...expenseData,
        date: serverTimestamp(),
      };
      
      // Omit fields if they are undefined
      if (!expenseData.hasOwnProperty('category') || expenseData.category === undefined) {
        delete payloadForFirestore.category;
      }
      if (!expenseData.hasOwnProperty('eventId') || expenseData.eventId === undefined) {
        delete payloadForFirestore.eventId;
      }

      const docRef = await addDoc(collection(db, "expenses"), payloadForFirestore);
      
      const newExpense: Expense = {
        description: expenseData.description,
        amount: expenseData.amount,
        paidById: expenseData.paidById,
        participantIds: expenseData.participantIds,
        id: docRef.id,
        date: new Date().toISOString(), 
      };
      if (expenseData.category !== undefined) {
        newExpense.category = expenseData.category;
      }
      if (expenseData.eventId !== undefined) {
        newExpense.eventId = expenseData.eventId;
      }
      
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({ title: "Expense Added", description: `${newExpense.description} added.`});
      return newExpense;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to add expense.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateExpense = useCallback(async (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => {
    setIsLoading(true);
    try {
      const expenseRef = doc(db, "expenses", expenseId);
      const payloadForFirestore: { [key: string]: any } = { ...updatedData };

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
            const newUpdatedExpense = { ...expense, ...updatedData };
            if (updatedData.hasOwnProperty('category') && updatedData.category === undefined) {
              delete newUpdatedExpense.category;
            }
            if (updatedData.hasOwnProperty('eventId') && updatedData.eventId === undefined) {
              delete newUpdatedExpense.eventId;
            }
            return newUpdatedExpense;
          }
          return expense;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      toast({ title: "Expense Updated", description: "Expense details saved."});
    } catch (e: any) {
      handleFirestoreError(e, "Failed to update expense.");
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
      handleFirestoreError(e, "Failed to delete expense.");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearAllExpenses = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const expensesCol = collection(db, "expenses");
      const expenseSnapshot = await getDocs(expensesCol);
      
      if (expenseSnapshot.empty) {
        toast({ title: "No Expenses", description: "There are no expenses to clear." });
        setIsLoading(false);
        return;
      }

      const batch = writeBatch(db);
      expenseSnapshot.docs.forEach(docSnap => {
        batch.delete(doc(db, "expenses", docSnap.id));
      });
      await batch.commit();

      setExpenses([]);
      toast({ title: "Expenses Cleared", description: "All expenses have been successfully deleted." });
    } catch (e: any) {
      handleFirestoreError(e, "Failed to clear expenses.");
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
      toast({ title: "Event Created", description: `${newEvent.name} created.`});
      return newEvent;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to add event.");
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
      toast({ title: "Event Updated", description: "Event details saved."});
    } catch (e: any) {
      handleFirestoreError(e, "Failed to update event.");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateUser = useCallback(async (userId: string, name: string, avatarUrl?: string, email?: string) => {
    setIsLoading(true);
    try {
      const finalAvatarUrl = avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`;
      const userRef = doc(db, "users", userId);
      
      const updatePayload: {name: string, avatarUrl: string, email?: string | typeof deleteField} = { 
        name, 
        avatarUrl: finalAvatarUrl 
      };

      if (email === undefined || email === '') { 
        updatePayload.email = deleteField();
      } else if (email) { 
        updatePayload.email = email;
      }

      await updateDoc(userRef, updatePayload);
      
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === userId) {
            const updatedUser = { ...user, name, avatarUrl: finalAvatarUrl };
            if (email === undefined || email === '') {
              delete updatedUser.email;
            } else if (email) {
              updatedUser.email = email;
            }
            return updatedUser;
          }
          return user;
        }).sort((a, b) => a.name.localeCompare(b.name))
      );

      if (currentUser?.id === userId) {
        setCurrentUser(prev => {
          if (!prev) return null;
          const updatedCurrentUser = { ...prev, name, avatarUrl: finalAvatarUrl };
          if (email === undefined || email === '') {
            delete updatedCurrentUser.email;
          } else if (email) {
            updatedCurrentUser.email = email;
          }
          return updatedCurrentUser;
        });
      }
      toast({ title: "User Updated", description: "Profile details saved."});
    } catch (e: any) {
      handleFirestoreError(e, "Failed to update user.");
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
      const currentCategoriesList = currentCategoriesSnap.exists() ? (currentCategoriesSnap.data()?.list as string[] || []).map(c=>c.toLowerCase()) : [];

      if (!trimmedName || currentCategoriesList.includes(trimmedName.toLowerCase())) {
        toast({ title: "Category Exists", description: `Category "${trimmedName}" already exists or is empty.`, variant: "default" });
        setIsLoading(false);
        return false; 
      }
      
      await updateDoc(categoriesDocRef, { list: arrayUnion(trimmedName) }, { merge: true });
      setCategories(prev => [...prev, trimmedName].sort());
      toast({ title: "Category Added", description: `Category "${trimmedName}" added.`});
      return true;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to add category.");
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
      const currentCategoriesList = currentCategoriesSnap.exists() ? (currentCategoriesSnap.data()?.list as string[] || []).map(c=>c.toLowerCase()) : [];

      if (!trimmedNewName || (currentCategoriesList.includes(trimmedNewName.toLowerCase()) && trimmedNewName.toLowerCase() !== oldCategoryName.toLowerCase())) {
         toast({ title: "Already Exists", description: `Category "${trimmedNewName}" may already exist or is empty.`, variant: "default" });
        setIsLoading(false);
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
      toast({ title: "Category Updated", description: `"${oldCategoryName}" updated to "${trimmedNewName}".`});
      return true;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to update category.");
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
      toast({ title: "Category Removed", description: `"${categoryName}" removed.`});
    } catch (e: any)
     {
      handleFirestoreError(e, "Failed to remove category.");
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
    clearAllExpenses,
    addEvent,
    updateEvent,
    updateUser,
    setCurrentUserById,
    addCategory,
    updateCategory,
    removeCategory,
    addSettlement,
    clearError,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [users, expenses, events, categories, currentUser, firebaseUser, isLoading, error, addUser, addExpense, updateExpense, deleteExpense, clearAllExpenses, addEvent, updateEvent, updateUser, setCurrentUserById, addCategory, updateCategory, removeCategory, addSettlement]);

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
