
import type { Expense, User, Debt } from './types';

export function calculateDebts(expenses: Expense[], users: User[], currentUserId?: string | null): Debt[] {
  if (!users.length) return [];

  const userOverallBalances: Record<string, number> = {};
  users.forEach(user => userOverallBalances[user.id] = 0);

  if (expenses.length > 0) {
    expenses.forEach(expense => {
      // User who paid gets credited for the full amount they paid
      userOverallBalances[expense.paidById] = (userOverallBalances[expense.paidById] || 0) + expense.amount;
      
      // Each participant is debited their share
      const share = expense.amount / expense.participantIds.length;
      expense.participantIds.forEach(participantId => {
        userOverallBalances[participantId] = (userOverallBalances[participantId] || 0) - share;
      });
    });
  }

  // If no current user is specified, or no expenses, return overall balances for everyone.
  if (!currentUserId || !expenses.length) {
    return users.map(user => ({
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      balance: parseFloat((userOverallBalances[user.id] || 0).toFixed(2)),
    })).sort((a, b) => b.balance - a.balance);
  }

  // If a current user IS specified, calculate debts relative to them.
  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) { // Should not happen if currentUserId is valid but users list might be out of sync
    // Fallback to overall balances if currentUser not found for some reason
     return users.map(user => ({
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      balance: parseFloat((userOverallBalances[user.id] || 0).toFixed(2)),
    })).sort((a, b) => b.balance - a.balance);
  }


  const debtsResult: Debt[] = [];

  // 1. Add the current user's overall balance (their net standing in the group)
  debtsResult.push({
    userId: currentUser.id,
    userName: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
    balance: parseFloat((userOverallBalances[currentUser.id] || 0).toFixed(2)),
  });

  // 2. For each OTHER user, calculate what they owe to the current user, or what the current user owes them.
  users.forEach(otherUser => {
    if (otherUser.id === currentUserId) return; // Skip the current user, already added.

    let netAmountOtherUserOwesCurrentUser = 0;

    expenses.forEach(expense => {
      const isCurrentUserParticipant = expense.participantIds.includes(currentUser.id);
      const isOtherUserParticipant = expense.participantIds.includes(otherUser.id);

      // Only consider expenses where both currentUser and otherUser are participants
      if (isCurrentUserParticipant && isOtherUserParticipant) {
        const share = expense.amount / expense.participantIds.length;

        if (expense.paidById === currentUser.id) {
          // CurrentUser paid, OtherUser was a participant. So OtherUser owes CurrentUser their share.
          netAmountOtherUserOwesCurrentUser += share;
        } else if (expense.paidById === otherUser.id) {
          // OtherUser paid, CurrentUser was a participant. So CurrentUser owes OtherUser their share.
          netAmountOtherUserOwesCurrentUser -= share;
        }
        // If a third party paid for both, their direct debt to each other is not affected by this expense.
      }
    });

    // Only add if there's a non-trivial balance to display
    if (Math.abs(netAmountOtherUserOwesCurrentUser) > 0.005) { // Using a small epsilon for float comparison
      debtsResult.push({
        userId: otherUser.id,
        userName: otherUser.name,
        avatarUrl: otherUser.avatarUrl,
        // Positive: otherUser owes currentUser. Negative: currentUser owes otherUser.
        balance: parseFloat(netAmountOtherUserOwesCurrentUser.toFixed(2)),
      });
    }
  });

  return debtsResult.sort((a,b) => {
      if (a.userId === currentUserId) return -1; // Current user always first
      if (b.userId === currentUserId) return 1;
      // For other users, sort by who owes the current user the most, then by who the current user owes the most
      return b.balance - a.balance; 
  });
}
