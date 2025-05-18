
"use client";

import React, { useState } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DebtSummaryProps {
  debts: Debt[];
  currentUserId?: string | null;
}

export function DebtSummary({ debts, currentUserId }: DebtSummaryProps) {
  const { addSettlement, users: allUsers, currentUser } = useAppData();
  const { toast } = useToast();
  const [settlementAmountInput, setSettlementAmountInput] = useState<string>('');
  const [settlementError, setSettlementError] = useState<string>('');
  const [currentDebtEntryForDialog, setCurrentDebtEntryForDialog] = useState<Debt | null>(null);


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
  
  const openSettleDialog = (debtEntry: Debt) => {
    setCurrentDebtEntryForDialog(debtEntry);
    setSettlementAmountInput(Math.abs(debtEntry.balance).toFixed(2)); // debt.balance will be negative here
    setSettlementError('');
  };

  const handleConfirmSettlement = () => {
    if (!currentUser || !currentUserId || !currentDebtEntryForDialog || currentDebtEntryForDialog.userId === currentUserId) return;

    const otherUser = allUsers.find(u => u.id === currentDebtEntryForDialog.userId);
    if (!otherUser) return;

    const amountToSettle = parseFloat(settlementAmountInput);
    const maxAmount = parseFloat(Math.abs(currentDebtEntryForDialog.balance).toFixed(2));

    if (isNaN(amountToSettle) || amountToSettle <= 0) {
      const errorMsg = "Please enter a valid positive amount.";
      setSettlementError(errorMsg);
      toast({
        title: "Invalid Amount",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }
    if (amountToSettle > maxAmount) {
      const errorMsg = `Amount cannot exceed the debt of $${maxAmount.toFixed(2)}.`;
      setSettlementError(errorMsg);
      toast({
        title: "Over Settlement Attempted",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }
    setSettlementError('');

    // If showSettleButton is true, currentDebtEntryForDialog.balance < 0, meaning currentUser owes otherUser.
    // Therefore, currentUser is the payer.
    const payerId: string = currentUser.id;
    const recipientId: string = otherUser.id;
    const payerName: string = currentUser.name;
    const recipientName: string = otherUser.name;

    addSettlement({ payerId, recipientId, amount: amountToSettle, payerName, recipientName });
    toast({
      title: "Settlement Recorded",
      description: `Settlement of $${amountToSettle.toFixed(2)} from ${payerName} to ${recipientName} recorded.`,
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
                    else if (debt.balance > 0) balanceTextSuffix = `(Owed by group)`; // Green
                    else balanceTextSuffix = `(Owes to group)`; // Red
                } else { 
                    // For other users, relative to current user
                    if (debt.balance > 0) balanceTextSuffix = `(Owes you)`; // Green (Other user owes current user)
                    else balanceTextSuffix = `(You owe)`; // Red (Current user owes other user)
                }
            } else { 
                if (debt.balance === 0) balanceTextSuffix = '(Settled)';
                else if (debt.balance > 0) balanceTextSuffix = `(is owed)`;
                else balanceTextSuffix = `(owes)`;
            }
            
            // Show settle button if current user owes this other user (debt.balance < 0 for this other user's entry)
            const showSettleButton = currentUserId && !isCurrentUserEntry && debt.balance < 0;

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
                    <AlertDialog onOpenChange={(open) => { if (!open) setCurrentDebtEntryForDialog(null); }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs" onClick={() => openSettleDialog(debt)}>
                          <Landmark className="mr-1 h-3 w-3" /> Settle
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
                          <AlertDialogDescription>
                            Record that you (<strong>{currentUser?.name}</strong>) have paid <strong>{currentDebtEntryForDialog?.userName}</strong>.
                            <br/>This will create a new "Settlement" expense.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2 my-4">
                          <Label htmlFor="settlementAmount">Settlement Amount ($)</Label>
                          <Input
                            id="settlementAmount"
                            type="number"
                            step="0.01"
                            value={settlementAmountInput}
                            onChange={(e) => {
                                setSettlementAmountInput(e.target.value);
                                const val = parseFloat(e.target.value);
                                const maxVal = currentDebtEntryForDialog ? parseFloat(Math.abs(currentDebtEntryForDialog.balance).toFixed(2)) : 0;
                                if (!isNaN(val) && val > 0 && val <= maxVal) {
                                    setSettlementError('');
                                }
                            }}
                            placeholder={`Max $${currentDebtEntryForDialog ? Math.abs(currentDebtEntryForDialog.balance).toFixed(2) : '0.00'}`}
                          />
                          {settlementError && <p className="text-xs text-destructive">{settlementError}</p>}
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setSettlementError('')}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleConfirmSettlement}> 
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

