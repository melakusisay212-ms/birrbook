import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { C, S, Button, Choice, Confirm, Field, Icon, Sheet } from "./ui";
import { useBudget, newId } from "@/lib/budget/store";
import { EntryType, Transaction } from "@/lib/budget/types";
import {
  daysInMonth,
  ethToISO,
  isValidEthDate,
  isoToEth,
  MONTH_AMHARIC,
  MONTH_NAMES,
  todayEth,
} from "@/lib/budget/calendar";
export function EntryForm({
  visible,
  entry,
  onClose,
  initialDate,
}: {
  visible: boolean;
  entry?: Transaction;
  onClose: () => void;
  initialDate?: { year: number; month: number; day: number };
}) {
  const { data, month, update } = useBudget();
  const [type, setType] = useState<EntryType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("groceries");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState("");
  const [year, setYear] = useState("");
  const [m, setM] = useState(1);
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const today = todayEth();
    const d = entry
      ? isoToEth(entry.date)
      : (initialDate ?? {
          ...month,
          day:
            today.year === month.year && today.month === month.month
              ? today.day
              : 1,
        });
    setYear(String(d.year));
    setM(d.month);
    setDay(String(d.day));
    setType(entry?.type ?? "expense");
    setAmount(entry ? String(entry.amount) : "");
    setCategory(
      entry?.categoryId ??
        data.categories.find((c) => c.type === "expense")?.id ??
        "",
    );
    setNote(entry?.note ?? "");
    setAccount(
      entry?.accountId ??
        data.accounts.find((a) => !a.archived)?.id ??
        data.accounts[0]?.id ??
        "",
    );
    setError("");
  }, [visible, entry, initialDate, data.accounts]);
  const cats = data.categories.filter((c) => c.type === type);
  const changeType = (t: EntryType) => {
    setType(t);
    setCategory(data.categories.find((c) => c.type === t)?.id ?? "");
  };
  const save = () => {
    const value = Number(amount.trim().replace(/,/g, ""));
    const date = { year: Number(year), month: m, day: Number(day) };
    if (!amount.trim() || !Number.isFinite(value) || value <= 0 || value > 1e12)
      return setError("Enter an amount greater than zero (up to 1 trillion).");
    if (Math.abs(value * 100 - Math.round(value * 100)) > 0.0001)
      return setError("Use at most two decimal places.");
    if (!data.categories.some((c) => c.id === category && c.type === type))
      return setError("Choose a category first.");
    if (!isValidEthDate(date))
      return setError(
        `Enter a valid Ethiopian date. ${MONTH_NAMES[m - 1]} has ${daysInMonth(Number(year) || 1, m)} days.`,
      );
    const transaction: Transaction = {
      id: entry?.id ?? newId(),
      type,
      categoryId: category,
      amount: Math.round(value * 100) / 100,
      date: ethToISO(date),
      note: note.trim(),
      accountId: account || data.accounts[0]?.id,
    };
    update((d) => ({
      ...d,
      transactions: entry
        ? d.transactions.map((t) => (t.id === entry.id ? transaction : t))
        : [...d.transactions, transaction],
    }));
    onClose();
  };
  return (
    <>
      <Sheet
        visible={visible}
        title={entry ? "Edit transaction" : "A new money moment"}
        onClose={onClose}
      >
        <View style={[S.row, { gap: 10 }]}>
          <Choice
            selected={type === "expense"}
            onPress={() => changeType("expense")}
          >
            ↗ Expense
          </Choice>
          <Choice
            selected={type === "income"}
            onPress={() => changeType("income")}
          >
            ↙ Income
          </Choice>
        </View>
        <Field
          label={`AMOUNT · ${data.currency}`}
          value={amount}
          onChange={setAmount}
          numeric
          placeholder="0.00"
        />
        <View style={{ gap: 10 }}>
          <Text style={S.label}>CATEGORY</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {cats.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => setCategory(c.id)}
                style={{
                  flexDirection: "row",
                  gap: 7,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: category === c.id ? C.green : C.line,
                  backgroundColor: category === c.id ? C.pale : "white",
                }}
              >
                <Icon name={c.icon} size={16} color={c.color} />
                <Text style={{ color: C.ink, fontSize: 13 }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          {cats.length === 0 && (
            <Button
              secondary
              onPress={() => {
                onClose();
                router.push("/settings");
              }}
            >
              Create a category in Settings
            </Button>
          )}
        </View>
        <View style={{ gap: 10 }}>
          <Text style={S.label}>ETHIOPIAN DATE · E.C.</Text>
          <View style={[S.row, { gap: 12 }]}>
            <View style={{ flex: 1 }}>
              <Field label="YEAR" value={year} onChange={setYear} numeric />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="DAY" value={day} onChange={setDay} numeric />
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {MONTH_NAMES.map((name, i) => (
              <Choice
                key={name}
                selected={m === i + 1}
                onPress={() => setM(i + 1)}
              >
                {name}
              </Choice>
            ))}
          </View>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {MONTH_AMHARIC[m - 1]} · {daysInMonth(Number(year) || 1, m)} days
            {isValidEthDate({ year: Number(year), month: m, day: Number(day) })
              ? ` · ${ethToISO({ year: Number(year), month: m, day: Number(day) })} G.C.`
              : ""}
          </Text>
        </View>
        <Field
          label="NOTE (OPTIONAL)"
          value={note}
          onChange={setNote}
          placeholder="What was it for?"
        />
        {data.accounts.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={S.label}>ACCOUNT</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {data.accounts
                .filter((a) => !a.archived)
                .map((a) => (
                  <Choice
                    key={a.id}
                    selected={account === a.id}
                    onPress={() => setAccount(a.id)}
                  >
                    {a.name}
                  </Choice>
                ))}
            </View>
          </View>
        )}
        {error !== "" && (
          <Text
            accessibilityRole="alert"
            style={{ color: C.red, fontSize: 13 }}
          >
            {error}
          </Text>
        )}
        <Button onPress={save} icon="checkmark-outline">
          {entry ? "Save changes" : `Add ${type}`}
        </Button>
        {entry && (
          <Pressable
            onPress={() => setRemove(true)}
            style={{ padding: 10, alignItems: "center" }}
          >
            <Text style={{ color: C.red, fontSize: 13 }}>
              Delete transaction
            </Text>
          </Pressable>
        )}
      </Sheet>
      <Confirm
        visible={remove}
        title="Delete this transaction?"
        detail="This removes the entry from your local ledger and updates its monthly totals. This cannot be undone."
        action="Delete entry"
        onClose={() => setRemove(false)}
        onConfirm={() => {
          update((d) => ({
            ...d,
            transactions: d.transactions.filter((t) => t.id !== entry?.id),
          }));
          onClose();
        }}
      />
    </>
  );
}
export function EntryRow({
  entry,
  onPress,
}: {
  entry: Transaction;
  onPress: () => void;
}) {
  const { data } = useBudget();
  const cat = data.categories.find((c) => c.id === entry.categoryId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${entry.note || cat?.name}, ${entry.amount}`}
      onPress={onPress}
      style={[
        S.between,
        {
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderColor: "#F0F2EB",
          gap: 12,
        },
      ]}
    >
      <View style={[S.row, { gap: 12, flex: 1 }]}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: `${cat?.color ?? C.green}17`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={cat?.icon ?? "cash-outline"}
            size={18}
            color={cat?.color ?? C.green}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{ color: C.ink, fontSize: 13, fontWeight: "500" }}
          >
            {entry.note || cat?.name || "Transaction"}
          </Text>
          <Text style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>
            {cat?.name ?? "Uncategorized"} ·{" "}
            {MONTH_NAMES[isoToEth(entry.date).month - 1]}{" "}
            {isoToEth(entry.date).day}
          </Text>
        </View>
      </View>
      <Text
        style={{
          color: entry.type === "income" ? "#628154" : C.ink,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {entry.type === "income" ? "+" : "−"}
        {new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
          entry.amount,
        )}{" "}
        <Text style={{ fontSize: 10, fontWeight: "400", color: C.muted }}>
          {data.currency === "ETB" ? "Br" : data.currency}
        </Text>
      </Text>
    </Pressable>
  );
}
