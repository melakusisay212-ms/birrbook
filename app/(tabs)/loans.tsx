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
import { loanProgress, totalLoanRemaining } from "@/lib/budget/extended";
import { Loan, LoanKind, PALETTE } from "@/lib/budget/types";
import { money } from "@/lib/budget/analytics";
export default function Loans() {
  const { data, update } = useBudget();
  const [open, setOpen] = useState(false);
  const [payment, setPayment] = useState<Loan>();
  const [editing, setEditing] = useState<Loan>();
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [remaining, setRemaining] = useState("");
  const [kind, setKind] = useState<LoanKind>("borrowed");
  const [contact, setContact] = useState("");
  const [due, setDue] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const openForm = (l?: Loan) => {
    setEditing(l);
    setName(l?.name ?? "");
    setPrincipal(String(l?.principal ?? ""));
    setRemaining(String(l?.remaining ?? l?.principal ?? ""));
    setKind(l?.kind ?? "borrowed");
    setContact(l?.contact ?? "");
    setDue(l?.dueDate ? l.dueDate : "");
    setError("");
    setOpen(true);
  };
  const save = () => {
    const p = Number(principal),
      r = Number(remaining);
    if (
      !name.trim() ||
      !Number.isFinite(p) ||
      p <= 0 ||
      !Number.isFinite(r) ||
      r < 0 ||
      r > p
    )
      return setError(
        "Enter a name, a principal, and remaining amount between zero and principal.",
      );
    const loan: Loan = {
      id: editing?.id ?? newId(),
      name: name.trim(),
      kind,
      principal: p,
      remaining: r,
      contact: contact.trim(),
      dueDate: due.trim() || undefined,
      createdDate:
        editing?.createdDate ?? new Date().toISOString().slice(0, 10),
    };
    update((d) => ({
      ...d,
      loans: editing
        ? d.loans.map((x) => (x.id === loan.id ? loan : x))
        : [...d.loans, loan],
    }));
    setOpen(false);
  };
  const pay = () => {
    const n = Number(amount);
    if (!payment || !Number.isFinite(n) || n <= 0)
      return setError("Enter a positive payment.");
    update((d) => ({
      ...d,
      loans: d.loans.map((l) =>
        l.id === payment.id
          ? { ...l, remaining: Math.max(0, l.remaining - n) }
          : l,
      ),
    }));
    setPayment(undefined);
    setAmount("");
    setError("");
  };
  return (
    <Shell
      title="Loans & debt, in plain sight."
      subtitle="Track what you owe and what is owed to you. No judgement, just clarity."
      action={
        <Button small icon="add-outline" onPress={() => openForm()}>
          Add loan
        </Button>
      }
    >
      <View style={{ gap: 20 }}>
        <View style={[S.card, { backgroundColor: "#EEF2E9", gap: 8 }]}>
          <Text style={S.label}>TOTAL STILL OUTSTANDING</Text>
          <Text style={{ color: C.green, fontSize: 32, fontWeight: "600" }}>
            {money(totalLoanRemaining(data.loans), data.currency)}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>
            Across {data.loans.length} tracked{" "}
            {data.loans.length === 1 ? "loan" : "loans"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {data.loans.map((loan) => {
            const pct = loanProgress(loan);
            return (
              <View
                key={loan.id}
                style={[S.card, { flexGrow: 1, minWidth: 280, gap: 15 }]}
              >
                <View style={S.between}>
                  <View style={[S.row, { gap: 9 }]}>
                    <Icon
                      name={
                        loan.kind === "borrowed"
                          ? "arrow-down-circle-outline"
                          : "arrow-up-circle-outline"
                      }
                      color={loan.kind === "borrowed" ? C.orange : "#708B56"}
                    />
                    <View>
                      <Text
                        style={{
                          color: C.ink,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        {loan.name}
                      </Text>
                      <Text
                        style={{ color: C.muted, fontSize: 11, marginTop: 3 }}
                      >
                        {loan.kind === "borrowed" ? "I owe" : "Owed to me"}
                        {loan.contact ? ` · ${loan.contact}` : ""}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => openForm(loan)}>
                    <Icon name="create-outline" color={C.muted} size={16} />
                  </Pressable>
                </View>
                <View style={S.between}>
                  <Text
                    style={{ color: C.ink, fontSize: 21, fontWeight: "600" }}
                  >
                    {money(loan.remaining, data.currency)}{" "}
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: "400",
                      }}
                    >
                      remaining
                    </Text>
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>
                    of {money(loan.principal, data.currency)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 7,
                    backgroundColor: "#EEF0E9",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 7,
                      width: `${pct}%`,
                      backgroundColor:
                        loan.kind === "borrowed" ? C.orange : "#708B56",
                    }}
                  />
                </View>
                <View style={[S.between, { gap: 8 }]}>
                  <Text
                    style={{
                      color: pct >= 100 ? C.green : C.muted,
                      fontSize: 12,
                    }}
                  >
                    {pct >= 100 ? "Paid in full" : `${pct}% repaid`}
                  </Text>
                  {pct < 100 && (
                    <Button
                      small
                      secondary
                      onPress={() => {
                        setPayment(loan);
                        setAmount("");
                        setError("");
                      }}
                    >
                      Record payment
                    </Button>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        {!data.loans.length && (
          <View
            style={[
              S.card,
              { alignItems: "center", gap: 12, paddingVertical: 40 },
            ]}
          >
            <Icon name="swap-horizontal-outline" size={34} color="#ADBA9E" />
            <Text style={S.title}>No loans tracked yet.</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>
              Add a borrowed or lent amount so it doesn’t live only in your
              head.
            </Text>
          </View>
        )}
      </View>
      <Sheet
        visible={open}
        title={editing ? "Edit loan" : "Add a loan or debt"}
        onClose={() => setOpen(false)}
      >
        <Field
          label="NAME"
          value={name}
          onChange={setName}
          placeholder="e.g. Family loan"
        />
        <View style={[S.row, { gap: 8 }]}>
          <Choice
            selected={kind === "borrowed"}
            onPress={() => setKind("borrowed")}
          >
            I owe
          </Choice>
          <Choice selected={kind === "lent"} onPress={() => setKind("lent")}>
            Owed to me
          </Choice>
        </View>
        <Field
          label="ORIGINAL AMOUNT"
          value={principal}
          onChange={setPrincipal}
          numeric
          placeholder="0"
        />
        <Field
          label="REMAINING AMOUNT"
          value={remaining}
          onChange={setRemaining}
          numeric
          placeholder="0"
        />
        <Field
          label="PERSON / ORGANIZATION (OPTIONAL)"
          value={contact}
          onChange={setContact}
          placeholder="e.g. Hana"
        />
        <Field
          label="DUE DATE · ETHIOPIAN YYYY-MM-DD (OPTIONAL)"
          value={due}
          onChange={setDue}
          placeholder="2019-04-15"
        />
        {error && <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>}
        <Button onPress={save}>Save loan</Button>
      </Sheet>
      <Sheet
        visible={Boolean(payment)}
        title="Record a repayment"
        onClose={() => setPayment(undefined)}
      >
        <Text style={S.text}>
          How much did you repay toward {payment?.name}?
        </Text>
        <Field
          label={`PAYMENT · ${data.currency}`}
          value={amount}
          onChange={setAmount}
          numeric
          placeholder="0"
        />
        {error && <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>}
        <Button onPress={pay}>Save repayment</Button>
      </Sheet>
    </Shell>
  );
}
