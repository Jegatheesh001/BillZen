
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
  const { expenses, users, events, currentUser } = useAppData(); // Get currentUser
  const [searchTerm, setSearchTerm] = useState('');

  const debts = useMemo(() => calculateDebts(expenses, users, currentUser?.id), [expenses, users, currentUser]);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return expenses;
    return expenses.filter(expense => 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      users.find(u => u.id === expense.paidById)?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm, users]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Expenses</h2>
        <Button onClick={handleAddExpenseClick} size="sm" className="rounded-full">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Expense
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search expenses..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <DebtSummary debts={debts} currentUserId={currentUser?.id} /> {/* Pass currentUserId */}

      <div>
        <h3 className="text-xl font-semibold mb-3">Recent Expenses</h3>
        {filteredExpenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No expenses recorded yet. <br/>Click &quot;Add Expense&quot; to get started!
          </p>
        ) : (
          <ScrollArea className="h-[calc(100vh-28rem)]"> {/* Adjust height as needed */}
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
