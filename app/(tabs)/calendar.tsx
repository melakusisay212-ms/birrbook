import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Shell, Button, C, Icon, S } from "@/components/budget/ui";
import { EntryForm, EntryRow } from "@/components/budget/entry-form";
import { useBudget } from "@/lib/budget/store";
import {
  daysInMonth,
  ethToISO,
  formatEthDate,
  isoToEth,
  MONTH_AMHARIC,
  MONTH_NAMES,
} from "@/lib/budget/calendar";
import { Transaction } from "@/lib/budget/types";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export default function CalendarView() {
  const { data, month } = useBudget();
  const [selected, setSelected] = useState(1);
  const [form, setForm] = useState(false);
  const [entry, setEntry] = useState<Transaction>();
  const total = daysInMonth(month.year, month.month);
  const first = new Date(
    `${ethToISO({ ...month, day: 1 })}T00:00:00Z`,
  ).getUTCDay();
  const days = Array.from({ length: first + total }, (_, i) =>
    i < first ? null : i - first + 1,
  );
  const transactions = data.transactions.filter((t) => {
    const d = isoToEth(t.date);
    return d.year === month.year && d.month === month.month;
  });
  const selectedISO = ethToISO({ ...month, day: selected });
  const selectedEntries = transactions.filter((t) => t.date === selectedISO);
  const monthTotal = transactions.reduce(
    (sum, t) => sum + (t.type === "expense" ? -t.amount : t.amount),
    0,
  );
  return (
    <Shell
      title="A month you can see."
      subtitle={`${MONTH_AMHARIC[month.month - 1]} ${month.year} E.C. · Tap a day to explore`}
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
        <View style={[S.card, { padding: 18 }]}>
          <View style={[S.between, { marginBottom: 16 }]}>
            <View>
              <Text style={S.title}>{MONTH_NAMES[month.month - 1]}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 5 }}>
                {month.year} E.C. · {transactions.length} money moments
              </Text>
            </View>
            <View style={[S.row, { gap: 7 }]}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: C.orange,
                }}
              />
              <Text style={{ color: C.muted, fontSize: 11 }}>expense</Text>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: "#708B56",
                }}
              />
              <Text style={{ color: C.muted, fontSize: 11 }}>income</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {weekdays.map((day) => (
              <Text
                key={day}
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: C.muted,
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {days.map((day, i) => {
              if (!day)
                return (
                  <View
                    key={`blank-${i}`}
                    style={{ width: "14.285%", height: 62 }}
                  />
                );
              const iso = ethToISO({ ...month, day });
              const items = transactions.filter((t) => t.date === iso);
              const active = day === selected;
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelected(day)}
                  accessibilityLabel={`${MONTH_NAMES[month.month - 1]} ${day}, ${items.length} entries`}
                  style={{
                    width: "14.285%",
                    height: 62,
                    alignItems: "center",
                    paddingTop: 5,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? C.green : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "white" : C.ink,
                        fontSize: 13,
                        fontWeight: active ? "700" : "400",
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 3,
                      height: 8,
                      marginTop: 3,
                    }}
                  >
                    {items.slice(0, 3).map((t) => (
                      <View
                        key={t.id}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor:
                            t.type === "income" ? "#708B56" : C.orange,
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[S.between, { paddingHorizontal: 3 }]}>
          <View>
            <Text style={S.title}>{formatEthDate(selectedISO)}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 5 }}>
              {selectedEntries.length
                ? `${selectedEntries.length} entries on this day`
                : "No entries on this day"}
            </Text>
          </View>
          <Text
            style={{
              color: monthTotal >= 0 ? C.green : C.orange,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {monthTotal >= 0 ? "+" : "−"}
            {Math.abs(monthTotal).toLocaleString()} {data.currency}
          </Text>
        </View>
        <View style={[S.card, { paddingTop: 8 }]}>
          {selectedEntries.map((t) => (
            <EntryRow
              key={t.id}
              entry={t}
              onPress={() => {
                setEntry(t);
                setForm(true);
              }}
            />
          ))}
          {!selectedEntries.length && (
            <View
              style={{ paddingVertical: 26, alignItems: "center", gap: 12 }}
            >
              <Icon name="calendar-outline" size={30} color="#AEBBA1" />
              <Text style={{ color: C.muted, fontSize: 13 }}>
                A quiet day. Add something when you’re ready.
              </Text>
              <Button
                secondary
                small
                onPress={() => {
                  setEntry(undefined);
                  setForm(true);
                }}
              >
                Add to this day
              </Button>
            </View>
          )}
        </View>
      </View>
      <EntryForm
        visible={form}
        entry={entry}
        onClose={() => setForm(false)}
        initialDate={{ ...month, day: selected }}
      />
    </Shell>
  );
}
