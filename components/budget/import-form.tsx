import React, { useMemo, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Button, C, Choice, Field, S, Sheet } from "./ui";
import { useBudget } from "@/lib/budget/store";
import {
  detectMapping,
  parseCSV,
  previewBudgetImport,
  previewImport,
} from "@/lib/budget/csv";
import { pickCSV } from "@/lib/budget/io";
import { Budget, Category, Transaction } from "@/lib/budget/types";
export function ImportForm({
  visible,
  onClose,
  onImported,
}: {
  visible: boolean;
  onClose: () => void;
  onImported: (s: string) => void;
}) {
  const { data, update } = useBudget();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<"transactions" | "budgets">("transactions");
  const [calendar, setCalendar] = useState<"ethiopian" | "gregorian">(
    "ethiopian",
  );
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    transactions?: Transaction[];
    budgets?: Budget[];
    categories: Category[];
    errors: { row: number; message: string }[];
    duplicates?: number;
  } | null>(null);
  const start = (value: string) => {
    try {
      const parsed = parseCSV(value);
      if (parsed.length < 2)
        throw new Error("Include a header row and at least one data row.");
      if (parsed.length > 10001)
        throw new Error("Import up to 10,000 rows at a time.");
      if (new Set(parsed[0]).size !== parsed[0].length)
        throw new Error("Column headers must be unique.");
      setRows(parsed);
      const guessed = detectMapping(parsed[0]);
      if (parsed[0].includes("ethiopian_date")) {
        guessed.date = "ethiopian_date";
        setCalendar("ethiopian");
      }
      setMapping(guessed);
      setStage(1);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse CSV.");
    }
  };
  const loadFile = async () => {
    try {
      const value = await pickCSV();
      if (value !== null) {
        setText(value);
        start(value);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open file.");
    }
  };
  const validate = () => {
    try {
      if (mode === "transactions") {
        for (const field of ["type", "amount", "category", "date"])
          if (!mapping[field])
            throw new Error(`Map the ${field} column first.`);
      }
      const result =
        mode === "transactions"
          ? previewImport(rows, mapping, calendar, data.categories)
          : previewBudgetImport(rows, data.categories);
      setPreview(result);
      setStage(2);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed.");
    }
  };
  const existing = useMemo(
    () =>
      new Set(
        data.transactions.map(
          (t) => `${t.type}|${t.amount}|${t.categoryId}|${t.date}|${t.note}`,
        ),
      ),
    [data.transactions],
  );
  const validTransactions = (preview?.transactions ?? []).filter(
    (t) =>
      !existing.has(
        `${t.type}|${t.amount}|${t.categoryId}|${t.date}|${t.note}`,
      ),
  );
  const duplicateCount =
    (preview?.duplicates ?? 0) +
    (preview?.transactions?.length ?? 0) -
    validTransactions.length;
  const count =
    mode === "transactions"
      ? validTransactions.length
      : (preview?.budgets?.length ?? 0);
  const commit = () => {
    if (!preview || !count) return;
    update((d) => {
      const used = new Set(
        mode === "transactions"
          ? validTransactions.map((t) => t.categoryId)
          : (preview.budgets ?? []).map((b) => b.categoryId),
      );
      const categories = [
        ...d.categories,
        ...preview.categories.filter(
          (c) => !d.categories.some((old) => old.id === c.id) && used.has(c.id),
        ),
      ];
      if (mode === "transactions")
        return {
          ...d,
          categories,
          transactions: [...d.transactions, ...validTransactions],
        };
      const budgets = preview.budgets ?? [];
      return {
        ...d,
        categories,
        budgets: [
          ...d.budgets.filter(
            (b) =>
              !budgets.some(
                (n) => n.month === b.month && n.categoryId === b.categoryId,
              ),
          ),
          ...budgets,
        ],
      };
    });
    onImported(
      `Imported ${count} ${mode === "transactions" ? "transactions" : "budgets"}. ${preview.errors.length ? `${preview.errors.length} invalid rows were skipped.` : ""}`,
    );
    close();
  };
  const close = () => {
    setStage(0);
    setText("");
    setRows([]);
    setPreview(null);
    setError("");
    onClose();
  };
  return (
    <Sheet visible={visible} title="Bring your numbers along" onClose={close}>
      {stage === 0 && (
        <>
          <Text style={S.text}>
            Import a CSV file or paste its contents. Everything is read and
            validated on your device.
          </Text>
          <View style={[S.row, { gap: 8 }]}>
            <Choice
              selected={mode === "transactions"}
              onPress={() => setMode("transactions")}
            >
              Transactions
            </Choice>
            <Choice
              selected={mode === "budgets"}
              onPress={() => setMode("budgets")}
            >
              Category budgets
            </Choice>
          </View>
          <Button icon="document-outline" secondary onPress={loadFile}>
            Choose a CSV file
          </Button>
          <Field
            label="OR PASTE CSV TEXT"
            value={text}
            onChange={setText}
            multiline
            placeholder={
              mode === "transactions"
                ? "type,amount,category,date,note\nexpense,120,Dining,2019-02-05,Lunch"
                : "month,calendar,category,amount,currency\n2019-02,ethiopian,Dining,2500,ETB"
            }
          />
          <Text style={{ color: C.muted, fontSize: 11, lineHeight: 19 }}>
            {mode === "transactions"
              ? "Required: type (income/expense), positive amount, category, and date (YYYY-MM-DD). Note is optional. Choose Ethiopian or Gregorian dates in the next step."
              : `Use the app’s exported budget format. Months are Ethiopian YYYY-MM. Amounts are interpreted in your current ${data.currency} currency; no conversion is performed.`}
          </Text>
          <Button disabled={!text.trim()} onPress={() => start(text)}>
            Continue to field mapping
          </Button>
        </>
      )}
      {stage === 1 && (
        <>
          <Text style={S.text}>
            {rows.length - 1} rows found.{" "}
            {mode === "transactions"
              ? "Match each field to a column."
              : "Budget files use the exported month,calendar,category,amount,currency headers."}
          </Text>
          {mode === "transactions" && (
            <>
              <View style={{ gap: 10 }}>
                <Text style={S.label}>DATE CALENDAR</Text>
                <View style={[S.row, { gap: 8 }]}>
                  <Choice
                    selected={calendar === "ethiopian"}
                    onPress={() => setCalendar("ethiopian")}
                  >
                    Ethiopian E.C.
                  </Choice>
                  <Choice
                    selected={calendar === "gregorian"}
                    onPress={() => setCalendar("gregorian")}
                  >
                    Gregorian G.C.
                  </Choice>
                </View>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  When importing this app’s export, map “ethiopian_date” for
                  E.C. or “date” for G.C.
                </Text>
              </View>
              {["type", "amount", "category", "date", "note"].map((field) => (
                <View key={field} style={{ gap: 9 }}>
                  <Text style={S.label}>
                    {field.toUpperCase()}
                    {field === "note" ? " (OPTIONAL)" : ""}
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {field === "note" && (
                      <Choice
                        selected={!mapping.note}
                        onPress={() => setMapping((m) => ({ ...m, note: "" }))}
                      >
                        Skip
                      </Choice>
                    )}
                    {rows[0].map((header) => (
                      <Choice
                        key={header}
                        selected={mapping[field] === header}
                        onPress={() =>
                          setMapping((m) => ({ ...m, [field]: header }))
                        }
                      >
                        {header}
                      </Choice>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
          <Button onPress={validate}>Validate & preview</Button>
          <Button secondary onPress={() => setStage(0)}>
            Back to CSV
          </Button>
        </>
      )}
      {stage === 2 && preview && (
        <>
          <View
            style={{
              padding: 18,
              backgroundColor: C.pale,
              borderRadius: 13,
              gap: 8,
            }}
          >
            <Text style={S.title}>{count} ready to import</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {preview.errors.length} invalid rows · {duplicateCount} duplicate
              transactions skipped
            </Text>
          </View>
          {mode === "transactions"
            ? validTransactions.slice(0, 4).map((t) => (
                <Text key={t.id} style={{ color: C.ink, fontSize: 12 }}>
                  {t.date} G.C. · {t.type} · {t.amount} ·{" "}
                  {t.note ||
                    preview.categories.find((c) => c.id === t.categoryId)
                      ?.name ||
                    data.categories.find((c) => c.id === t.categoryId)?.name}
                </Text>
              ))
            : preview.budgets?.slice(0, 4).map((b, i) => (
                <Text key={i} style={{ color: C.ink, fontSize: 12 }}>
                  {b.month} E.C. · {b.amount} {data.currency} ·{" "}
                  {preview.categories.find((c) => c.id === b.categoryId)
                    ?.name ||
                    data.categories.find((c) => c.id === b.categoryId)?.name}
                </Text>
              ))}
          {preview.errors.length > 0 && (
            <View style={{ gap: 7 }}>
              <Text style={{ color: C.red, fontSize: 12, fontWeight: "600" }}>
                These rows will not be imported:
              </Text>
              {preview.errors.slice(0, 12).map((e, i) => (
                <Text
                  key={i}
                  style={{ color: C.red, fontSize: 11, lineHeight: 18 }}
                >
                  Row {e.row}: {e.message}
                </Text>
              ))}
              {preview.errors.length > 12 && (
                <Text style={{ color: C.red, fontSize: 11 }}>
                  and {preview.errors.length - 12} more invalid rows
                </Text>
              )}
            </View>
          )}
          <Text style={{ color: C.muted, fontSize: 12, lineHeight: 20 }}>
            {mode === "budgets"
              ? "Importing replaces matching monthly category budgets. Transactions will not change."
              : "New categories will be created as needed. Exact duplicate entries are skipped; existing transactions are not changed."}
          </Text>
          <Button disabled={count === 0} onPress={commit}>
            Import {count} valid{" "}
            {mode === "transactions" ? "entries" : "budgets"}
          </Button>
          <Button secondary onPress={() => setStage(1)}>
            Back to mapping
          </Button>
        </>
      )}
      {error !== "" && (
        <Text accessibilityRole="alert" style={{ color: C.red, fontSize: 13 }}>
          {error}
        </Text>
      )}
    </Sheet>
  );
}
