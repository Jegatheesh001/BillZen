
// src/lib/api-client.ts
/**
 * @fileOverview API client for interacting with the backend.
 * Contains functions to fetch and manipulate data via HTTP requests.
 * NOTE: This is a stub implementation. Replace with actual API calls.
 */
import type { User, Expense, Event, EventFormData } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'; // Replace with your actual API base URL or use env var

// Helper function for making API requests
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    }
    if (response.status === 204) { // No Content
      return undefined as T; // Or handle as appropriate for your API
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`API request error to ${endpoint}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}

// --- User Endpoints ---
export const getUsers = async (): Promise<User[]> => {
  console.log_API('getUsers called');
  return request<User[]>('/users');
};

export const addUser = async (userData: { name: string; avatarUrl?: string }): Promise<User> => {
  console.log_API('addUser called with:', userData);
  return request<User>('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
};

export const updateUser = async (userId: string, userData: { name: string; avatarUrl?: string }): Promise<User> => {
  console.log_API('updateUser called for:', userId, 'with:', userData);
  return request<User>(`/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
};

// --- Expense Endpoints ---
export const getExpenses = async (): Promise<Expense[]> => {
  console.log_API('getExpenses called');
  return request<Expense[]>('/expenses');
};

export const addExpense = async (expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
  console.log_API('addExpense called with:', expenseData);
  return request<Expense>('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData), // Backend should add id and date
  });
};

export const updateExpense = async (expenseId: string, expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
  console.log_API('updateExpense called for:', expenseId, 'with:', expenseData);
  return request<Expense>(`/expenses/${expenseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
};

// --- Event Endpoints ---
export const getEvents = async (): Promise<Event[]> => {
  console.log_API('getEvents called');
  return request<Event[]>('/events');
};

export const addEvent = async (eventData: EventFormData): Promise<Event> => {
  console.log_API('addEvent called with:', eventData);
  return request<Event>('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData), // Backend should add id
  });
};

export const updateEvent = async (eventId: string, eventData: EventFormData): Promise<Event> => {
  console.log_API('updateEvent called for:', eventId, 'with:', eventData);
  return request<Event>(`/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
};

// --- Category Endpoints ---
export const getCategories = async (): Promise<string[]> => {
  console.log_API('getCategories called');
  // Assuming API returns { categories: string[] }
  const response = await request<{ categories: string[] }>('/categories');
  return response.categories;
};

export const addCategory = async (categoryName: string): Promise<{ category: string }> => {
  console.log_API('addCategory called with:', categoryName);
  return request<{ category: string }>('/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: categoryName }),
  });
};

export const updateCategory = async (oldCategoryName: string, newCategoryName: string): Promise<{ category: string }> => {
  console.log_API('updateCategory called for old:', oldCategoryName, 'new:', newCategoryName);
  // This endpoint might need specific design, e.g., how to identify the category to update
  return request<{ category: string }>(`/categories/${encodeURIComponent(oldCategoryName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newCategoryName }),
  });
};

export const removeCategory = async (categoryName: string): Promise<void> => {
  console.log_API('removeCategory called for:', categoryName);
  return request<void>(`/categories/${encodeURIComponent(categoryName)}`, {
    method: 'DELETE',
  });
};

// Helper for logging API calls during development
// Using console.log_API to avoid lint errors if console.log is restricted
function console_log_API(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Client]', ...args);
  }
}
