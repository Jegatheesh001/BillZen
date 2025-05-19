
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { DebtSummary } from '@/components/expenses/DebtSummary';
import { useAppData } from '@/context/AppDataContext';
import { calculateDebts } from '@/lib/debt-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Expense } from '@/lib/types';

export default function ExpensesPage() {
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { expenses, users, events, currentUser } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');

  const debts = useMemo(() => calculateDebts(expenses, users, currentUser?.id), [expenses, users, currentUser]);

  const filteredExpenses = useMemo(() => {
    if (!currentUser) {
      return []; // If no user is selected, show no expenses
    }

    // 1. Filter by selected user
    let userRelatedExpenses = expenses.filter(expense =>
        expense.paidById === currentUser.id || expense.participantIds.includes(currentUser.id)
    );

    // 2. Filter by search term
    if (searchTerm) {
        userRelatedExpenses = userRelatedExpenses.filter(expense =>
            expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (users.find(u => u.id === expense.paidById)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    // 3. Limit to 5 items
    return userRelatedExpenses.slice(0, 5);
  }, [expenses, users, currentUser, searchTerm]);

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
      setEditingExpense(null); // Clear editing expense when sheet is closed
    }
  };

  const noExpensesMessage = currentUser
    ? (searchTerm ? "No expenses found matching your search." : "You have no recent expenses.")
    : "Please select a user profile to see recent expenses.";

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Button onClick={handleAddExpenseClick} size="sm" className="rounded-full">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Expense
        </Button>
      </div>
      
      <DebtSummary debts={debts} currentUserId={currentUser?.id} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search recent expenses..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">Recent Expenses</h3>
        {filteredExpenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {noExpensesMessage} <br/>
            {currentUser && !searchTerm && "Click \"Add Expense\" to get started!"}
          </p>
        ) : (
          <ScrollArea className="h-[calc(100vh-28rem)]"> {/* Adjust height if limiting to 5 items makes this too tall */}
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
      />
    </div>
  );
}
