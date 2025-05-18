
// src/lib/api-client.ts
/**
 * @fileOverview API client for interacting with the backend.
 * Contains functions to fetch and manipulate data via HTTP requests.
 */
import type { User, Expense, Event, EventFormData } from './types';

// Helper function for making API requests
async function request<T>(baseUrl: string, endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    }
    if (response.status === 204) { // No Content
      return undefined as T; // Or handle as appropriate for your API
    }
    return response.json() as Promise<T>;
  } catch (error) {
    console.error(`API request error to ${baseUrl}${endpoint}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}

// --- User Endpoints ---
export const getUsers = async (baseUrl: string): Promise<User[]> => {
  console.log_API('getUsers called on', baseUrl);
  return request<User[]>(baseUrl, '/users');
};

export const addUser = async (baseUrl: string, userData: { name: string; avatarUrl?: string }): Promise<User> => {
  console.log_API('addUser called on', baseUrl, 'with:', userData);
  return request<User>(baseUrl, '/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
};

export const updateUser = async (baseUrl: string, userId: string, userData: { name: string; avatarUrl?: string }): Promise<User> => {
  console.log_API('updateUser called on', baseUrl, 'for:', userId, 'with:', userData);
  return request<User>(baseUrl, `/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
};

// --- Expense Endpoints ---
export const getExpenses = async (baseUrl: string): Promise<Expense[]> => {
  console.log_API('getExpenses called on', baseUrl);
  return request<Expense[]>(baseUrl, '/expenses');
};

export const addExpense = async (baseUrl: string, expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
  console.log_API('addExpense called on', baseUrl, 'with:', expenseData);
  return request<Expense>(baseUrl, '/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData), // Backend should add id and date
  });
};

export const updateExpense = async (baseUrl: string, expenseId: string, expenseData: Omit<Expense, 'id' | 'date'>): Promise<Expense> => {
  console.log_API('updateExpense called on', baseUrl, 'for:', expenseId, 'with:', expenseData);
  return request<Expense>(baseUrl, `/expenses/${expenseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
};

// --- Event Endpoints ---
export const getEvents = async (baseUrl: string): Promise<Event[]> => {
  console.log_API('getEvents called on', baseUrl);
  return request<Event[]>(baseUrl, '/events');
};

export const addEvent = async (baseUrl: string, eventData: EventFormData): Promise<Event> => {
  console.log_API('addEvent called on', baseUrl, 'with:', eventData);
  return request<Event>(baseUrl, '/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData), // Backend should add id
  });
};

export const updateEvent = async (baseUrl: string, eventId: string, eventData: EventFormData): Promise<Event> => {
  console.log_API('updateEvent called on', baseUrl, 'for:', eventId, 'with:', eventData);
  return request<Event>(baseUrl, `/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
};

// --- Category Endpoints ---
export const getCategories = async (baseUrl: string): Promise<string[]> => {
  console.log_API('getCategories called on', baseUrl);
  // Assuming API returns { categories: string[] }
  const response = await request<{ categories: string[] }>(baseUrl, '/categories');
  return response.categories;
};

export const addCategory = async (baseUrl: string, categoryName: string): Promise<{ category: string }> => {
  console.log_API('addCategory called on', baseUrl, 'with:', categoryName);
  return request<{ category: string }>(baseUrl, '/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: categoryName }),
  });
};

export const updateCategory = async (baseUrl: string, oldCategoryName: string, newCategoryName: string): Promise<{ category: string }> => {
  console.log_API('updateCategory called on', baseUrl, 'for old:', oldCategoryName, 'new:', newCategoryName);
  return request<{ category: string }>(baseUrl, `/categories/${encodeURIComponent(oldCategoryName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newCategoryName }),
  });
};

export const removeCategory = async (baseUrl: string, categoryName: string): Promise<void> => {
  console.log_API('removeCategory called on', baseUrl, 'for:', categoryName);
  return request<void>(baseUrl, `/categories/${encodeURIComponent(categoryName)}`, {
    method: 'DELETE',
  });
};

// Helper for logging API calls during development
function console_log_API(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Client]', ...args);
  }
}
