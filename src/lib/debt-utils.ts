
import type { Expense, User, Debt } from './types';

export function calculateDebts(expenses: Expense[], users: User[], currentUserId?: string | null): Debt[] {
  if (!users.length) return [];

  const userOverallBalances: Record<string, number> = {};
  users.forEach(user => userOverallBalances[user.id] = 0);

  if (expenses.length > 0) {
    expenses.forEach(expense => {
      userOverallBalances[expense.paidById] = (userOverallBalances[expense.paidById] || 0) + expense.amount;
      
      const share = expense.amount / expense.participantIds.length;
      expense.participantIds.forEach(participantId => {
        userOverallBalances[participantId] = (userOverallBalances[participantId] || 0) - share;
      });
    });
  }

  if (!currentUserId || !expenses.length) {
    return users.map(user => ({
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      balance: parseFloat((userOverallBalances[user.id] || 0).toFixed(2)),
    })).sort((a, b) => b.balance - a.balance);
  }

  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) {
     return users.map(user => ({
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      balance: parseFloat((userOverallBalances[user.id] || 0).toFixed(2)),
    })).sort((a, b) => b.balance - a.balance);
  }

  const debtsResult: Debt[] = [];
  debtsResult.push({
    userId: currentUser.id,
    userName: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
    balance: parseFloat((userOverallBalances[currentUser.id] || 0).toFixed(2)),
  });

  users.forEach(otherUser => {
    if (otherUser.id === currentUserId) return;

    let netAmountOtherUserOwesCurrentUser = 0;

    expenses.forEach(expense => {
      const isCurrentUserParticipant = expense.participantIds.includes(currentUser.id);
      const isOtherUserParticipant = expense.participantIds.includes(otherUser.id);
      const share = expense.amount / expense.participantIds.length;

      if (expense.category === "Settlement") {
        // Handle settlements between currentUser and otherUser specifically
        if (expense.paidById === otherUser.id && isCurrentUserParticipant) {
          // OtherUser paid currentUser (settlement by otherUser)
          netAmountOtherUserOwesCurrentUser += expense.amount;
        } else if (expense.paidById === currentUser.id && isOtherUserParticipant) {
          // CurrentUser paid otherUser (settlement by currentUser)
          netAmountOtherUserOwesCurrentUser -= expense.amount;
        }
      } else {
        // Handle regular expenses involving both
        if (isCurrentUserParticipant && isOtherUserParticipant) {
          if (expense.paidById === currentUser.id) {
            netAmountOtherUserOwesCurrentUser += share;
          } else if (expense.paidById === otherUser.id) {
            netAmountOtherUserOwesCurrentUser -= share;
          }
        }
      }
    });
    
    // Only add if there's a non-trivial balance to display
    // Using a small epsilon for float comparison, e.g. 0.005 for half a cent
    if (Math.abs(netAmountOtherUserOwesCurrentUser) > 0.005) { 
      debtsResult.push({
        userId: otherUser.id,
        userName: otherUser.name,
        avatarUrl: otherUser.avatarUrl,
        balance: parseFloat(netAmountOtherUserOwesCurrentUser.toFixed(2)),
      });
    }
  });

  return debtsResult.sort((a,b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return b.balance - a.balance; 
  });
}
