import { ethToISO, isoToEth, isValidEthDate, monthKey } from "./calendar";
import { PALETTE } from "./types";
import type {
  Budget,
  BudgetData,
  Category,
  EntryType,
  EthDate,
  Month,
  Transaction,
} from "./types";

export type ImportPreview = {
  transactions: Transaction[];
  categories: Category[];
  errors: Array<{ row: number; message: string }>;
  duplicates: number;
};

export type BudgetImportPreview = {
  budgets: Budget[];
  categories: Category[];
  errors: Array<{ row: number; message: string }>;
};

/** Parses a BOM-prefixed or ordinary RFC 4180-style CSV string. */
export function parseCSV(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (source.length === 0) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
    afterQuote = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else if (character === "\r" && source[index + 1] === "\n") {
        field += "\n";
        index += 1;
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote) {
      if (character === ",") {
        row.push(field);
        field = "";
        afterQuote = false;
      } else if (character === "\n" || character === "\r") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        endRow();
      } else {
        throw new Error(
          `Malformed CSV: unexpected character after closing quote at column ${index + 1}`,
        );
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) {
        throw new Error(
          `Malformed CSV: quote inside an unquoted field at column ${index + 1}`,
        );
      }
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      endRow();
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Malformed CSV: unclosed quoted field");
  if (
    afterQuote ||
    row.length > 0 ||
    field.length > 0 ||
    source.endsWith(",")
  ) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizedHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

/** Guesses a canonical transaction field mapping, preserving the supplied header text. */
export function detectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const aliases: Record<string, string[]> = {
    type: ["type", "transaction type", "entry type", "kind"],
    amount: ["amount", "value", "total", "sum"],
    category: ["category", "category name", "cat"],
    date: ["date", "transaction date", "ethiopian date", "gregorian date"],
    note: ["note", "notes", "memo", "description", "details"],
  };
  for (const [field, names] of Object.entries(aliases)) {
    const header = headers.find((candidate) =>
      names.includes(normalizedHeader(candidate)),
    );
    if (header !== undefined) mapping[field] = header;
  }
  return mapping;
}

function headerIndexes(
  headers: string[],
  mapping: Record<string, string>,
): Record<string, number> {
  const indexes: Record<string, number> = {};
  for (const [field, header] of Object.entries(mapping)) {
    const index = headers.indexOf(header);
    if (index >= 0) indexes[field] = index;
  }
  return indexes;
}

function displayField(field: string): string {
  return field === "type" ? "type" : field;
}

function missingTransactionColumns(indexes: Record<string, number>): string[] {
  return ["type", "amount", "category", "date"].filter(
    (field) => indexes[field] === undefined,
  );
}

function cleanCategoryName(value: string): string {
  return value.trim();
}

function categoryIdentity(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function idStem(name: string): string {
  const stem = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || "category";
}

function uniqueCategoryId(
  categories: Category[],
  name: string,
  type: EntryType,
): string {
  const used = new Set(categories.map((category) => category.id));
  const base = idStem(name);
  if (!used.has(base)) return base;
  const typed = `${base}-${type}`;
  if (!used.has(typed)) return typed;
  let sequence = 2;
  while (used.has(`${typed}-${sequence}`)) sequence += 1;
  return `${typed}-${sequence}`;
}

function addCategory(
  categories: Category[],
  name: string,
  type: EntryType,
): Category {
  const category: Category = {
    id: uniqueCategoryId(categories, name, type),
    name,
    type,
    color: PALETTE[categories.length % PALETTE.length],
    icon: type === "income" ? "cash-outline" : "ellipsis-horizontal",
  };
  categories.push(category);
  return category;
}

function categoryFor(
  categories: Category[],
  rawName: string,
  type: EntryType,
): Category {
  const name = cleanCategoryName(rawName);
  const identity = categoryIdentity(name);
  const existing = categories.find(
    (category) =>
      category.type === type &&
      (categoryIdentity(category.name) === identity ||
        categoryIdentity(category.id) === identity),
  );
  return existing ?? addCategory(categories, name, type);
}

function parseAmount(value: string, allowZero = false): number | null {
  const text = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text.replace(/,/g, ""));
  if (
    !Number.isFinite(amount) ||
    amount > 1e12 ||
    (allowZero ? amount < 0 : amount <= 0)
  )
    return null;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function parseEntryType(value: string): EntryType | null {
  const type = value.trim().toLowerCase();
  return type === "income" || type === "expense" ? type : null;
}

function validGregorianDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const lengths = [
    31,
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= lengths[month - 1];
}

function parseEthiopianDate(value: string): EthDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidEthDate(date) ? date : null;
}

function importedDate(
  value: string,
  calendar: "ethiopian" | "gregorian",
): string | null {
  const trimmed = value.trim();
  if (calendar === "gregorian")
    return validGregorianDate(trimmed) ? trimmed : null;
  const date = parseEthiopianDate(trimmed);
  return date ? ethToISO(date) : null;
}

function transactionId(row: number, sequence: number): string {
  return `import-${Date.now().toString(36)}-${row}-${sequence}`;
}

/**
 * Validates transaction CSV rows without mutating persisted data. `rows` must
 * include its header row, and the mapping values are the exact header labels.
 */
export function previewImport(
  rows: string[][],
  mapping: Record<string, string>,
  calendar: "ethiopian" | "gregorian",
  categories: Category[],
): ImportPreview {
  const transactions: Transaction[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const workingCategories = [...categories];
  if (rows.length === 0)
    return {
      transactions,
      categories: workingCategories,
      errors,
      duplicates: 0,
    };

  const indexes = headerIndexes(rows[0], mapping);
  const missing = missingTransactionColumns(indexes);
  if (missing.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.map(displayField).join(", ")}`,
    });
    return {
      transactions,
      categories: workingCategories,
      errors,
      duplicates: 0,
    };
  }

  const seen = new Set<string>();
  let duplicates = 0;
  let sequence = 0;
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    // Ignore a completely blank trailing/spreadsheet row rather than creating
    // an opaque validation failure for it.
    if (row.every((cell) => cell.trim() === "")) continue;
    const rowNumber = rowIndex + 1;
    const value = (field: string): string => {
      const index = indexes[field];
      return index === undefined ? "" : (row[index] ?? "");
    };
    const type = parseEntryType(value("type"));
    if (!type) {
      errors.push({
        row: rowNumber,
        message: "Type must be income or expense",
      });
      continue;
    }
    const amount = parseAmount(value("amount"));
    if (amount === null) {
      errors.push({
        row: rowNumber,
        message: "Amount must be a positive number",
      });
      continue;
    }
    const ownExport =
      rows[0].includes("id") && rows[0].includes("ethiopian_date");
    const categoryName = cleanCategoryName(
      ownExport ? restoreSafeText(value("category")) : value("category"),
    );
    if (!categoryName) {
      errors.push({ row: rowNumber, message: "Category is required" });
      continue;
    }
    const date = importedDate(value("date"), calendar);
    if (!date) {
      errors.push({
        row: rowNumber,
        message: `Date must be a valid ${calendar} YYYY-MM-DD date`,
      });
      continue;
    }
    const note = ownExport ? restoreSafeText(value("note")) : value("note");
    const category = categoryFor(workingCategories, categoryName, type);
    const duplicateKey = [
      type,
      amount.toFixed(2),
      category.id,
      date,
      note,
    ].join("\u001f");
    if (seen.has(duplicateKey)) {
      duplicates += 1;
      continue;
    }
    seen.add(duplicateKey);
    sequence += 1;
    transactions.push({
      id: transactionId(rowNumber, sequence),
      type,
      amount,
      categoryId: category.id,
      date,
      note,
    });
  }
  return { transactions, categories: workingCategories, errors, duplicates };
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Prefixes formula-like text so spreadsheet applications do not evaluate it. */
function safeText(value: string): string {
  return /^[=+\-@'\t\r\n]/.test(value) ? `'${value}` : value;
}

function restoreSafeText(value: string): string {
  return value.startsWith("'") && /^[=+\-@'\t\r\n]/.test(value.slice(1))
    ? value.slice(1)
    : value;
}

function amountText(amount: number): string {
  return String(Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100);
}

function ethiopianDateText(iso: string): string {
  const date = isoToEth(iso);
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/** Exports transactions with both Gregorian and Ethiopian date columns. */
export function exportTransactions(data: BudgetData): string {
  const rows: Array<Array<string | number>> = [
    ["id", "type", "amount", "category", "date", "ethiopian_date", "note"],
  ];
  for (const transaction of data.transactions) {
    const category = data.categories.find(
      (item) => item.id === transaction.categoryId,
    );
    rows.push([
      safeText(transaction.id),
      safeText(transaction.type),
      amountText(transaction.amount),
      safeText(category?.name ?? transaction.categoryId),
      safeText(transaction.date),
      safeText(ethiopianDateText(transaction.date)),
      safeText(transaction.note),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Exports Ethiopian-month budget rows without making any changes to saved data. */
export function exportBudgets(data: BudgetData): string {
  const rows: Array<Array<string | number>> = [
    ["month", "calendar", "category", "amount", "currency"],
  ];
  for (const budget of data.budgets) {
    const category = data.categories.find(
      (item) => item.id === budget.categoryId,
    );
    rows.push([
      safeText(budget.month),
      "ethiopian",
      safeText(category?.name ?? budget.categoryId),
      amountText(budget.amount),
      safeText(data.currency),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function monthFromKey(value: string): Month | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const month = { year: Number(match[1]), month: Number(match[2]) };
  try {
    return monthKey(month) ? month : null;
  } catch {
    return null;
  }
}

/**
 * Previews the exported budget CSV shape. It does not receive or change saved
 * budgets, so same-month replacement/merge remains an explicit UI decision.
 */
export function previewBudgetImport(
  rows: string[][],
  categories: Category[],
): BudgetImportPreview {
  const budgets: Budget[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  const workingCategories = [...categories];
  if (rows.length === 0)
    return { budgets, categories: workingCategories, errors };

  const indexes = headerIndexes(rows[0], {
    month: "month",
    calendar: "calendar",
    category: "category",
    amount: "amount",
    currency: "currency",
  });
  const required = ["month", "calendar", "category", "amount", "currency"];
  const missing = required.filter((field) => indexes[field] === undefined);
  if (missing.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
    });
    return { budgets, categories: workingCategories, errors };
  }

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (row.every((cell) => cell.trim() === "")) continue;
    const rowNumber = rowIndex + 1;
    const value = (field: string): string => row[indexes[field]] ?? "";
    const month = monthFromKey(value("month"));
    if (!month) {
      errors.push({
        row: rowNumber,
        message: "Month must be a valid Ethiopian YYYY-MM month",
      });
      continue;
    }
    if (value("calendar").trim().toLowerCase() !== "ethiopian") {
      errors.push({ row: rowNumber, message: "Calendar must be ethiopian" });
      continue;
    }
    const categoryName = cleanCategoryName(restoreSafeText(value("category")));
    if (!categoryName) {
      errors.push({ row: rowNumber, message: "Category is required" });
      continue;
    }
    const amount = parseAmount(value("amount"), true);
    if (amount === null) {
      errors.push({
        row: rowNumber,
        message:
          "Budget must be zero or a positive amount with up to two decimal places",
      });
      continue;
    }
    if (!value("currency").trim()) {
      errors.push({ row: rowNumber, message: "Currency is required" });
      continue;
    }
    const category = categoryFor(workingCategories, categoryName, "expense");
    const key = monthKey(month);
    const existing = budgets.findIndex(
      (b) => b.month === key && b.categoryId === category.id,
    );
    if (existing >= 0) {
      errors.push({
        row: rowNumber,
        message: "Duplicate category budget for this month; first row retained",
      });
      continue;
    }
    budgets.push({ month: key, categoryId: category.id, amount });
  }
  return { budgets, categories: workingCategories, errors };
}
