import React, { useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import {
  Shell,
  Button,
  C,
  Confirm,
  Field,
  Icon,
  S,
  Sheet,
} from "@/components/budget/ui";
import { useBudget } from "@/lib/budget/store";
import { money, summarize } from "@/lib/budget/analytics";
import { monthKey, MONTH_NAMES, shiftMonth } from "@/lib/budget/calendar";
import { Category } from "@/lib/budget/types";
export default function Budgets() {
  const { data, month, update } = useBudget();
  const { width } = useWindowDimensions();
  const columns = width > 760;
  const sum = summarize(data, month);
  const [cat, setCat] = useState<Category | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [copy, setCopy] = useState(false);
  const previous =
    month.year === 1 && month.month === 1
      ? []
      : data.budgets.filter((b) => b.month === monthKey(shiftMonth(month, -1)));
  const save = () => {
    const n = Number(amount.replace(/,/g, ""));
    if (
      !amount.trim() ||
      !Number.isFinite(n) ||
      n < 0 ||
      n > 1e12 ||
      Math.abs(n * 100 - Math.round(n * 100)) > 0.0001
    )
      return setError(
        "Enter zero or a positive amount with up to two decimal places.",
      );
    if (!cat) return;
    update((d) => ({
      ...d,
      budgets: [
        ...d.budgets.filter(
          (b) => !(b.month === monthKey(month) && b.categoryId === cat.id),
        ),
        {
          categoryId: cat.id,
          month: monthKey(month),
          amount: Math.round(n * 100) / 100,
        },
      ],
    }));
    setCat(null);
  };
  return (
    <Shell
      title="A plan for what matters."
      subtitle={`Set your spending intentions for ${MONTH_NAMES[month.month - 1]}. Budgets are separate for each month.`}
      action={
        <Button
          secondary
          small
          icon="copy-outline"
          disabled={!previous.length}
          onPress={() => setCopy(true)}
        >
          Copy previous
        </Button>
      }
    >
      <View style={{ gap: 24 }}>
        <View
          style={[
            S.card,
            {
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 25,
              backgroundColor: "#EEF2E9",
            },
          ]}
        >
          {[
            ["TOTAL BUDGET", sum.budget],
            ["SPENT SO FAR", sum.expenses],
            ["REMAINING", sum.remaining],
          ].map(([label, value]) => (
            <View key={String(label)} style={{ flex: 1, minWidth: 120 }}>
              <Text style={[S.label, { fontSize: 10 }]}>{label}</Text>
              <Text
                style={{
                  fontSize: 25,
                  color: Number(value) < 0 ? C.red : C.green,
                  fontWeight: "600",
                  marginTop: 9,
                  letterSpacing: -0.8,
                }}
              >
                {money(Number(value), data.currency)}
              </Text>
            </View>
          ))}
        </View>
        <View style={[S.between, { gap: 10 }]}>
          <Text style={S.title}>Your categories</Text>
          <Pressable onPress={() => router.push("/settings")}>
            <Text style={{ color: "#778768", fontSize: 12 }}>
              Manage categories →
            </Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {sum.categories.map((item) => {
            const pct =
              item.budget > 0
                ? Math.round((item.spent / item.budget) * 100)
                : 0;
            const hasBudget = data.budgets.some(
              (b) =>
                b.month === monthKey(month) &&
                b.categoryId === item.category.id,
            );
            const over = hasBudget && item.spent > item.budget;
            return (
              <Pressable
                key={item.category.id}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.category.name} budget`}
                onPress={() => {
                  setCat(item.category);
                  setAmount(hasBudget ? String(item.budget) : "");
                  setError("");
                }}
                style={[
                  S.card,
                  { width: columns ? "48%" : "100%", flexGrow: 1, gap: 18 },
                ]}
              >
                <View style={S.between}>
                  <View style={[S.row, { gap: 11 }]}>
                    <View
                      style={{
                        width: 37,
                        height: 37,
                        borderRadius: 11,
                        backgroundColor: `${item.category.color}18`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name={item.category.icon}
                        color={item.category.color}
                        size={18}
                      />
                    </View>
                    <Text
                      style={{ color: C.ink, fontSize: 15, fontWeight: "500" }}
                    >
                      {item.category.name}
                    </Text>
                  </View>
                  <Icon name="create-outline" size={16} color={C.muted} />
                </View>
                <View style={S.between}>
                  <Text
                    style={{ color: C.ink, fontSize: 21, fontWeight: "500" }}
                  >
                    {money(item.spent, data.currency)}
                    <Text style={{ color: C.muted, fontSize: 12 }}> spent</Text>
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {hasBudget
                      ? `of ${money(item.budget, data.currency)}`
                      : "No budget yet"}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 5,
                    backgroundColor: "#F0F2EB",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 6,
                      width: `${hasBudget ? Math.min(pct || (item.spent > 0 ? 100 : 0), 100) : 0}%`,
                      backgroundColor: over ? "#CD8D69" : item.category.color,
                      borderRadius: 5,
                    }}
                  />
                </View>
                <View style={S.between}>
                  <Text
                    style={{ color: over ? C.red : "#7B8C6A", fontSize: 12 }}
                  >
                    {hasBudget
                      ? over
                        ? `${money(-item.remaining, data.currency)} over budget`
                        : `${money(item.remaining, data.currency)} left`
                      : "Tap to set a monthly budget"}
                  </Text>
                  {hasBudget && (
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {item.budget ? `${pct}% used` : "Zero budget"}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: C.muted, fontSize: 12, lineHeight: 20 }}>
          Budgets don’t roll over automatically. Give each Ethiopian
          month—including Pagume—its own plan.
        </Text>
      </View>
      <Sheet
        visible={cat !== null}
        title={`${cat?.name ?? ""} budget`}
        onClose={() => setCat(null)}
      >
        <Text style={S.text}>
          How much would you like to spend in {MONTH_NAMES[month.month - 1]}{" "}
          {month.year} E.C.?
        </Text>
        <Field
          label={`MONTHLY LIMIT · ${data.currency}`}
          value={amount}
          onChange={setAmount}
          numeric
          placeholder="0.00"
        />
        {error !== "" && (
          <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>
        )}
        <Button onPress={save}>Save category budget</Button>
        <Button
          secondary
          onPress={() => {
            update((d) => ({
              ...d,
              budgets: d.budgets.filter(
                (b) =>
                  !(b.month === monthKey(month) && b.categoryId === cat?.id),
              ),
            }));
            setCat(null);
          }}
        >
          Remove budget for this month
        </Button>
      </Sheet>
      <Confirm
        visible={copy}
        title="Use last month’s plan?"
        detail="Budgets from the previous Ethiopian month will replace matching category budgets in this month. Transactions are not changed."
        action="Copy budgets"
        onClose={() => setCopy(false)}
        onConfirm={() =>
          update((d) => ({
            ...d,
            budgets: [
              ...d.budgets.filter(
                (b) =>
                  b.month !== monthKey(month) ||
                  !previous.some((p) => p.categoryId === b.categoryId),
              ),
              ...previous.map((b) => ({ ...b, month: monthKey(month) })),
            ],
          }))
        }
      />
    </Shell>
  );
}
