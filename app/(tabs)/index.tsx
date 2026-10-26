import React, { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Shell, Button, C, Icon, S } from "@/components/budget/ui";
import { Donut, Trend } from "@/components/budget/charts";
import { EntryForm, EntryRow } from "@/components/budget/entry-form";
import { useBudget } from "@/lib/budget/store";
import {
  getInsights,
  getTrend,
  money,
  monthTransactions,
  summarize,
} from "@/lib/budget/analytics";
import {
  gregorianRange,
  MONTH_AMHARIC,
  MONTH_NAMES,
} from "@/lib/budget/calendar";
import { Transaction } from "@/lib/budget/types";
export default function Dashboard() {
  const { data, month } = useBudget();
  const { width } = useWindowDimensions();
  const columns = width > 760;
  const sum = summarize(data, month);
  const currency = data.currency;
  const [form, setForm] = useState(false);
  const [entry, setEntry] = useState<Transaction | undefined>();
  const insights = getInsights(data, month);
  const recent = [...monthTransactions(data, month)]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 4);
  const pct =
    sum.budget > 0 ? Math.round((sum.expenses / sum.budget) * 100) : 0;
  return (
    <Shell
      title="Your month, at a glance."
      subtitle={`${MONTH_AMHARIC[month.month - 1]} ${month.year} · ${gregorianRange(month)}`}
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
      <View style={{ gap: 22 }}>
        <View style={{ flexDirection: columns ? "row" : "column", gap: 18 }}>
          <View
            style={{
              flex: columns ? 1.3 : undefined,
              borderRadius: 22,
              backgroundColor: C.green,
              padding: 27,
              overflow: "hidden",
              minHeight: 205,
            }}
          >
            <View style={[S.between, { marginBottom: 20 }]}>
              <Text
                style={{
                  color: "#C6D3BB",
                  fontSize: 11,
                  letterSpacing: 1.1,
                  fontWeight: "500",
                }}
              >
                LEFT IN YOUR BUDGET
              </Text>
              <Icon name="wallet-outline" color="#CBD7BE" size={21} />
            </View>
            <Text
              style={{
                color: "#FCFDF7",
                fontSize: 39,
                fontWeight: "500",
                letterSpacing: -1.3,
              }}
            >
              {money(sum.remaining, currency)}
            </Text>
            <Text style={{ color: "#BED0B1", fontSize: 12, marginTop: 10 }}>
              {sum.budget
                ? `of ${money(sum.budget, currency)} planned for ${MONTH_NAMES[month.month - 1]}`
                : "Set your category budgets to make a plan."}
            </Text>
            <View
              style={{
                height: 5,
                backgroundColor: "#59714F",
                marginTop: 23,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  height: 5,
                  backgroundColor: sum.remaining < 0 ? "#DBAA82" : "#C6D59C",
                  borderRadius: 4,
                }}
              />
            </View>
            <View style={[S.between, { marginTop: 10 }]}>
              <Text style={{ color: "#BDCCAF", fontSize: 10 }}>
                {sum.budget
                  ? `${pct}% of budget used`
                  : "A fresh month, a fresh start"}
              </Text>
              <Pressable onPress={() => router.push("/budgets")}>
                <Text style={{ color: "#E0EBCF", fontSize: 10 }}>
                  View budgets →
                </Text>
              </Pressable>
            </View>
          </View>
          <View
            style={{
              flex: columns ? 1 : undefined,
              gap: 12,
              flexDirection: columns ? "column" : "row",
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "INCOME",
                value: sum.income,
                icon: "arrow-down-outline",
                color: "#71875B",
                caption: "Money coming in",
              },
              {
                label: "EXPENSES",
                value: sum.expenses,
                icon: "arrow-up-outline",
                color: "#CE946D",
                caption: "Money going out",
              },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  S.card,
                  {
                    flex: 1,
                    padding: 20,
                    flexDirection: columns ? "row" : "column",
                    alignItems: columns ? "center" : "flex-start",
                    gap: columns ? 20 : 12,
                  },
                ]}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: `${item.color}18`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
                <View>
                  <Text style={[S.label, { fontSize: 10 }]}>{item.label}</Text>
                  <Text
                    style={{
                      fontSize: columns ? 24 : 21,
                      color: C.ink,
                      fontWeight: "600",
                      letterSpacing: -0.8,
                      marginTop: 6,
                    }}
                  >
                    {money(item.value, currency)}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
                    {item.caption}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={[S.between, { paddingHorizontal: 2 }]}>
          <View style={[S.row, { gap: 7 }]}>
            <Icon name="leaf-outline" size={14} color="#879873" />
            <Text style={{ color: C.muted, fontSize: 12 }}>
              Income minus expenses
            </Text>
          </View>
          <Text style={{ color: C.green, fontSize: 13, fontWeight: "600" }}>
            {money(sum.balance, currency)}
          </Text>
        </View>
        <View style={{ flexDirection: columns ? "row" : "column", gap: 20 }}>
          <View style={[S.card, { flex: 1 }]}>
            <View style={[S.between, { marginBottom: 15 }]}>
              <Text style={S.title}>Where it went</Text>
              <Icon name="ellipsis-horizontal" size={17} color={C.muted} />
            </View>
            <Text style={{ color: C.muted, fontSize: 11 }}>
              Spending by category
            </Text>
            <View
              style={{
                flexDirection:
                  width > 1250 || (!columns && width > 540) ? "row" : "column",
                alignItems: "center",
                gap: 15,
                marginTop: 13,
              }}
            >
              <Donut
                categories={sum.categories}
                total={sum.expenses}
                currency={currency}
              />
              <View style={{ flex: 1, width: "100%", gap: 13 }}>
                {sum.categories
                  .filter((c) => c.spent > 0)
                  .sort((a, b) => b.spent - a.spent)
                  .map((c) => (
                    <View key={c.category.id} style={[S.between, { gap: 8 }]}>
                      <View style={[S.row, { gap: 7, flex: 1 }]}>
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: c.category.color,
                          }}
                        />
                        <Text
                          numberOfLines={1}
                          style={{ color: "#74806E", fontSize: 11 }}
                        >
                          {c.category.name}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: C.ink,
                          fontSize: 11,
                          fontWeight: "500",
                        }}
                      >
                        {money(c.spent, currency)}
                        <Text style={{ color: C.muted, fontWeight: "400" }}>
                          {" "}
                          ·{" "}
                          {sum.expenses
                            ? Math.round((c.spent / sum.expenses) * 100)
                            : 0}
                          %
                        </Text>
                      </Text>
                    </View>
                  ))}
                {sum.expenses === 0 && (
                  <Text
                    style={{
                      color: C.muted,
                      fontSize: 12,
                      textAlign: "center",
                      lineHeight: 20,
                    }}
                  >
                    Your first expense will bring this chart to life.
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View style={[S.card, { flex: 1.2 }]}>
            <View style={[S.between, { marginBottom: 15 }]}>
              <Text style={S.title}>The bigger picture</Text>
              <View
                style={{ padding: 6, backgroundColor: C.bg, borderRadius: 7 }}
              >
                <Text style={{ color: C.muted, fontSize: 10 }}>6 MONTHS</Text>
              </View>
            </View>
            <Text style={{ color: C.muted, fontSize: 11, marginBottom: 25 }}>
              Income & expenses · {currency} · Ethiopian months
            </Text>
            <Trend values={getTrend(data, month, 6)} currency={currency} />
            <View
              style={{
                borderTopWidth: 1,
                borderColor: C.line,
                marginTop: 20,
                paddingTop: 16,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 11, lineHeight: 18 }}>
                Little by little, your habits become clearer. Pagume is included
                as its own month.
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: columns ? "row" : "column", gap: 20 }}>
          <View style={[S.card, { flex: 1.2 }]}>
            <View style={[S.between, { marginBottom: 10 }]}>
              <Text style={S.title}>Recent money moments</Text>
              <Pressable onPress={() => router.push("/transactions")}>
                <Text style={{ color: "#758766", fontSize: 11 }}>
                  See all →
                </Text>
              </Pressable>
            </View>
            {recent.map((t) => (
              <EntryRow
                key={t.id}
                entry={t}
                onPress={() => {
                  setEntry(t);
                  setForm(true);
                }}
              />
            ))}
            {recent.length === 0 && (
              <View style={{ paddingVertical: 25, gap: 15 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  Nothing logged this month yet. Start with your first income or
                  expense.
                </Text>
                <Button
                  secondary
                  small
                  onPress={() => {
                    setEntry(undefined);
                    setForm(true);
                  }}
                >
                  Add your first entry
                </Button>
              </View>
            )}
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#EEF1E7",
              borderRadius: 22,
              padding: 24,
              gap: 20,
            }}
          >
            <View style={[S.row, { gap: 8 }]}>
              <Icon name="sparkles-outline" size={18} color="#738861" />
              <Text style={S.title}>A little perspective</Text>
            </View>
            {insights.slice(0, 3).map((insight, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ marginTop: 1 }}>
                  <Icon
                    name={
                      insight.tone === "warning"
                        ? "alert-circle-outline"
                        : insight.tone === "positive"
                          ? "checkmark-circle-outline"
                          : "bulb-outline"
                    }
                    color={insight.tone === "warning" ? C.orange : "#84966D"}
                    size={18}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: C.ink,
                      fontSize: 13,
                      fontWeight: "500",
                      lineHeight: 20,
                    }}
                  >
                    {insight.title}
                  </Text>
                  <Text
                    style={{
                      color: "#8B9480",
                      fontSize: 11,
                      lineHeight: 18,
                      marginTop: 5,
                    }}
                  >
                    {insight.detail}
                  </Text>
                </View>
              </View>
            ))}
            {insights.length === 0 && (
              <Text style={{ color: "#819174", fontSize: 13, lineHeight: 21 }}>
                Add a few transactions and category budgets. You’ll find useful
                patterns here, not financial jargon.
              </Text>
            )}
            <Text style={{ color: "#97A088", fontSize: 10, marginTop: 4 }}>
              Calculated on your device. Always.
            </Text>
          </View>
        </View>
      </View>
      <EntryForm visible={form} entry={entry} onClose={() => setForm(false)} />
    </Shell>
  );
}
