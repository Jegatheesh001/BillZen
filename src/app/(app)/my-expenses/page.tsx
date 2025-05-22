
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // Added
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, FilterX } from 'lucide-react'; // Added FilterX
import { Input } from '@/components/ui/input';
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { useAppData } from '@/context/AppDataContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Expense } from '@/lib/types';
import Link from 'next/link'; // Added Link for clearing filter

export default function MyExpensesPage() {
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { expenses, users, events, currentUser } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');

  const searchParams = useSearchParams(); // Added
  const eventIdFromQuery = searchParams.get('eventId'); // Added
  
  const [pageTitle, setPageTitle] = useState("My Expenses"); // Added for dynamic title

  useEffect(() => { // Added to update title based on filter
    if (eventIdFromQuery) {
      const event = events.find(e => e.id === eventIdFromQuery);
      if (event) {
        setPageTitle(`Expenses for: ${event.name}`);
      } else {
        setPageTitle("Event Expenses");
      }
    } else {
      setPageTitle("My Expenses");
    }
  }, [eventIdFromQuery, events]);


  const userAndEventExpenses = useMemo(() => { // Renamed and modified
    if (!currentUser) return [];
    let filtered = expenses.filter(expense => 
      expense.paidById === currentUser.id || expense.participantIds.includes(currentUser.id)
    );

    if (eventIdFromQuery) { // Added event filtering
      filtered = filtered.filter(expense => expense.eventId === eventIdFromQuery);
    }
    return filtered;
  }, [expenses, currentUser, eventIdFromQuery]);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return userAndEventExpenses;

    return userAndEventExpenses.filter(expense => 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (users.find(u => u.id === expense.paidById)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [userAndEventExpenses, users, searchTerm]);

  const handleAddExpenseClick = () => {
    setEditingExpense(null);
    setIsExpenseSheetOpen(true);
  };

  const handleEditExpenseClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseSheetOpen(true);
  };

  const handleSheetOpenChange = (isOpen: boolean) => {
    setIsExpenseSheetOpen(isOpen);
    if (!isOpen) {
      setEditingExpense(null);
    }
  };

  const noExpensesMessage = currentUser 
    ? (eventIdFromQuery ? "No expenses found for this event." : "You have no expenses recorded yet.") 
    : "Please select a user profile to see your expenses.";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{pageTitle}</h2>
        <Button onClick={handleAddExpenseClick} size="sm" className="rounded-full">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Expense
        </Button>
      </div>
      
      <div className="flex gap-2 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search your expenses..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {eventIdFromQuery && (
           <Link href="/my-expenses" passHref legacyBehavior>
            <Button variant="outline" size="icon" title="Clear event filter">
              <FilterX className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>


      <div>
        {filteredExpenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {noExpensesMessage} <br/>
            {currentUser && !eventIdFromQuery && "Click \"Add Expense\" to get started!"}
            {currentUser && eventIdFromQuery && "Add an expense to this event!"}
          </p>
        ) : (
          <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
            <div className="space-y-4 pr-2">
            {filteredExpenses.map(expense => {
              const eventName = events.find(e => e.id === expense.eventId)?.name;
              return (
                <ExpenseCard 
                  key={expense.id} 
                  expense={expense} 
                  users={users} 
                  eventName={eventName}
                  onEdit={handleEditExpenseClick} 
                />
              );
            })}
            </div>
          </ScrollArea>
        )}
      </div>

      <AddExpenseSheet 
        open={isExpenseSheetOpen} 
        onOpenChange={handleSheetOpenChange}
        expenseToEdit={editingExpense}
        defaultEventId={eventIdFromQuery} // Pass eventId from query
      />
    </div>
  );
}
