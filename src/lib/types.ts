
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string; // Optional email field
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string; // User ID
  participantIds: string[]; // User IDs
  eventId?: string; // Event ID
  category?: string; // This will store the category NAME
  date: string; // ISO string date
}

export interface Event {
  id: string;
  name: string;
  memberIds: string[]; // User IDs
  // expenses can be filtered from global expenses list by eventId
}

// Used for form data when creating/updating an event, omitting the id
export type EventFormData = Omit<Event, 'id'>;

export interface Debt {
  userId: string;
  userName: string;
  avatarUrl: string;
  balance: number; // Positive if owed, negative if owes
}

export interface Category { // New Category type
  id: string;
  name: string;
}
