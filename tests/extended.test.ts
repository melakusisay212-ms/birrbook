import { describe, expect, it } from "vitest";
import {
  accountBalance,
  goalProgress,
  loanProgress,
} from "../lib/budget/extended";
import { BudgetData } from "../lib/budget/types";
const data = {
  version: 2,
  categories: [],
  budgets: [],
  accounts: [
    {
      id: "cash",
      name: "Cash",
      type: "cash",
      openingBalance: 1000,
      color: "#000",
    },
  ],
  loans: [],
  goals: [],
  currency: "ETB",
  demo: false,
  preferences: { theme: "light", accent: "#38543F", compact: false },
  transactions: [
    {
      id: "1",
      type: "income",
      amount: 500,
      categoryId: "x",
      date: "2026-09-11",
      note: "",
      accountId: "cash",
    },
    {
      id: "2",
      type: "expense",
      amount: 125,
      categoryId: "x",
      date: "2026-09-11",
      note: "",
      accountId: "cash",
    },
  ],
} as BudgetData;
describe("extended budget tools", () => {
  it("calculates separate account balances", () =>
    expect(accountBalance(data, data.accounts[0])).toBe(1375));
  it("caps goal progress at 100%", () =>
    expect(
      goalProgress({
        id: "g",
        name: "",
        target: 100,
        saved: 150,
        color: "#000",
      }),
    ).toBe(100));
  it("calculates loan repayment progress", () =>
    expect(
      loanProgress({
        id: "l",
        name: "",
        kind: "borrowed",
        principal: 1000,
        remaining: 400,
        createdDate: "2026-09-11",
      }),
    ).toBe(60));
});
