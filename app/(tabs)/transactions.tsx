import React, { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Shell, Button, C, Choice, Icon, S } from "@/components/budget/ui";
import { EntryForm, EntryRow } from "@/components/budget/entry-form";
import { useBudget } from "@/lib/budget/store";
import { money, monthTransactions } from "@/lib/budget/analytics";
import { formatEthDate } from "@/lib/budget/calendar";
import { Transaction } from "@/lib/budget/types";
export default function Transactions() {
  const { data, month } = useBudget();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [cat, setCat] = useState("all");
  const [form, setForm] = useState(false);
  const [entry, setEntry] = useState<Transaction | undefined>();
  const entries = monthTransactions(data, month)
    .filter(
      (t) =>
        (filter === "all" || t.type === filter) &&
        (cat === "all" || t.categoryId === cat) &&
        `${t.note} ${data.categories.find((c) => c.id === t.categoryId)?.name} ${t.amount}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const dates = [...new Set(entries.map((t) => t.date))];
  return (
    <Shell
      title="Every birr has a story."
      subtitle="Your income and expenses, one money moment at a time."
      action={
        <Button
          small
          icon="add-outline"
          onPress={() => {
            setEntry(undefined);
            setForm(true);
          }}
        >
          Add entry
        </Button>
      }
    >
      <View style={{ gap: 20 }}>
        <View
          style={[
            S.row,
            {
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 14,
              paddingHorizontal: 15,
              gap: 9,
            },
          ]}
        >
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            accessibilityLabel="Search transactions"
            placeholder="Search notes, categories, or amounts"
            placeholderTextColor={C.muted}
            style={{ flex: 1, minHeight: 48, color: C.ink, fontSize: 13 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={[S.row, { gap: 8 }]}>
          {["all", "expense", "income"].map((f) => (
            <Choice
              key={f}
              selected={filter === f}
              onPress={() => setFilter(f)}
            >
              {f === "all"
                ? "All entries"
                : f === "income"
                  ? "Income"
                  : "Expenses"}
            </Choice>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Choice selected={cat === "all"} onPress={() => setCat("all")}>
            All categories
          </Choice>
          {data.categories
            .filter((c) => filter === "all" || c.type === filter)
            .map((c) => (
              <Choice
                key={c.id}
                selected={cat === c.id}
                onPress={() => setCat(c.id)}
              >
                {c.name}
              </Choice>
            ))}
        </ScrollView>
        <View style={[S.between, { paddingHorizontal: 3 }]}>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"} this
            month
          </Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>
            Tap an entry to edit
          </Text>
        </View>
        <View style={[S.card, { paddingTop: 8 }]}>
          {dates.map((date) => (
            <View key={date}>
              <Text
                style={[
                  S.label,
                  { marginTop: 22, marginBottom: 6, fontSize: 11 },
                ]}
              >
                {formatEthDate(date)}
              </Text>
              {entries
                .filter((t) => t.date === date)
                .map((t) => (
                  <EntryRow
                    key={t.id}
                    entry={t}
                    onPress={() => {
                      setEntry(t);
                      setForm(true);
                    }}
                  />
                ))}
            </View>
          ))}
          {!entries.length && (
            <View
              style={{ alignItems: "center", gap: 12, paddingVertical: 48 }}
            >
              <Icon name="receipt-outline" size={34} color="#ADBA9E" />
              <Text style={S.title}>A clean page.</Text>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 21,
                }}
              >
                {search || filter !== "all" || cat !== "all"
                  ? "No entries match your filters."
                  : "No transactions in this Ethiopian month yet."}
              </Text>
              <Button
                secondary
                small
                onPress={() => {
                  setEntry(undefined);
                  setForm(true);
                }}
              >
                Log a transaction
              </Button>
            </View>
          )}
        </View>
        {entries.length > 0 && (
          <View style={[S.row, { gap: 20, flexWrap: "wrap", padding: 10 }]}>
            <Text style={{ color: C.green, fontSize: 12 }}>
              Income{" "}
              {money(
                entries
                  .filter((t) => t.type === "income")
                  .reduce((s, t) => s + t.amount, 0),
                data.currency,
              )}
            </Text>
            <Text style={{ color: C.orange, fontSize: 12 }}>
              Expenses{" "}
              {money(
                entries
                  .filter((t) => t.type === "expense")
                  .reduce((s, t) => s + t.amount, 0),
                data.currency,
              )}
            </Text>
          </View>
        )}
      </View>
      <EntryForm visible={form} entry={entry} onClose={() => setForm(false)} />
    </Shell>
  );
}
