
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { User, Expense, Event, EventFormData, Category } from '@/lib/types';
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
  deleteField,
  type FieldValue,
  type FirestoreError,
} from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';


const DEFAULT_USERS_DATA_SEED: Omit<User, 'id'>[] = [
  { name: 'Alice', avatarUrl: 'https://placehold.co/100x100.png?text=A', email: 'alice@example.com' },
  { name: 'Bob', avatarUrl: 'https://placehold.co/100x100.png?text=B' },
  { name: 'Charlie', avatarUrl: 'https://placehold.co/100x100.png?text=C', email: 'charlie@example.com' },
];

const INITIAL_CATEGORIES_DATA_SEED: Omit<Category, 'id'>[] = [
  { name: "Food" }, { name: "Transport" }, { name: "Shopping" }, { name: "Utilities" }, 
  { name: "Entertainment" }, { name: "Groceries" }, { name: "Travel" }, { name: "Health" }, 
  { name: "Settlement" }, { name: "Other" },
].sort((a, b) => a.name.localeCompare(b.name));


interface AppDataContextState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  categories: Category[];
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  addUser: (name: string, avatarUrl?: string, email?: string, firebaseUid?: string) => Promise<User | null>;
  addExpense: (expenseData: Omit<Expense, 'id' | 'date'>) => Promise<Expense | null>;
  updateExpense: (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  addEvent: (eventData: EventFormData) => Promise<Event | null>;
  updateEvent: (eventId: string, updatedData: Partial<EventFormData>) => Promise<void>;
  updateUser: (userId: string, name: string, avatarUrl?: string, email?: string) => Promise<void>;
  setCurrentUserById: (userId: string | null) => void;
  addCategory: (categoryName: string) => Promise<Category | null>;
  updateCategory: (categoryId: string, newCategoryName: string) => Promise<boolean>;
  removeCategory: (categoryId: string) => Promise<void>;
  addSettlement: (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }) => Promise<Expense | null>;
  clearError: () => void;
}

const AppDataContext = createContext<AppDataContextState | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = () => setError(null);

  const handleFirestoreError = useCallback((e: any, defaultMessage: string): null => {
    const firestoreError = e as FirestoreError;
    const message = firestoreError.message || defaultMessage;
    setError(message);
    toast({ title: "Firebase Error", description: message, variant: "destructive" });
    console.error(defaultMessage, firestoreError);
    return null; // Return null for functions that expect a return value on error
  }, [toast]);
  
  const fetchData = useCallback(async () => {
    setError(null);
    let fetchedUsersList: User[] = [];
    let localSuccess = false;

    try {
      const usersCol = collection(db, "users");
      const expensesCol = collection(db, "expenses");
      const eventsCol = collection(db, "events");
      const categoriesCol = collection(db, "categories");

      const [
        userSnapshot, 
        expenseSnapshot, 
        eventSnapshot, 
        categoriesSnapshot
      ] = await Promise.all([
        getDocs(query(usersCol, orderBy("name"))),
        getDocs(query(expensesCol, orderBy("date", "desc"))),
        getDocs(query(eventsCol, orderBy("name"))),
        getDocs(query(categoriesCol, orderBy("name")))
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
      
      let currentCategoriesList = categoriesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Category));
      
      if (currentCategoriesList.length === 0) {
        console.log("No categories found in Firestore, seeding initial categories...");
        const batch = writeBatch(db);
        const seededCategories: Category[] = [];
        INITIAL_CATEGORIES_DATA_SEED.forEach(catSeed => {
          const catDocRef = doc(collection(db, "categories"));
          batch.set(catDocRef, catSeed);
          seededCategories.push({id: catDocRef.id, ...catSeed});
        });
        await batch.commit();
        currentCategoriesList = seededCategories.sort((a,b) => a.name.localeCompare(b.name));
        console.log("Initial categories seeded:", currentCategoriesList.length);
      }
      setCategories(currentCategoriesList);
      
      if (fetchedUsersList.length === 0 && !auth.currentUser) { 
          console.log("No users found in Firestore and no Firebase auth user, seeding default users...");
          const batch = writeBatch(db);
          const seededUsers: User[] = [];
          DEFAULT_USERS_DATA_SEED.forEach(userSeed => {
            const userDocRef = doc(collection(db, "users")); 
            batch.set(userDocRef, userSeed);
            seededUsers.push({id: userDocRef.id, ...userSeed});
          });
          await batch.commit();
          fetchedUsersList = seededUsers.sort((a,b) => a.name.localeCompare(b.name));
          console.log("Default users seeded:", fetchedUsersList.length);
      }
      
      setUsers(fetchedUsersList);
      setExpenses(expensesList);
      setEvents(eventsList);
      localSuccess = true;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to load data from Firebase.");
      localSuccess = false;
    }
    return { fetchedUsers: fetchedUsersList, success: localSuccess };
  }, [toast, handleFirestoreError]); 

  useEffect(() => {
    setIsLoading(true);
    const authUnsubscribe = onAuthStateChanged(auth, async (currentAuthUser) => {
      setFirebaseUser(currentAuthUser); // Set firebaseUser state immediately
      const { fetchedUsers, success: dataFetchSuccess } = await fetchData();

      if (!dataFetchSuccess) {
        setCurrentUser(null);
        localStorage.removeItem('currentUserId');
        setIsLoading(false);
        return;
      }

      let finalUserToSet: User | null = null;

      if (currentAuthUser) {
        const userDocRef = doc(db, "users", currentAuthUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            finalUserToSet = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          } else {
            console.log(`No app profile for Firebase user ${currentAuthUser.uid}, creating one...`);
            const newUserPayload: Omit<User, 'id'> = {
              name: currentAuthUser.displayName || `User-${currentAuthUser.uid.substring(0,5)}`,
              avatarUrl: currentAuthUser.photoURL || `https://placehold.co/100x100.png?text=${(currentAuthUser.displayName || "U").charAt(0).toUpperCase()}`,
              email: currentAuthUser.email || undefined,
            };
            await setDoc(userDocRef, newUserPayload); // Directly setDoc here
            finalUserToSet = { id: currentAuthUser.uid, ...newUserPayload };
            // Update local 'users' state if this new user isn't in 'fetchedUsers'
            if (!fetchedUsers.some(u => u.id === finalUserToSet!.id)) {
              setUsers(prevUsers => [...prevUsers, finalUserToSet!].sort((a, b) => a.name.localeCompare(b.name)));
            }
          }
        } catch (e) {
           handleFirestoreError(e, "Failed to load or create user profile for authenticated user.");
           finalUserToSet = null;
        }
      } else {
        // No Firebase user, try localStorage or default to first fetched user
        const savedUserId = localStorage.getItem('currentUserId');
        if (savedUserId) {
          finalUserToSet = fetchedUsers.find(u => u.id === savedUserId) || null;
        }
        if (!finalUserToSet && fetchedUsers.length > 0) {
          finalUserToSet = fetchedUsers[0];
        }
      }
      
      setCurrentUser(finalUserToSet);
      if (finalUserToSet) {
        localStorage.setItem('currentUserId', finalUserToSet.id);
      } else {
        localStorage.removeItem('currentUserId');
      }
      
      setIsLoading(false);
    });

    return () => {
      authUnsubscribe();
    };
  // fetchData is memoized and its dependencies (toast, handleFirestoreError) are stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [handleFirestoreError]); // Keep handleFirestoreError if it's stable, or ensure fetchData is stable

  useEffect(() => {
    // This effect handles selecting a default currentUser if none is set
    // after the initial loading and when not actively processing a Firebase user.
    if (!currentUser && users.length > 0 && !isLoading && !firebaseUser) {
      const savedUserId = localStorage.getItem('currentUserId');
      let userToSet: User | null = null;
      if (savedUserId) {
        userToSet = users.find(u => u.id === savedUserId) || null;
      }
      if (!userToSet && users.length > 0) {
        userToSet = users[0];
      }
      if (userToSet) {
        setCurrentUser(userToSet);
        localStorage.setItem('currentUserId', userToSet.id);
      }
    }
  }, [users, currentUser, isLoading, firebaseUser]);


  const addUser = useCallback(async (name: string, avatarUrl?: string, email?: string, firebaseUid?: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
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

      toast({ title: "User Added", description: `${newUser.name} added successfully.`});
      return newUser;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to add user.");
      return null; // Propagate null on error
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);


  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const payloadForFirestore: any = {
        ...expenseData,
        date: serverTimestamp(),
      };
      
      // Remove category or eventId if they are undefined to prevent Firestore error
      if (!expenseData.hasOwnProperty('category') || expenseData.category === undefined) {
        delete payloadForFirestore.category;
      }
      if (!expenseData.hasOwnProperty('eventId') || expenseData.eventId === undefined) {
         delete payloadForFirestore.eventId;
      }

      const docRef = await addDoc(collection(db, "expenses"), payloadForFirestore);
      
      const newExpenseDataForState = { ...expenseData };
       if (!newExpenseDataForState.hasOwnProperty('category') || newExpenseDataForState.category === undefined) {
        delete newExpenseDataForState.category;
      }
      if (!newExpenseDataForState.hasOwnProperty('eventId') || newExpenseDataForState.eventId === undefined) {
        delete newExpenseDataForState.eventId;
      }

      const newExpense: Expense = {
        ...newExpenseDataForState,
        id: docRef.id,
        date: new Date().toISOString(), 
      } as Expense; 
      
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({ title: "Expense Added", description: `${newExpense.description} added.`});
      return newExpense;
    } catch (e: any) {
      return handleFirestoreError(e, "Failed to add expense.");
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);

  const updateExpense = useCallback(async (expenseId: string, updatedData: Partial<Omit<Expense, 'id' | 'date'>>) => {
    setIsLoading(true);
    setError(null);
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
      throw e; // Re-throw to allow form to handle submission state
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);
  
  const deleteExpense = useCallback(async (expenseId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
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
  }, [toast, handleFirestoreError]);

  const clearAllExpenses = useCallback(async (): Promise<void> => {
    setIsLoading(true); 
    setError(null);
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
  }, [toast, handleFirestoreError]);

  const addEvent = useCallback(async (eventData: EventFormData): Promise<Event | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, "events"), eventData);
      const newEvent: Event = { ...eventData, id: docRef.id };
      setEvents(prev => [newEvent, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Event Created", description: `${newEvent.name} created.`});
      return newEvent;
    } catch (e: any) {
      return handleFirestoreError(e, "Failed to add event.");
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);

  const updateEvent = useCallback(async (eventId: string, updatedData: Partial<EventFormData>) => {
    setIsLoading(true);
    setError(null);
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
  }, [toast, handleFirestoreError]);

  const updateUser = useCallback(async (userId: string, name: string, avatarUrl?: string, email?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalAvatarUrl = avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`;
      const userRef = doc(db, "users", userId);
      
      const updatePayload: { name: string; avatarUrl: string; email?: string | FieldValue } = {
        name,
        avatarUrl: finalAvatarUrl,
      };

      if (email === undefined || email === '') { 
        updatePayload.email = deleteField();
      } else if (email) { 
        updatePayload.email = email;
      }
      // If email parameter was not provided (and not empty string/undefined), updatePayload.email remains unset, 
      // so Firestore won't touch the email field.

      await updateDoc(userRef, updatePayload);
      
      const updatedUserInList = (prevUser: User) => {
        const updatedUser = { ...prevUser, name, avatarUrl: finalAvatarUrl };
        if (email === undefined || email === '') {
          delete updatedUser.email;
        } else if (email) {
          updatedUser.email = email;
        }
        return updatedUser;
      };

      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? updatedUserInList(user) : user
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? updatedUserInList(prev) : null);
      }
      toast({ title: "User Updated", description: "Profile details saved."});
    } catch (e: any) {
      handleFirestoreError(e, "Failed to update user.");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast, handleFirestoreError]);

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

  const addCategory = useCallback(async (categoryName: string): Promise<Category | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const trimmedName = categoryName.trim();
      if (!trimmedName) {
        toast({ title: "Cannot Add", description: "Category name cannot be empty.", variant: "destructive" });
        setIsLoading(false);
        return null;
      }

      const categoriesCol = collection(db, "categories");
      const q = query(categoriesCol, where("name", "==", trimmedName));
      const existingCategorySnap = await getDocs(q);
      const trulyExisting = existingCategorySnap.docs.find(docSnap => docSnap.data().name.toLowerCase() === trimmedName.toLowerCase());

      if (trulyExisting) {
        toast({ title: "Category Exists", description: `Category "${trimmedName}" already exists.`, variant: "default" });
        setIsLoading(false);
        return null; 
      }
      
      const newCategoryData = { name: trimmedName };
      const docRef = await addDoc(categoriesCol, newCategoryData);
      const newCategory: Category = { id: docRef.id, ...newCategoryData };

      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: "Category Added", description: `Category "${trimmedName}" added.`});
      return newCategory;
    } catch (e: any) {
      return handleFirestoreError(e, "Failed to add category.");
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);

  const updateCategory = useCallback(async (categoryId: string, newCategoryName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const trimmedNewName = newCategoryName.trim();
      if (!trimmedNewName) {
        toast({ title: "Cannot Update", description: "New category name cannot be empty.", variant: "destructive" });
        setIsLoading(false);
        return false;
      }

      const categoryRef = doc(db, "categories", categoryId);
      const oldCategorySnap = await getDoc(categoryRef);
      if (!oldCategorySnap.exists()) {
        toast({ title: "Not Found", description: `Category to update not found.`, variant: "destructive" });
        setIsLoading(false);
        return false;
      }
      const oldCategoryName = oldCategorySnap.data()?.name;

      if (oldCategoryName.toLowerCase() === trimmedNewName.toLowerCase()) {
        toast({ title: "No Change", description: `Category name is already "${trimmedNewName}".` });
        setIsLoading(false);
        return true;
      }

      const q = query(collection(db, "categories"), where("name", "==", trimmedNewName));
      const existingCategorySnap = await getDocs(q);
      const conflict = existingCategorySnap.docs.some(docSnap => docSnap.id !== categoryId && docSnap.data().name.toLowerCase() === trimmedNewName.toLowerCase());

      if (conflict) {
         toast({ title: "Already Exists", description: `Category name "${trimmedNewName}" is already used by another category.`, variant: "destructive" });
         setIsLoading(false);
        return false; 
      }
      
      const batch = writeBatch(db);
      batch.update(categoryRef, { name: trimmedNewName });
            
      const expensesToUpdateQuery = query(collection(db, "expenses"), where("category", "==", oldCategoryName));
      const expensesToUpdateSnap = await getDocs(expensesToUpdateQuery);
      expensesToUpdateSnap.forEach(expenseDoc => {
        batch.update(doc(db, "expenses", expenseDoc.id), { category: trimmedNewName });
      });
      await batch.commit();
      
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: trimmedNewName } : c).sort((a, b) => a.name.localeCompare(b.name)));
      setExpenses(prevExpenses => prevExpenses.map(exp => 
        exp.category && exp.category.toLowerCase() === oldCategoryName.toLowerCase() 
          ? { ...exp, category: trimmedNewName } 
          : exp
      ));
      toast({ title: "Category Updated", description: `"${oldCategoryName}" updated to "${trimmedNewName}".`});
      return true;
    } catch (e: any) {
      handleFirestoreError(e, "Failed to update category.");
      setIsLoading(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);

  const removeCategory = useCallback(async (categoryId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const categoryRef = doc(db, "categories", categoryId);
      const categorySnap = await getDoc(categoryRef);
      if (!categorySnap.exists()) {
         toast({ title: "Not Found", description: `Category to delete not found.`, variant: "destructive" });
         setIsLoading(false);
         return;
      }
      const categoryName = categorySnap.data()?.name;

      const batch = writeBatch(db);
      batch.delete(categoryRef);

      const expensesToUpdateQuery = query(collection(db, "expenses"), where("category", "==", categoryName));
      const expensesToUpdateSnap = await getDocs(expensesToUpdateQuery);
      expensesToUpdateSnap.forEach(expenseDoc => {
        batch.update(doc(db, "expenses", expenseDoc.id), { category: deleteField() }); 
      });
      await batch.commit();

      setCategories(prev => prev.filter(c => c.id !== categoryId));
      setExpenses(prevExpenses => prevExpenses.map(exp => {
          if (exp.category && exp.category.toLowerCase() === categoryName.toLowerCase()) {
            const { category, ...rest } = exp; 
            return rest as Expense; // Assert as Expense after removing category
          }
          return exp;
        }
      ));
      toast({ title: "Category Removed", description: `"${categoryName}" removed.`});
    } catch (e: any) {
      handleFirestoreError(e, "Failed to remove category.");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [toast, handleFirestoreError]);

  const addSettlement = useCallback(async (details: { payerId: string; recipientId: string; amount: number; payerName: string; recipientName: string }): Promise<Expense | null> => {
    setError(null);
    const settlementCategoryName = "Settlement";
    let settlementCategory = categories.find(c => c.name.toLowerCase() === settlementCategoryName.toLowerCase());
    
    if (!settlementCategory) {
      try {
        const newCat = await addCategory(settlementCategoryName);
        if (!newCat) {
            toast({title: "Settlement Error", description: "Could not ensure 'Settlement' category exists.", variant: "destructive"});
            return null;
        }
        settlementCategory = newCat;
      } catch (error) {
        return null;
      }
    }

    const settlementExpenseData = {
      description: `Settlement: ${details.payerName} to ${details.recipientName}`,
      amount: details.amount,
      paidById: details.payerId,
      participantIds: [details.recipientId], 
      category: settlementCategoryName, 
    };
    // addExpense will handle setIsLoading
    return addExpense(settlementExpenseData);
  }, [addExpense, categories, addCategory, toast, handleFirestoreError]);

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
  }), [
    users, expenses, events, categories, currentUser, firebaseUser, isLoading, error, 
    addUser, addExpense, updateExpense, deleteExpense, clearAllExpenses, 
    addEvent, updateEvent, updateUser, setCurrentUserById, 
    addCategory, updateCategory, removeCategory, addSettlement, handleFirestoreError
  ]);

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

