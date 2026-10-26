import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  ethToISO,
  formatEthDate,
  isoToEth,
  isValidEthDate,
  monthKey,
  shiftMonth,
} from "../lib/budget/calendar";
import {
  getInsights,
  getTrend,
  money,
  summarize,
} from "../lib/budget/analytics";
import {
  detectMapping,
  exportBudgets,
  exportTransactions,
  parseCSV,
  previewBudgetImport,
  previewImport,
} from "../lib/budget/csv";
import type { BudgetData, Category } from "../lib/budget/types";

const food: Category = {
  id: "food",
  name: "Food",
  type: "expense",
  color: "#000",
  icon: "basket-outline",
};
const salary: Category = {
  id: "salary",
  name: "Salary",
  type: "income",
  color: "#111",
  icon: "cash-outline",
};

function fixture(overrides: Partial<BudgetData> = {}): BudgetData {
  return {
    version: 1,
    currency: "ETB",
    demo: false,
    categories: [food, salary],
    transactions: [],
    budgets: [],
    accounts: [
      {
        id: "main-wallet",
        name: "Main wallet",
        type: "cash",
        openingBalance: 0,
        color: "#708B56",
      },
    ],
    loans: [],
    goals: [],
    preferences: { theme: "light", accent: "#38543F", compact: false },
    ...overrides,
  };
}

describe("Ethiopian calendar", () => {
  it("matches supplied conversion anchors", () => {
    expect(ethToISO({ year: 2019, month: 1, day: 1 })).toBe("2026-09-11");
    expect(ethToISO({ year: 2015, month: 13, day: 6 })).toBe("2023-09-11");
    expect(ethToISO({ year: 2016, month: 1, day: 1 })).toBe("2023-09-12");
    expect(isoToEth("2026-09-11")).toEqual({ year: 2019, month: 1, day: 1 });
    expect(formatEthDate("2023-09-12")).toBe("Meskerem 1, 2016");
  });

  it("round-trips all valid dates across multiple complete years", () => {
    for (let year = 2011; year <= 2022; year += 1) {
      for (let month = 1; month <= 13; month += 1) {
        for (let day = 1; day <= daysInMonth(year, month); day += 1) {
          const date = { year, month, day };
          expect(isoToEth(ethToISO(date))).toEqual(date);
        }
      }
    }
  });

  it("validates Pagume and four-year leap boundaries", () => {
    expect(daysInMonth(2015, 13)).toBe(6);
    expect(daysInMonth(2016, 13)).toBe(5);
    expect(isValidEthDate({ year: 2015, month: 13, day: 6 })).toBe(true);
    expect(isValidEthDate({ year: 2016, month: 13, day: 6 })).toBe(false);
    expect(isValidEthDate({ year: 2015, month: 13, day: 7 })).toBe(false);
    expect(() => ethToISO({ year: 2016, month: 13, day: 6 })).toThrow(
      RangeError,
    );
  });

  it("shifts through all 13 months", () => {
    expect(shiftMonth({ year: 2015, month: 12 }, 1)).toEqual({
      year: 2015,
      month: 13,
    });
    expect(shiftMonth({ year: 2015, month: 13 }, 1)).toEqual({
      year: 2016,
      month: 1,
    });
    expect(shiftMonth({ year: 2016, month: 1 }, -1)).toEqual({
      year: 2015,
      month: 13,
    });
    expect(monthKey({ year: 2016, month: 1 })).toBe("2016-01");
  });
});

describe("budget analytics", () => {
  it("summarizes money and only expense categories", () => {
    const data = fixture({
      transactions: [
        {
          id: "i",
          type: "income",
          amount: 1000,
          categoryId: "salary",
          date: "2023-09-12",
          note: "",
        },
        {
          id: "e",
          type: "expense",
          amount: 132,
          categoryId: "food",
          date: "2023-09-12",
          note: "",
        },
      ],
      budgets: [{ month: "2016-01", categoryId: "food", amount: 100 }],
    });
    expect(summarize(data, { year: 2016, month: 1 })).toMatchObject({
      income: 1000,
      expenses: 132,
      budget: 100,
      remaining: -32,
      balance: 868,
    });
    expect(summarize(data, { year: 2016, month: 1 }).categories).toHaveLength(
      1,
    );
    expect(money(1234)).toBe("Br 1,234");
    expect(money(1.235)).toBe("Br 1.24");
  });

  it("reports an accurate 32% over-budget insight and safe month comparisons", () => {
    const data = fixture({
      transactions: [
        {
          id: "previous",
          type: "expense",
          amount: 100,
          categoryId: "food",
          date: ethToISO({ year: 2015, month: 13, day: 1 }),
          note: "",
        },
        {
          id: "current",
          type: "expense",
          amount: 132,
          categoryId: "food",
          date: ethToISO({ year: 2016, month: 1, day: 1 }),
          note: "",
        },
      ],
      budgets: [{ month: "2016-01", categoryId: "food", amount: 100 }],
    });
    const insights = getInsights(data, { year: 2016, month: 1 });
    expect(insights).toContainEqual(
      expect.objectContaining({
        title: "Food is 32% over budget",
        tone: "warning",
      }),
    );
    expect(insights).toContainEqual(
      expect.objectContaining({ title: "Over budget", tone: "warning" }),
    );
    expect(
      insights.find((item) => item.title === "Over budget")?.detail,
    ).toContain("32%");
    expect(insights).toContainEqual(
      expect.objectContaining({ title: "Spending increased" }),
    );
    expect(
      getTrend(data, { year: 2016, month: 1 }, 2).map((point) => point.month),
    ).toEqual([
      { year: 2015, month: 13 },
      { year: 2016, month: 1 },
    ]);
  });
});

describe("CSV", () => {
  it("parses BOMs, quoted delimiters/newlines, escaped quotes, and rejects unclosed quotes", () => {
    expect(
      parseCSV('\ufefftype,note\r\nexpense,"A, multi\nline ""note"""'),
    ).toEqual([
      ["type", "note"],
      ["expense", 'A, multi\nline "note"'],
    ]);
    expect(() => parseCSV('type,note\nexpense,"missing')).toThrow(/unclosed/i);
  });

  it("maps, validates, de-duplicates and imports Ethiopian transaction rows", () => {
    const rows = parseCSV(
      'Type,Amount,Category,Date,Note\nexpense,10.25,Taxi,2016-01-01,"airport, late"\nexpense,10.25,Taxi,2016-01-01,"airport, late"\nincome,-1,Salary,2016-01-01,bad\nexpense,1,Taxi,2016-13-06,bad',
    );
    const preview = previewImport(rows, detectMapping(rows[0]), "ethiopian", [
      food,
      salary,
    ]);
    expect(preview.errors).toHaveLength(2);
    expect(preview.duplicates).toBe(1);
    expect(preview.transactions).toHaveLength(1);
    expect(preview.transactions[0]).toMatchObject({
      type: "expense",
      amount: 10.25,
      date: "2023-09-12",
      note: "airport, late",
    });
    expect(
      preview.categories.find(
        (category) => category.name === "Taxi" && category.type === "expense",
      ),
    ).toBeTruthy();
  });

  it("round-trips transaction and budget export formats without mutating source data", () => {
    const data = fixture({
      transactions: [
        {
          id: "=id",
          type: "expense",
          amount: 12.5,
          categoryId: "food",
          date: "2023-09-12",
          note: "=SUM(1,1)",
        },
      ],
      budgets: [{ month: "2016-01", categoryId: "food", amount: 200 }],
    });
    const transactionCSV = exportTransactions(data);
    const transactionRows = parseCSV(transactionCSV);
    expect(transactionRows[0]).toEqual([
      "id",
      "type",
      "amount",
      "category",
      "date",
      "ethiopian_date",
      "note",
    ]);
    expect(transactionRows[1][0]).toBe("'=id");
    expect(transactionRows[1][6]).toBe("'=SUM(1,1)");
    const imported = previewImport(
      transactionRows,
      detectMapping(transactionRows[0]),
      "gregorian",
      data.categories,
    );
    expect(imported.transactions[0]).toMatchObject({
      amount: 12.5,
      date: "2023-09-12",
      categoryId: "food",
      note: "=SUM(1,1)",
    });

    const budgetCSV = exportBudgets(data);
    const budgetRows = parseCSV(budgetCSV);
    expect(budgetRows[0]).toEqual([
      "month",
      "calendar",
      "category",
      "amount",
      "currency",
    ]);
    const budgets = previewBudgetImport(budgetRows, data.categories);
    expect(budgets.errors).toEqual([]);
    expect(budgets.budgets).toEqual([
      { month: "2016-01", categoryId: "food", amount: 200 },
    ]);
  });
  it("preserves zero budgets and prevents duplicate monthly budgets", () => {
    const rows = parseCSV(
      "month,calendar,category,amount,currency\n2016-01,ethiopian,Food,0,ETB\n2016-01,ethiopian,Food,200,ETB",
    );
    const result = previewBudgetImport(rows, [food]);
    expect(result.budgets).toEqual([
      { month: "2016-01", categoryId: "food", amount: 0 },
    ]);
    expect(result.errors).toHaveLength(1);
  });
  it("rejects sub-cent and non-decimal transaction amounts", () => {
    const rows = parseCSV(
      "type,amount,category,date\nexpense,0.001,Food,2016-01-01\nexpense,0x10,Food,2016-01-01",
    );
    const result = previewImport(rows, detectMapping(rows[0]), "ethiopian", [
      food,
    ]);
    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toHaveLength(2);
  });
});
