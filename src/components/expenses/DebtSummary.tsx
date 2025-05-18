
"use client";

import type { Debt } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface DebtSummaryProps {
  debts: Debt[];
  currentUserId?: string | null;
}

export function DebtSummary({ debts, currentUserId }: DebtSummaryProps) {
  const noDebtsToShow = debts.length === 0 ||
                        (currentUserId && debts.length === 1 && debts[0].userId === currentUserId && debts[0].balance === 0);

  if (noDebtsToShow) {
    return (
      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Scale className="mr-2 h-5 w-5 text-primary" />
            Balance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No outstanding balances to show.</p>
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
          {debts.map(debt => {
            const isCurrentUserEntry = debt.userId === currentUserId;
            let balanceTextSuffix = '';
            let namePrefix = debt.userName;
            let amountDisplay = Math.abs(debt.balance).toFixed(2);

            if (currentUserId) { // If there's a perspective of a current user
                if (isCurrentUserEntry) {
                    namePrefix = "Your Overall Balance";
                    if (debt.balance === 0) balanceTextSuffix = '(Settled with the group)';
                    else if (debt.balance > 0) balanceTextSuffix = `(Owed by group)`;
                    else balanceTextSuffix = `(Owes to group)`;
                } else { 
                    // Entry for another user, relative to current user
                    // debt.balance > 0 means otherUser owes currentUser
                    // debt.balance < 0 means currentUser owes otherUser
                    if (debt.balance > 0) balanceTextSuffix = `(Owes you)`;
                    else balanceTextSuffix = `(You owe)`;
                }
            } else { // Overall perspective (no currentUserId provided or it's null)
                if (debt.balance === 0) balanceTextSuffix = '(Settled)';
                else if (debt.balance > 0) balanceTextSuffix = `(is owed)`;
                else balanceTextSuffix = `(owes)`;
            }

            return (
              <li key={debt.userId} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={debt.avatarUrl} alt={debt.userName} data-ai-hint="person portrait" />
                    <AvatarFallback>{debt.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{namePrefix}</span>
                </div>
                <div className={`flex items-center font-semibold ${debt.balance === 0 ? 'text-muted-foreground' : debt.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {debt.balance === 0 ? <Scale className="h-5 w-5 mr-1" /> : debt.balance > 0 ? 
                    <TrendingUp className="h-5 w-5 mr-1" /> : 
                    <TrendingDown className="h-5 w-5 mr-1" />
                  }
                  ${amountDisplay}
                  <span className="text-xs font-normal ml-1 text-muted-foreground">
                    {balanceTextSuffix}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          {currentUserId ? "Balances shown are relative to you or your overall standing." : "This is a simplified summary of overall balances."}
        </p>
      </CardContent>
    </Card>
  );
}
