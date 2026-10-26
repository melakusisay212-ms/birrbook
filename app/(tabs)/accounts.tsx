import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Shell,
  Button,
  C,
  Choice,
  Field,
  Icon,
  S,
  Sheet,
} from "@/components/budget/ui";
import { useBudget, newId } from "@/lib/budget/store";
import { accountBalance, accountMonthTotals } from "@/lib/budget/extended";
import { Account, AccountType, PALETTE } from "@/lib/budget/types";
import { money } from "@/lib/budget/analytics";
const accountTypes: { id: AccountType; label: string; icon: string }[] = [
  { id: "cash", label: "Cash", icon: "cash-outline" },
  { id: "bank", label: "Bank", icon: "business-outline" },
  { id: "mobile", label: "Mobile money", icon: "phone-portrait-outline" },
  { id: "card", label: "Card", icon: "card-outline" },
  { id: "other", label: "Other", icon: "wallet-outline" },
];
export default function Accounts() {
  const { data, month, update } = useBudget();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account>();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [opening, setOpening] = useState("0");
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState("");
  const openForm = (a?: Account) => {
    setEditing(a);
    setName(a?.name ?? "");
    setType(a?.type ?? "cash");
    setOpening(String(a?.openingBalance ?? 0));
    setColor(a?.color ?? PALETTE[0]);
    setError("");
    setOpen(true);
  };
  const save = () => {
    const amount = Number(opening.replace(/,/g, ""));
    if (!name.trim() || !Number.isFinite(amount))
      return setError("Enter a name and a valid opening balance.");
    const account = {
      id: editing?.id ?? newId(),
      name: name.trim(),
      type,
      openingBalance: amount,
      color,
    };
    update((d) => ({
      ...d,
      accounts: editing
        ? d.accounts.map((a) => (a.id === account.id ? account : a))
        : [...d.accounts, account],
    }));
    setOpen(false);
  };
  return (
    <Shell
      title="Where your money lives."
      subtitle="Keep cash, bank, mobile money, and cards separate without connecting them."
      action={
        <Button small icon="add-outline" onPress={() => openForm()}>
          Add account
        </Button>
      }
    >
      <View style={{ gap: 20 }}>
        <View style={[S.card, { backgroundColor: C.green }]}>
          <Text style={{ color: "#C6D3BB", fontSize: 11, letterSpacing: 1 }}>
            TOTAL ACROSS ACTIVE ACCOUNTS
          </Text>
          <Text
            style={{
              color: "white",
              fontSize: 34,
              fontWeight: "600",
              marginTop: 12,
            }}
          >
            {money(
              data.accounts
                .filter((a) => !a.archived)
                .reduce((s, a) => s + accountBalance(data, a), 0),
              data.currency,
            )}
          </Text>
          <Text style={{ color: "#C6D3BB", fontSize: 12, marginTop: 6 }}>
            Opening balances plus logged income and expenses
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {data.accounts.map((account) => {
            const balance = accountBalance(data, account);
            const totals = accountMonthTotals(data, account.id, month);
            return (
              <Pressable
                key={account.id}
                onPress={() => openForm(account)}
                style={[
                  S.card,
                  {
                    flexGrow: 1,
                    minWidth: 280,
                    gap: 17,
                    opacity: account.archived ? 0.55 : 1,
                  },
                ]}
              >
                <View style={S.between}>
                  <View style={[S.row, { gap: 11 }]}>
                    <View
                      style={{
                        width: 39,
                        height: 39,
                        borderRadius: 12,
                        backgroundColor: `${account.color}20`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name={
                          accountTypes.find((t) => t.id === account.type)
                            ?.icon ?? "wallet-outline"
                        }
                        color={account.color}
                      />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: C.ink,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        {account.name}
                      </Text>
                      <Text
                        style={{ color: C.muted, fontSize: 11, marginTop: 4 }}
                      >
                        {accountTypes.find((t) => t.id === account.type)?.label}
                        {account.archived ? " · Archived" : ""}
                      </Text>
                    </View>
                  </View>
                  <Icon name="create-outline" color={C.muted} size={16} />
                </View>
                <Text
                  style={{
                    color: balance < 0 ? C.red : C.green,
                    fontSize: 28,
                    fontWeight: "600",
                  }}
                >
                  {money(balance, data.currency)}
                </Text>
                <View style={[S.row, { gap: 18 }]}>
                  <Text style={{ color: "#71875B", fontSize: 11 }}>
                    This month +{money(totals.income, data.currency)}
                  </Text>
                  <Text style={{ color: C.orange, fontSize: 11 }}>
                    −{money(totals.expense, data.currency)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            backgroundColor: "#EEF1E7",
            borderRadius: 18,
            padding: 20,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <Icon name="information-circle-outline" color="#829369" />
          <Text
            style={{ flex: 1, color: "#7B896E", fontSize: 12, lineHeight: 19 }}
          >
            Transactions from your old budget are assigned to Main wallet. New
            entries can be assigned to any active account.
          </Text>
        </View>
      </View>
      <Sheet
        visible={open}
        title={editing ? "Edit account" : "Add an account"}
        onClose={() => setOpen(false)}
      >
        <Field
          label="ACCOUNT NAME"
          value={name}
          onChange={setName}
          placeholder="e.g. CBE account"
        />
        <Text style={S.label}>ACCOUNT TYPE</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {accountTypes.map((t) => (
            <Choice
              key={t.id}
              selected={type === t.id}
              onPress={() => setType(t.id)}
            >
              {t.label}
            </Choice>
          ))}
        </View>
        <Field
          label="OPENING BALANCE"
          value={opening}
          onChange={setOpening}
          numeric
          placeholder="0"
        />
        <Text style={S.label}>ACCOUNT COLOR</Text>
        <View style={[S.row, { gap: 10, flexWrap: "wrap" }]}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: c,
                borderWidth: color === c ? 3 : 0,
                borderColor: C.ink,
              }}
            />
          ))}
        </View>
        {error && <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>}
        <Button onPress={save}>Save account</Button>
        {editing && (
          <Button
            secondary
            onPress={() => {
              update((d) => ({
                ...d,
                accounts: d.accounts.map((a) =>
                  a.id === editing.id ? { ...a, archived: !a.archived } : a,
                ),
              }));
              setOpen(false);
            }}
          >
            {editing.archived ? "Restore account" : "Archive account"}
          </Button>
        )}
      </Sheet>
    </Shell>
  );
}
