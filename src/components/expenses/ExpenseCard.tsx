
"use client";

import type { Expense as ExpenseType, User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Tag, Users, CalendarIcon, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';

interface ExpenseCardProps {
  expense: ExpenseType;
  users: User[];
  eventName?: string;
  onEdit: (expense: ExpenseType) => void;
}

export function ExpenseCard({ expense, users, eventName, onEdit }: ExpenseCardProps) {
  const paidBy = users.find(u => u.id === expense.paidById);
  const participants = users.filter(u => expense.participantIds.includes(u.id));
  const { currentUser, deleteExpense: contextDeleteExpense, isLoading: isAppLoading } = useAppData();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const canDelete = currentUser && expense.paidById === currentUser.id;

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await contextDeleteExpense(expense.id);
      // Toast is handled by context now
      setIsAlertOpen(false);
    } catch (error: any) {
      // Toast is handled by context now
      console.error("Failed to delete expense from card:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="mb-4 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">{expense.description}</CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-sm font-bold">
              ${expense.amount.toFixed(2)}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(expense)} disabled={isAppLoading || isDeleting}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit expense</span>
            </Button>
            {canDelete && (
              <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" disabled={isAppLoading || isDeleting}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete expense</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the expense: "{expense.description}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteConfirm} 
                      disabled={isDeleting || isAppLoading}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        {expense.category && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Tag className="h-3 w-3 mr-1" /> {expense.category}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-2 text-sm">
        <div className="flex items-center">
          <Coins className="h-4 w-4 mr-2 text-primary" />
          <span>Paid by: </span>
          {paidBy && (
            <div className="flex items-center ml-1 font-medium">
              <Avatar className="h-5 w-5 mr-1.5">
                <AvatarImage src={paidBy.avatarUrl} alt={paidBy.name} data-ai-hint="person portrait" />
                <AvatarFallback>{paidBy.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {paidBy.name}
            </div>
          )}
        </div>
        <div className="flex items-start"> {/* Aligns icon with the top of the first line of badges */}
          <Users className="h-4 w-4 mr-2 mt-0.5 text-primary" /> {/* Icon */}
          <span className="mr-1">For: </span> {/* Label */}
          <div className="flex flex-wrap gap-1"> {/* Container FOR BADGES, allows wrapping */}
            {participants.map(p => (
              <Badge key={p.id} variant="outline" className="text-xs inline-flex items-center">
                <Avatar className="h-4 w-4 mr-1">
                  <AvatarImage src={p.avatarUrl} alt={p.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {p.name}
              </Badge>
            ))}
          </div>
        </div>
        {eventName && (
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3 mr-1" /> In Event: {eventName}
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-card/50 p-2 text-xs text-muted-foreground">
        <p>Date: {format(new Date(expense.date), "MMM d, yyyy, h:mm a")}</p>
      </CardFooter>
    </Card>
  );
}
