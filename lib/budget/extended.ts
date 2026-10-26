import { isoToEth, monthKey } from "./calendar";
import { Account, BudgetData, Goal, Loan, Month, Transaction } from "./types";
export function accountTransactions(
  data: BudgetData,
  accountId: string,
): Transaction[] {
  return data.transactions.filter(
    (t) => (t.accountId ?? data.accounts[0]?.id) === accountId,
  );
}
export function accountBalance(data: BudgetData, account: Account): number {
  return (
    account.openingBalance +
    accountTransactions(data, account.id).reduce(
      (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
      0,
    )
  );
}
export function accountMonthTotals(
  data: BudgetData,
  accountId: string,
  month: Month,
) {
  const key = monthKey(month);
  return accountTransactions(data, accountId)
    .filter((t) => monthKey(isoToEth(t.date)) === key)
    .reduce(
      (out, t) => {
        out[t.type] += t.amount;
        return out;
      },
      { income: 0, expense: 0 },
    );
}
export function goalProgress(goal: Goal) {
  return goal.target > 0
    ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
    : 0;
}
export function loanProgress(loan: Loan) {
  return loan.principal > 0
    ? Math.min(
        100,
        Math.round(((loan.principal - loan.remaining) / loan.principal) * 100),
      )
    : 0;
}
export function totalLoanRemaining(loans: Loan[]) {
  return loans.reduce((s, l) => s + l.remaining, 0);
}
