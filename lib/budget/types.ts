export type EntryType = "income" | "expense";
export type EthDate = { year: number; month: number; day: number };
export type Month = { year: number; month: number };
export type Category = {
  id: string;
  name: string;
  type: EntryType;
  color: string;
  icon: string;
};
export type AccountType = "cash" | "bank" | "mobile" | "card" | "other";
export type Account = {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  archived?: boolean;
};
export type Transaction = {
  id: string;
  type: EntryType;
  amount: number;
  categoryId: string;
  date: string;
  note: string;
  accountId?: string;
};
export type Budget = { month: string; categoryId: string; amount: number };
export type LoanKind = "borrowed" | "lent";
export type Loan = {
  id: string;
  name: string;
  kind: LoanKind;
  principal: number;
  remaining: number;
  dueDate?: string;
  contact?: string;
  note?: string;
  createdDate: string;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  color: string;
  deadline?: string;
  note?: string;
};
export type ThemeMode = "light" | "dark" | "system";
export type Preferences = {
  theme: ThemeMode;
  accent: string;
  compact: boolean;
};
export type BudgetData = {
  version: 1 | 2;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  accounts: Account[];
  loans: Loan[];
  goals: Goal[];
  currency: string;
  demo: boolean;
  preferences: Preferences;
};
export const PALETTE = [
  "#708B56",
  "#DE965B",
  "#8E9DC1",
  "#C5AB63",
  "#A58BB3",
  "#79A6A3",
  "#CF817E",
  "#9D9B8D",
];
export const ACCENTS = [
  { id: "forest", name: "Forest", color: "#38543F" },
  { id: "terracotta", name: "Terracotta", color: "#B7654A" },
  { id: "indigo", name: "Indigo", color: "#4C5F8C" },
  { id: "honey", name: "Honey", color: "#9A751D" },
  { id: "plum", name: "Plum", color: "#765274" },
];
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "groceries",
    name: "Groceries",
    type: "expense",
    color: PALETTE[0],
    icon: "basket-outline",
  },
  {
    id: "dining",
    name: "Dining",
    type: "expense",
    color: PALETTE[1],
    icon: "restaurant-outline",
  },
  {
    id: "transport",
    name: "Transport",
    type: "expense",
    color: PALETTE[2],
    icon: "bus-outline",
  },
  {
    id: "home",
    name: "Home & bills",
    type: "expense",
    color: PALETTE[3],
    icon: "home-outline",
  },
  {
    id: "shopping",
    name: "Shopping",
    type: "expense",
    color: PALETTE[4],
    icon: "bag-outline",
  },
  {
    id: "health",
    name: "Health",
    type: "expense",
    color: PALETTE[5],
    icon: "heart-outline",
  },
  {
    id: "other",
    name: "Other",
    type: "expense",
    color: PALETTE[7],
    icon: "ellipsis-horizontal",
  },
  {
    id: "salary",
    name: "Salary",
    type: "income",
    color: PALETTE[0],
    icon: "briefcase-outline",
  },
  {
    id: "freelance",
    name: "Freelance",
    type: "income",
    color: PALETTE[5],
    icon: "laptop-outline",
  },
  {
    id: "other-income",
    name: "Other income",
    type: "income",
    color: PALETTE[3],
    icon: "cash-outline",
  },
];
export const DEFAULT_ACCOUNT: Account = {
  id: "main-wallet",
  name: "Main wallet",
  type: "cash",
  openingBalance: 0,
  color: "#708B56",
};
