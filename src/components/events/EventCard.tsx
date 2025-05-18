"use client";

import type { Event as EventType, User, Expense } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Receipt } from 'lucide-react';

interface EventCardProps {
  event: EventType;
  users: User[];
  expenses: Expense[]; // To count expenses for this event
}

export function EventCard({ event, users, expenses }: EventCardProps) {
  const members = users.filter(u => event.memberIds.includes(u.id));
  const eventExpensesCount = expenses.filter(ex => ex.eventId === event.id).length;
  const totalEventSpend = expenses
    .filter(ex => ex.eventId === event.id)
    .reduce((sum, ex) => sum + ex.amount, 0);

  return (
    <Card className="mb-4 shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="bg-card/50 p-4">
        <CardTitle className="text-lg font-semibold text-foreground">{event.name}</CardTitle>
        <CardDescription className="text-xs">
          {members.length} member{members.length === 1 ? '' : 's'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-sm">
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-2 text-primary" />
          <span>Members:</span>
          <div className="flex flex-wrap gap-1 ml-2">
            {members.slice(0, 5).map(member => ( // Show first 5 members
              <Avatar key={member.id} className="h-6 w-6 border-2 border-background shadow-sm" title={member.name}>
                <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && <Badge variant="secondary">+{members.length - 5} more</Badge>}
          </div>
        </div>
        <div className="flex items-center">
          <Receipt className="h-4 w-4 mr-2 text-primary" />
          <span>{eventExpensesCount} expense{eventExpensesCount === 1 ? '' : 's'}</span>
          {totalEventSpend > 0 && (
             <span className="ml-auto text-xs font-semibold text-muted-foreground">
              Total: ${totalEventSpend.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>
      {/* Future: Add CardFooter for actions like 'View Details' or 'Settle Up' */}
    </Card>
  );
}
