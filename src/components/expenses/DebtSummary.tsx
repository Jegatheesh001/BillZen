"use client";

import type { Debt } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface DebtSummaryProps {
  debts: Debt[];
}

export function DebtSummary({ debts }: DebtSummaryProps) {
  if (debts.length === 0) {
    return (
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Scale className="mr-2 h-5 w-5 text-primary" />
            Balance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No debts or balances to show yet. Add some expenses!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
            <Scale className="mr-2 h-5 w-5 text-primary" />
            Balance Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {debts.map(debt => (
            <li key={debt.userId} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src={debt.avatarUrl} alt={debt.userName} data-ai-hint="person portrait" />
                  <AvatarFallback>{debt.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{debt.userName}</span>
              </div>
              <div className={`flex items-center font-semibold ${debt.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {debt.balance >= 0 ? 
                  <TrendingUp className="h-5 w-5 mr-1" /> : 
                  <TrendingDown className="h-5 w-5 mr-1" />
                }
                ${Math.abs(debt.balance).toFixed(2)}
                <span className="text-xs font-normal ml-1 text-muted-foreground">
                  {debt.balance === 0 ? '(Settled)' : debt.balance > 0 ? '(is owed)' : '(owes)'}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-4 text-center">This is a simplified summary of balances.</p>
      </CardContent>
    </Card>
  );
}
