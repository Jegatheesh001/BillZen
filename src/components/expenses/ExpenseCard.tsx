
"use client";

import type { Expense as ExpenseType, User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Tag, Users, CalendarIcon, Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface ExpenseCardProps {
  expense: ExpenseType;
  users: User[];
  eventName?: string;
  onEdit: (expense: ExpenseType) => void;
}

export function ExpenseCard({ expense, users, eventName, onEdit }: ExpenseCardProps) {
  const paidBy = users.find(u => u.id === expense.paidById);
  const participants = users.filter(u => expense.participantIds.includes(u.id));

  return (
    <Card className="mb-4 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">{expense.description}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-bold">
              ${expense.amount.toFixed(2)}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(expense)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit expense</span>
            </Button>
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
        <div className="flex items-start">
          <Users className="h-4 w-4 mr-2 mt-0.5 text-primary" />
          <div>
            <span>For: </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
            {participants.map(p => (
              <Badge key={p.id} variant="outline" className="text-xs">
                <Avatar className="h-4 w-4 mr-1">
                  <AvatarImage src={p.avatarUrl} alt={p.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {p.name}
              </Badge>
            ))}
            </div>
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
