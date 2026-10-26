import React, { useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Shell,
  Button,
  C,
  Choice,
  Confirm,
  Field,
  Icon,
  S,
  Sheet,
} from "@/components/budget/ui";
import { ImportForm } from "@/components/budget/import-form";
import { emptyData, useBudget, newId } from "@/lib/budget/store";
import { ACCENTS, Category, EntryType, PALETTE } from "@/lib/budget/types";
import { exportBudgets, exportTransactions } from "@/lib/budget/csv";
import { saveCSV } from "@/lib/budget/io";
import { router } from "expo-router";
export default function Settings() {
  const { data, update } = useBudget();
  const { width } = useWindowDimensions();
  const columns = width > 760;
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<EntryType>("expense");
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState("wallet-outline");
  const [error, setError] = useState("");
  const openCategory = (c?: Category) => {
    setCategory(c ?? null);
    setName(c?.name ?? "");
    setType(c?.type ?? "expense");
    setColor(c?.color ?? PALETTE[0]);
    setIcon(c?.icon ?? "wallet-outline");
    setError("");
    setEditing(true);
  };
  const used =
    category &&
    (data.transactions.some((t) => t.categoryId === category.id) ||
      data.budgets.some((b) => b.categoryId === category.id));
  const save = () => {
    const clean = name.trim();
    if (!clean || clean.length > 40)
      return setError("Give this category a name of 1–40 characters.");
    if (
      data.categories.some(
        (c) =>
          c.id !== category?.id &&
          c.type === type &&
          c.name.toLowerCase() === clean.toLowerCase(),
      )
    )
      return setError("A category with this name and type already exists.");
    const c: Category = {
      id: category?.id ?? newId(),
      name: clean,
      type,
      color,
      icon,
    };
    update((d) => ({
      ...d,
      categories: category
        ? d.categories.map((old) => (old.id === c.id ? c : old))
        : [...d.categories, c],
    }));
    setEditing(false);
  };
  const download = async (kind: "transactions" | "budgets") => {
    try {
      await saveCSV(
        kind === "transactions"
          ? exportTransactions(data)
          : exportBudgets(data),
        `birrbook-${kind}.csv`,
      );
      setMessage(
        Platform.OS === "web"
          ? `${kind === "transactions" ? "Transaction" : "Budget"} CSV download started.`
          : "CSV opened in your device’s share sheet.",
      );
    } catch {
      setMessage("Could not export the CSV. Please try again.");
    }
  };
  return (
    <Shell
      title="Your budget. Your way."
      subtitle="A few simple preferences, and complete control of your data."
    >
      <View style={{ gap: 22 }}>
        <View style={[S.card, { gap: 14 }]}>
          <Text style={S.title}>Money tools</Text>
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20 }}>
            Your original ledger and category budgets are still here, alongside
            the new views.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
            <Button
              small
              secondary
              icon="swap-horizontal-outline"
              onPress={() => router.push("/transactions")}
            >
              Transactions
            </Button>
            <Button
              small
              secondary
              icon="pie-chart-outline"
              onPress={() => router.push("/budgets")}
            >
              Budgets
            </Button>
          </View>
        </View>
        {message !== "" && (
          <View
            style={[
              S.between,
              {
                padding: 14,
                backgroundColor: C.pale,
                borderRadius: 12,
                gap: 15,
              },
            ]}
          >
            <Text style={{ color: C.green, flex: 1, fontSize: 13 }}>
              {message}
            </Text>
            <Pressable onPress={() => setMessage("")}>
              <Icon name="close-outline" size={19} />
            </Pressable>
          </View>
        )}
        <View style={{ flexDirection: columns ? "row" : "column", gap: 20 }}>
          <View style={[S.card, { flex: 1, gap: 18 }]}>
            <View style={[S.row, { gap: 9 }]}>
              <Icon name="folder-open-outline" color="#79936C" />
              <Text style={S.title}>Bring in. Back up.</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 21 }}>
              Move your numbers without connecting an account. CSV files stay
              between you and your device.
            </Text>
            <Button
              icon="cloud-download-outline"
              onPress={() => setImporting(true)}
            >
              Import CSV
            </Button>
            <View style={{ gap: 10 }}>
              <Button
                secondary
                icon="download-outline"
                onPress={() => download("transactions")}
              >
                Export all transactions
              </Button>
              <Button
                secondary
                icon="pie-chart-outline"
                onPress={() => download("budgets")}
              >
                Export all budgets
              </Button>
            </View>
            <Text style={{ color: C.muted, fontSize: 11, lineHeight: 18 }}>
              Transaction exports contain both Gregorian and Ethiopian dates.
              Budget exports use Ethiopian months. Export both files for a
              complete financial backup.
              {Platform.OS !== "web"
                ? " On native, choose a CSV file from your device and save exports through the share sheet."
                : ""}
            </Text>
          </View>
          <View style={[S.card, { flex: 1, gap: 19 }]}>
            <View style={[S.row, { gap: 9 }]}>
              <Icon name="calendar-outline" color="#79936C" />
              <Text style={S.title}>Rooted in your calendar</Text>
            </View>
            <View
              style={{
                padding: 18,
                backgroundColor: C.bg,
                borderRadius: 13,
                gap: 8,
              }}
            >
              <Text style={{ color: C.ink, fontSize: 14, fontWeight: "600" }}>
                Ethiopian calendar · የኢትዮጵያ ቀን አቆጣጠር
              </Text>
              <Text style={{ color: C.muted, fontSize: 12, lineHeight: 21 }}>
                Meskerem through Pagume. All 13 months have their own budgets
                and reports. Pagume has 5 days, or 6 in an Ethiopian leap year.
              </Text>
            </View>
            <Text style={S.label}>DISPLAY CURRENCY</Text>
            <View style={[S.row, { gap: 8, flexWrap: "wrap" }]}>
              {["ETB", "USD", "EUR", "GBP"].map((c) => (
                <Choice
                  key={c}
                  selected={data.currency === c}
                  onPress={() => update((d) => ({ ...d, currency: c }))}
                >
                  {c === "ETB" ? "Birr · ETB" : c}
                </Choice>
              ))}
            </View>
            <Text style={{ color: C.muted, fontSize: 11, lineHeight: 19 }}>
              Currency changes the label, not the values. No exchange-rate
              conversion is performed. Today’s date follows Addis Ababa time.
            </Text>
            <Text style={S.label}>APP THEME</Text>
            <View style={[S.row, { gap: 8, flexWrap: "wrap" }]}>
              {(["light", "dark", "system"] as const).map((mode) => (
                <Choice
                  key={mode}
                  selected={data.preferences.theme === mode}
                  onPress={() =>
                    update((d) => ({
                      ...d,
                      preferences: { ...d.preferences, theme: mode },
                    }))
                  }
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Choice>
              ))}
            </View>
            <Text style={S.label}>ACCENT COLOR</Text>
            <View style={[S.row, { gap: 8, flexWrap: "wrap" }]}>
              {ACCENTS.map((accent) => (
                <Pressable
                  key={accent.id}
                  onPress={() =>
                    update((d) => ({
                      ...d,
                      preferences: { ...d.preferences, accent: accent.color },
                    }))
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    padding: 8,
                    borderWidth:
                      data.preferences.accent === accent.color ? 2 : 1,
                    borderColor:
                      data.preferences.accent === accent.color
                        ? accent.color
                        : C.line,
                    borderRadius: 10,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: accent.color,
                    }}
                  />
                  <Text style={{ color: C.ink, fontSize: 11 }}>
                    {accent.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <View style={[S.card, { gap: 22 }]}>
          <View style={S.between}>
            <Text style={S.title}>Make your own categories</Text>
            <Button
              small
              secondary
              icon="add-outline"
              onPress={() => openCategory()}
            >
              Add category
            </Button>
          </View>
          {(["expense", "income"] as const).map((t) => (
            <View key={t} style={{ gap: 12 }}>
              <Text style={S.label}>
                {t === "income" ? "INCOME" : "EXPENSES"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
                {data.categories
                  .filter((c) => c.type === t)
                  .map((c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit category ${c.name}`}
                      onPress={() => openCategory(c)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderWidth: 1,
                        borderColor: C.line,
                        borderRadius: 12,
                      }}
                    >
                      <Icon name={c.icon} size={17} color={c.color} />
                      <Text style={{ color: C.ink, fontSize: 13 }}>
                        {c.name}
                      </Text>
                      <Icon name="create-outline" color="#ABB29F" size={12} />
                    </Pressable>
                  ))}
              </View>
            </View>
          ))}
        </View>
        <View
          style={{
            backgroundColor: "#EEF1E7",
            borderRadius: 22,
            padding: 24,
            gap: 14,
          }}
        >
          <View style={[S.row, { gap: 9 }]}>
            <Icon name="shield-checkmark-outline" color="#829369" />
            <Text style={S.title}>Private by design</Text>
          </View>
          <Text style={{ color: "#7B896E", fontSize: 13, lineHeight: 22 }}>
            Your financial records are stored only in this browser
            {Platform.OS !== "web" ? " or device storage" : ""}. There’s no
            account and no financial data sent to a server. Clearing browser
            data, uninstalling the native app, or switching devices can lose
            your records. Keep CSV backups somewhere safe.
          </Text>
          <View style={[S.row, { gap: 7 }]}>
            <Icon name="phone-portrait-outline" size={14} color="#8B9A7B" />
            <Text style={{ color: "#8B9A7B", fontSize: 11 }}>
              {data.transactions.length} transactions · {data.budgets.length}{" "}
              category budgets on this device{data.demo ? " · sample data" : ""}
            </Text>
          </View>
        </View>
        <View style={[S.between, { padding: 10, gap: 15 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontSize: 14, fontWeight: "500" }}>
              Start with a clean page
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
              Remove all local records and restore default categories.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReset(true)}
            style={{ padding: 12 }}
          >
            <Text style={{ color: C.red, fontSize: 12 }}>Reset data</Text>
          </Pressable>
        </View>
      </View>
      <ImportForm
        visible={importing}
        onClose={() => setImporting(false)}
        onImported={setMessage}
      />
      <Confirm
        visible={reset}
        title="Erase all local budget data?"
        detail="This permanently deletes all transactions, budgets, and custom categories from this device. Export both CSV files first if you want a backup. This cannot be undone."
        action="Erase & reset"
        onClose={() => setReset(false)}
        onConfirm={() => {
          update(() => emptyData());
          setMessage("Your local budget has been reset.");
        }}
      />
      <Sheet
        visible={editing}
        title={category ? "Edit category" : "A category of your own"}
        onClose={() => setEditing(false)}
      >
        <Field
          label="CATEGORY NAME"
          value={name}
          onChange={setName}
          placeholder="e.g. Family support"
        />
        <View style={[S.row, { gap: 8 }]}>
          <Choice
            selected={type === "expense"}
            onPress={() => {
              if (!used) setType("expense");
            }}
          >
            Expense
          </Choice>
          <Choice
            selected={type === "income"}
            onPress={() => {
              if (!used) setType("income");
            }}
          >
            Income
          </Choice>
        </View>
        {used && (
          <Text style={{ color: C.muted, fontSize: 11 }}>
            The type is locked because this category has transactions or
            budgets.
          </Text>
        )}
        <View style={{ gap: 12 }}>
          <Text style={S.label}>CATEGORY COLOR</Text>
          <View style={[S.row, { gap: 12, flexWrap: "wrap" }]}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityLabel={`Choose color ${c}`}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: C.ink,
                }}
              >
                {color === c && (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="checkmark-outline" size={15} color="white" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={S.label}>CATEGORY ICON</Text>
          <View style={[S.row, { gap: 8, flexWrap: "wrap" }]}>
            {[
              "wallet-outline",
              "basket-outline",
              "restaurant-outline",
              "home-outline",
              "bus-outline",
              "heart-outline",
              "book-outline",
              "airplane-outline",
              "gift-outline",
              "people-outline",
              "briefcase-outline",
              "cash-outline",
            ].map((i) => (
              <Pressable
                key={i}
                onPress={() => setIcon(i)}
                accessibilityLabel={`Choose ${i}`}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  backgroundColor: icon === i ? C.pale : "white",
                  borderWidth: 1,
                  borderColor: icon === i ? C.green : C.line,
                }}
              >
                <Icon name={i} color={color} />
              </Pressable>
            ))}
          </View>
        </View>
        {error !== "" && (
          <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>
        )}
        <Button onPress={save}>Save category</Button>
        {category && (
          <Button
            secondary
            disabled={Boolean(used)}
            onPress={() => {
              update((d) => ({
                ...d,
                categories: d.categories.filter((c) => c.id !== category.id),
              }));
              setEditing(false);
            }}
          >
            Delete unused category
          </Button>
        )}
        {used && (
          <Text style={{ color: C.muted, fontSize: 11 }}>
            Categories with records cannot be deleted. You can rename them
            without losing any history.
          </Text>
        )}
      </Sheet>
    </Shell>
  );
}
