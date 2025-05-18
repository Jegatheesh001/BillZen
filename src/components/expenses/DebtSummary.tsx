
"use client";

import type { Debt } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Scale, Landmark } from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { useToast } from '@/hooks/use-toast';
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

interface DebtSummaryProps {
  debts: Debt[];
  currentUserId?: string | null;
}

export function DebtSummary({ debts, currentUserId }: DebtSummaryProps) {
  const { addSettlement, users: allUsers, currentUser } = useAppData();
  const { toast } = useToast();

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

  const handleSettlement = (debtEntry: Debt) => {
    if (!currentUser || !currentUserId || debtEntry.userId === currentUserId) return;

    const otherUser = allUsers.find(u => u.id === debtEntry.userId);
    if (!otherUser) return;

    let payerId: string, recipientId: string, amount: number, payerName: string, recipientName: string;

    if (debtEntry.balance > 0) { // Other user owes current user
      payerId = otherUser.id;
      recipientId = currentUser.id;
      payerName = otherUser.name;
      recipientName = currentUser.name;
      amount = debtEntry.balance;
    } else { // Current user owes other user
      payerId = currentUser.id;
      recipientId = otherUser.id;
      payerName = currentUser.name;
      recipientName = otherUser.name;
      amount = Math.abs(debtEntry.balance);
    }

    addSettlement({ payerId, recipientId, amount, payerName, recipientName });
    toast({
      title: "Settlement Recorded",
      description: `Settlement of $${amount.toFixed(2)} between ${payerName} and ${recipientName} recorded.`,
    });
  };
  
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

            if (currentUserId) { 
                if (isCurrentUserEntry) {
                    namePrefix = "Your Overall Balance";
                    if (debt.balance === 0) balanceTextSuffix = '(Settled with the group)';
                    else if (debt.balance > 0) balanceTextSuffix = `(Owed by group)`;
                    else balanceTextSuffix = `(Owes to group)`;
                } else { 
                    if (debt.balance > 0) balanceTextSuffix = `(Owes you)`;
                    else balanceTextSuffix = `(You owe)`;
                }
            } else { 
                if (debt.balance === 0) balanceTextSuffix = '(Settled)';
                else if (debt.balance > 0) balanceTextSuffix = `(is owed)`;
                else balanceTextSuffix = `(owes)`;
            }
            
            const showSettleButton = currentUserId && !isCurrentUserEntry && debt.balance !== 0;

            return (
              <li key={debt.userId} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={debt.avatarUrl} alt={debt.userName} data-ai-hint="person portrait" />
                    <AvatarFallback>{debt.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{namePrefix}</span>
                </div>
                <div className="flex items-center">
                  <div className={`flex items-center font-semibold mr-2 ${debt.balance === 0 ? 'text-muted-foreground' : debt.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {debt.balance === 0 ? <Scale className="h-5 w-5 mr-1" /> : debt.balance > 0 ? 
                      <TrendingUp className="h-5 w-5 mr-1" /> : 
                      <TrendingDown className="h-5 w-5 mr-1" />
                    }
                    ${amountDisplay}
                    <span className="text-xs font-normal ml-1 text-muted-foreground">
                      {balanceTextSuffix}
                    </span>
                  </div>
                  {showSettleButton && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">
                          <Landmark className="mr-1 h-3 w-3" /> Settle
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
                          <AlertDialogDescription>
                            {debt.balance > 0 
                              ? `Record that ${debt.userName} has paid you $${amountDisplay}?`
                              : `Record that you have paid ${debt.userName} $${amountDisplay}?`
                            }
                            <br/>This will create a new "Settlement" expense.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleSettlement(debt)}>
                            Confirm Settlement
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
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
