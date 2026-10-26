import { MONTH_NAMES, isoToEth, monthKey, shiftMonth } from "./calendar";
import type { BudgetData, Category, Month, Transaction } from "./types";

export type CategorySummary = {
  category: Category;
  spent: number;
  budget: number;
  remaining: number;
};

export type MonthSummary = {
  income: number;
  expenses: number;
  budget: number;
  remaining: number;
  balance: number;
  categories: CategorySummary[];
};

export type TrendPoint = {
  month: Month;
  label: string;
  income: number;
  expenses: number;
};

export type Insight = {
  title: string;
  detail: string;
  tone: "warning" | "positive" | "neutral";
};

function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return (
    Math.round((amount + Math.sign(amount || 1) * Number.EPSILON) * 100) / 100
  );
}

function compactCurrency(currency: string | undefined): string {
  const normalized = (currency ?? "ETB").trim().toUpperCase();
  if (!normalized || normalized === "ETB" || normalized === "BIRR") return "Br";
  // A three-letter code is concise, understandable, and does not let an
  // arbitrary preference string consume a money label.
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "Br";
}

/** English-localized money label, rounded to Ethiopian birr cents. */
export function money(amount: number, currency = "ETB"): string {
  const rounded = roundCurrency(amount);
  const hasCents = Math.abs(rounded - Math.trunc(rounded)) > Number.EPSILON;
  const number = new Intl.NumberFormat("en", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${compactCurrency(currency)} ${number}`;
}

/** All transactions whose Gregorian dates fall in the supplied Ethiopian month. */
export function monthTransactions(
  data: BudgetData,
  month: Month,
): Transaction[] {
  const key = monthKey(month);
  return data.transactions.filter((transaction) => {
    try {
      // Deliberately do not let a single stale/corrupt saved transaction make a
      // whole budget screen unusable.
      return monthKey(isoToEth(transaction.date)) === key;
    } catch {
      return false;
    }
  });
}

function sumAmounts(
  transactions: Transaction[],
  type: Transaction["type"],
): number {
  return roundCurrency(
    transactions
      .filter((transaction) => transaction.type === type)
      .reduce(
        (sum, transaction) =>
          sum + (Number.isFinite(transaction.amount) ? transaction.amount : 0),
        0,
      ),
  );
}

/** Totals and per-expense-category budget performance for an Ethiopian month. */
export function summarize(data: BudgetData, month: Month): MonthSummary {
  const key = monthKey(month);
  const transactions = monthTransactions(data, month);
  const income = sumAmounts(transactions, "income");
  const expenses = sumAmounts(transactions, "expense");
  const budgetsByCategory = new Map<string, number>();
  for (const budget of data.budgets) {
    if (budget.month !== key || !Number.isFinite(budget.amount)) continue;
    budgetsByCategory.set(
      budget.categoryId,
      roundCurrency(
        (budgetsByCategory.get(budget.categoryId) ?? 0) + budget.amount,
      ),
    );
  }

  const categories = data.categories
    .filter((category) => category.type === "expense")
    .map((category) => {
      const spent = roundCurrency(
        transactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              transaction.categoryId === category.id,
          )
          .reduce(
            (sum, transaction) =>
              sum +
              (Number.isFinite(transaction.amount) ? transaction.amount : 0),
            0,
          ),
      );
      const budget = roundCurrency(budgetsByCategory.get(category.id) ?? 0);
      return {
        category,
        spent,
        budget,
        remaining: roundCurrency(budget - spent),
      };
    });

  // Count every saved budget amount in the selected month. Categories that were
  // deleted after a budget was set still belong in the month's total budget.
  const budget = roundCurrency(
    [...budgetsByCategory.values()].reduce((sum, amount) => sum + amount, 0),
  );
  return {
    income,
    expenses,
    budget,
    remaining: roundCurrency(budget - expenses),
    balance: roundCurrency(income - expenses),
    categories,
  };
}

/** Chronological monthly income/expense data ending at `month`. */
export function getTrend(
  data: BudgetData,
  month: Month,
  count = 6,
): TrendPoint[] {
  monthKey(month);
  const requested = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 6;
  const available = (month.year - 1) * 13 + month.month;
  const length = Math.min(requested, available);
  if (length === 0) return [];
  const first = shiftMonth(month, -(length - 1));
  const trend: TrendPoint[] = [];
  for (let index = 0; index < length; index += 1) {
    const itemMonth = shiftMonth(first, index);
    const summary = summarize(data, itemMonth);
    trend.push({
      month: itemMonth,
      label: `${MONTH_NAMES[itemMonth.month - 1]} ${itemMonth.year}`,
      income: summary.income,
      expenses: summary.expenses,
    });
  }
  return trend;
}

/**
 * Concise factual observations based only on saved values. No insight is added
 * where a percentage would need a zero (or negative) denominator.
 */
export function getInsights(data: BudgetData, month: Month): Insight[] {
  const current = summarize(data, month);
  const insights: Insight[] = [];

  for (const item of current.categories
    .filter((c) => c.budget > 0 && c.spent > c.budget)
    .sort((a, b) => b.spent / b.budget - a.spent / a.budget)) {
    const percent = Math.round(
      ((item.spent - item.budget) / item.budget) * 100,
    );
    insights.push({
      title: `${item.category.name} is ${percent}% over budget`,
      detail: `${money(item.spent, data.currency)} spent against ${money(item.budget, data.currency)} planned. That’s ${money(-item.remaining, data.currency)} over.`,
      tone: "warning",
    });
  }

  if (current.budget > 0 && current.expenses > current.budget) {
    const over = roundCurrency(current.expenses - current.budget);
    const percent = Math.round((over / current.budget) * 100);
    insights.push({
      title: "Over budget",
      detail: `${money(over, data.currency)} (${percent}%) over the ${money(current.budget, data.currency)} budget.`,
      tone: "warning",
    });
  } else if (current.budget > 0 && current.expenses <= current.budget) {
    insights.push({
      title: "Within budget",
      detail: `${money(current.remaining, data.currency)} remains from the ${money(current.budget, data.currency)} budget.`,
      tone: "positive",
    });
  }

  const unbudgeted = current.categories.filter(
    (category) => category.spent > 0 && category.budget <= 0,
  );
  if (unbudgeted.length > 0) {
    const spent = roundCurrency(
      unbudgeted.reduce((sum, category) => sum + category.spent, 0),
    );
    const names = unbudgeted.map(({ category }) => category.name).join(", ");
    insights.push({
      title: "Unbudgeted spending",
      detail: `${money(spent, data.currency)} was spent in ${names} without a budget this month.`,
      tone: "warning",
    });
  }

  // A prior month exists unless this is the first supported Ethiopian month.
  if (!(month.year === 1 && month.month === 1)) {
    const previous = summarize(data, shiftMonth(month, -1));
    // Percent changes are meaningful only with a positive previous spend.
    if (previous.expenses > 0 && current.expenses !== previous.expenses) {
      const change = Math.round(
        (Math.abs(current.expenses - previous.expenses) / previous.expenses) *
          100,
      );
      if (current.expenses > previous.expenses) {
        insights.push({
          title: "Spending increased",
          detail: `Expenses are ${change}% higher than the previous month.`,
          tone: "warning",
        });
      } else {
        insights.push({
          title: "Spending decreased",
          detail: `Expenses are ${change}% lower than the previous month.`,
          tone: "positive",
        });
      }
    }
  }

  return insights;
}
