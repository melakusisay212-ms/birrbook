import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BudgetData,
  DEFAULT_ACCOUNT,
  DEFAULT_CATEGORIES,
  Month,
  PALETTE,
  Preferences,
} from "./types";
import { ethToISO, monthKey, shiftMonth, todayEth } from "./calendar";
const KEY = "birrbook.local.v2";
const LEGACY_KEY = "birrbook.local.v1";
const DEFAULT_PREFERENCES: Preferences = {
  theme: "light",
  accent: "#38543F",
  compact: false,
};
export function emptyData(): BudgetData {
  return {
    version: 2,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    budgets: [],
    accounts: [{ ...DEFAULT_ACCOUNT }],
    loans: [],
    goals: [],
    currency: "ETB",
    demo: false,
    preferences: { ...DEFAULT_PREFERENCES },
  };
}
export function sampleData(): BudgetData {
  const data = emptyData();
  data.demo = true;
  const now = todayEth();
  const samples = [
    ["salary", 32000, 1, "Monthly salary"],
    ["freelance", 4500, 4, "Design project"],
    ["home", 8500, 2, "Rent & electricity"],
    ["groceries", 2450, 5, "Weekly groceries"],
    ["groceries", 1350, 10, "Market run"],
    ["dining", 1380, 6, "Dinner with friends"],
    ["dining", 780, 9, "Coffee & lunch"],
    ["dining", 1140, 12, "Weekend dinner"],
    ["transport", 850, 7, "Ride & fuel"],
    ["shopping", 1800, 11, "A few essentials"],
    ["health", 650, 13, "Pharmacy"],
    ["groceries", 1600, 14, "Pantry top-up"],
  ] as const;
  for (let offset = -5; offset <= 0; offset++) {
    const month = shiftMonth(now, offset);
    for (const [index, sample] of samples.entries()) {
      const [categoryId, base, day, note] = sample;
      const cat = data.categories.find((c) => c.id === categoryId)!;
      data.transactions.push({
        id: `sample-${offset}-${index}`,
        categoryId,
        type: cat.type,
        amount: offset === 0 ? base : Math.round(base * (1 + offset * 0.045)),
        date: ethToISO({
          ...month,
          day: month.month === 13 ? Math.min(day, 5) : day,
        }),
        note,
        accountId: DEFAULT_ACCOUNT.id,
      });
    }
    const budgets: Record<string, number> = {
      groceries: 6500,
      dining: 2500,
      transport: 2000,
      home: 9000,
      shopping: 3000,
      health: 1500,
      other: 1000,
    };
    Object.entries(budgets).forEach(([categoryId, amount]) =>
      data.budgets.push({ month: monthKey(month), categoryId, amount }),
    );
  }
  data.accounts[0].openingBalance = 12000;
  data.goals.push({
    id: "sample-goal",
    name: "Emergency cushion",
    target: 50000,
    saved: 12000,
    color: "#C5AB63",
    note: "A little peace of mind",
  });
  return data;
}
function migrate(value: unknown): BudgetData | null {
  if (!value || typeof value !== "object") return null;
  const v = value as any;
  if (
    v.version === 2 &&
    Array.isArray(v.accounts) &&
    Array.isArray(v.loans) &&
    Array.isArray(v.goals) &&
    v.preferences
  )
    return v as BudgetData;
  if (
    v.version === 1 &&
    Array.isArray(v.categories) &&
    Array.isArray(v.transactions)
  )
    return {
      version: 2,
      categories: v.categories,
      transactions: v.transactions.map((t: any) => ({
        ...t,
        accountId: DEFAULT_ACCOUNT.id,
      })),
      budgets: Array.isArray(v.budgets) ? v.budgets : [],
      accounts: [{ ...DEFAULT_ACCOUNT }],
      loans: [],
      goals: [],
      currency: typeof v.currency === "string" ? v.currency : "ETB",
      demo: Boolean(v.demo),
      preferences: { ...DEFAULT_PREFERENCES },
    };
  return null;
}
function validData(value: unknown): value is BudgetData {
  const v = value as BudgetData;
  return Boolean(
    v &&
    v.version === 2 &&
    typeof v.demo === "boolean" &&
    typeof v.currency === "string" &&
    Array.isArray(v.categories) &&
    Array.isArray(v.transactions) &&
    Array.isArray(v.budgets) &&
    Array.isArray(v.accounts) &&
    Array.isArray(v.loans) &&
    Array.isArray(v.goals) &&
    v.preferences &&
    ["light", "dark", "system"].includes(v.preferences.theme) &&
    typeof v.preferences.accent === "string" &&
    v.accounts.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.name === "string" &&
        Number.isFinite(a.openingBalance),
    ) &&
    v.transactions.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        ["income", "expense"].includes(t.type) &&
        Number.isFinite(t.amount) &&
        t.amount > 0 &&
        typeof t.categoryId === "string" &&
        typeof t.date === "string",
    ),
  );
}
type Context = {
  data: BudgetData;
  update: (fn: (d: BudgetData) => BudgetData) => void;
  month: Month;
  setMonth: (m: Month) => void;
  ready: boolean;
  storageError: string;
  clearError: () => void;
};
const BudgetContext = createContext<Context | null>(null);
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BudgetData>(emptyData);
  const [month, setMonth] = useState<Month>(todayEth);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [canSave, setCanSave] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(LEGACY_KEY)])
      .then(([raw, legacyRaw]) => {
        if (!active) return;
        const source = raw ?? legacyRaw;
        if (!source) {
          setData(sampleData());
          setCanSave(true);
        } else {
          const parsed = migrate(JSON.parse(source));
          if (!parsed || !validData(parsed))
            throw new Error(
              "Your saved data could not be read. It has not been overwritten.",
            );
          setData(parsed);
          setCanSave(true);
        }
      })
      .catch((e) => {
        if (active)
          setStorageError(
            e instanceof Error
              ? e.message
              : "Local storage is unavailable. Changes may not survive closing this app.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !canSave) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() =>
      setStorageError(
        "Your latest changes could not be saved locally. Export a CSV backup before closing.",
      ),
    );
  }, [data, ready, canSave]);
  return (
    <BudgetContext.Provider
      value={{
        data,
        update: (fn) => setData((d) => fn(d)),
        month,
        setMonth,
        ready,
        storageError,
        clearError: () => setStorageError(""),
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}
export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error("BudgetProvider missing");
  return context;
}
export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
