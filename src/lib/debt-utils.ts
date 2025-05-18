import type { Expense, User, Debt } from './types';

export function calculateDebts(expenses: Expense[], users: User[]): Debt[] {
  if (!users.length || !expenses.length) return [];

  const userBalances: Record<string, number> = {};
  users.forEach(user => userBalances[user.id] = 0);

  expenses.forEach(expense => {
    // User who paid gets credited
    userBalances[expense.paidById] = (userBalances[expense.paidById] || 0) + expense.amount;
    
    // Each participant owes their share
    const share = expense.amount / expense.participantIds.length;
    expense.participantIds.forEach(participantId => {
      userBalances[participantId] = (userBalances[participantId] || 0) - share;
    });
  });

  return users.map(user => ({
    userId: user.id,
    userName: user.name,
    avatarUrl: user.avatarUrl,
    balance: parseFloat(userBalances[user.id].toFixed(2)),
  })).sort((a,b) => b.balance - a.balance); // Optional: sort by balance
}
