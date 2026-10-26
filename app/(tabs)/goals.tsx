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
import { goalProgress } from "@/lib/budget/extended";
import { Goal, PALETTE } from "@/lib/budget/types";
import { money } from "@/lib/budget/analytics";
export default function Goals() {
  const { data, update } = useBudget();
  const [open, setOpen] = useState(false);
  const [contribute, setContribute] = useState<Goal>();
  const [editing, setEditing] = useState<Goal>();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(PALETTE[3]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const openForm = (g?: Goal) => {
    setEditing(g);
    setName(g?.name ?? "");
    setTarget(String(g?.target ?? ""));
    setSaved(String(g?.saved ?? 0));
    setDeadline(g?.deadline ?? "");
    setNote(g?.note ?? "");
    setColor(g?.color ?? PALETTE[3]);
    setError("");
    setOpen(true);
  };
  const save = () => {
    const t = Number(target),
      s = Number(saved);
    if (
      !name.trim() ||
      !Number.isFinite(t) ||
      t <= 0 ||
      !Number.isFinite(s) ||
      s < 0
    )
      return setError(
        "Enter a name, a target, and a saved amount of zero or more.",
      );
    const goal: Goal = {
      id: editing?.id ?? newId(),
      name: name.trim(),
      target: t,
      saved: s,
      color,
      deadline: deadline.trim() || undefined,
      note: note.trim() || undefined,
    };
    update((d) => ({
      ...d,
      goals: editing
        ? d.goals.map((x) => (x.id === goal.id ? goal : x))
        : [...d.goals, goal],
    }));
    setOpen(false);
  };
  const add = () => {
    const n = Number(amount);
    if (!contribute || !Number.isFinite(n) || n <= 0)
      return setError("Enter a positive contribution.");
    update((d) => ({
      ...d,
      goals: d.goals.map((g) =>
        g.id === contribute.id
          ? { ...g, saved: Math.min(g.target, g.saved + n) }
          : g,
      ),
    }));
    setContribute(undefined);
    setAmount("");
    setError("");
  };
  return (
    <Shell
      title="Give your money somewhere to go."
      subtitle="Savings goals turn good intentions into visible progress."
      action={
        <Button small icon="add-outline" onPress={() => openForm()}>
          New goal
        </Button>
      }
    >
      <View style={{ gap: 20 }}>
        <View style={[S.card, { backgroundColor: "#38543F" }]}>
          <Text style={{ color: "#C6D3BB", fontSize: 11, letterSpacing: 1 }}>
            SAVED TOWARD YOUR GOALS
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
              data.goals.reduce((s, g) => s + g.saved, 0),
              data.currency,
            )}
          </Text>
          <Text style={{ color: "#C6D3BB", fontSize: 12, marginTop: 6 }}>
            of{" "}
            {money(
              data.goals.reduce((s, g) => s + g.target, 0),
              data.currency,
            )}{" "}
            across {data.goals.length} goals
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {data.goals.map((goal) => {
            const pct = goalProgress(goal);
            return (
              <View
                key={goal.id}
                style={[S.card, { flexGrow: 1, minWidth: 280, gap: 16 }]}
              >
                <View style={S.between}>
                  <View style={[S.row, { gap: 11 }]}>
                    <View
                      style={{
                        width: 39,
                        height: 39,
                        borderRadius: 12,
                        backgroundColor: `${goal.color}20`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="flag-outline" color={goal.color} />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: C.ink,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        {goal.name}
                      </Text>
                      <Text
                        style={{ color: C.muted, fontSize: 11, marginTop: 4 }}
                      >
                        {goal.deadline
                          ? `Target ${goal.deadline}`
                          : "No deadline"}
                        {goal.note ? ` · ${goal.note}` : ""}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={() => openForm(goal)}>
                    <Icon name="create-outline" color={C.muted} size={16} />
                  </Pressable>
                </View>
                <View style={S.between}>
                  <Text
                    style={{ color: C.ink, fontSize: 22, fontWeight: "600" }}
                  >
                    {money(goal.saved, data.currency)}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>
                    of {money(goal.target, data.currency)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    backgroundColor: "#EFF1E9",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: 8,
                      width: `${pct}%`,
                      backgroundColor: goal.color,
                    }}
                  />
                </View>
                <View style={S.between}>
                  <Text
                    style={{
                      color: pct >= 100 ? C.green : C.muted,
                      fontSize: 12,
                    }}
                  >
                    {pct >= 100 ? "Goal reached" : `${pct}% complete`}
                  </Text>
                  {pct < 100 && (
                    <Button
                      small
                      secondary
                      onPress={() => {
                        setContribute(goal);
                        setAmount("");
                        setError("");
                      }}
                    >
                      Add savings
                    </Button>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        {!data.goals.length && (
          <View
            style={[
              S.card,
              { alignItems: "center", gap: 12, paddingVertical: 40 },
            ]}
          >
            <Icon name="flag-outline" size={34} color="#ADBA9E" />
            <Text style={S.title}>Give your first goal a name.</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>
              Emergency cushion, school fees, a new phone—whatever matters to
              you.
            </Text>
          </View>
        )}
      </View>
      <Sheet
        visible={open}
        title={editing ? "Edit savings goal" : "Create a savings goal"}
        onClose={() => setOpen(false)}
      >
        <Field
          label="GOAL NAME"
          value={name}
          onChange={setName}
          placeholder="e.g. Emergency cushion"
        />
        <Field
          label={`TARGET · ${data.currency}`}
          value={target}
          onChange={setTarget}
          numeric
          placeholder="0"
        />
        <Field
          label={`ALREADY SAVED · ${data.currency}`}
          value={saved}
          onChange={setSaved}
          numeric
          placeholder="0"
        />
        <Field
          label="DEADLINE · ETHIOPIAN YYYY-MM-DD (OPTIONAL)"
          value={deadline}
          onChange={setDeadline}
          placeholder="2019-13-05"
        />
        <Field
          label="NOTE (OPTIONAL)"
          value={note}
          onChange={setNote}
          placeholder="Why this matters"
        />
        <Text style={S.label}>GOAL COLOR</Text>
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
        <Button onPress={save}>Save goal</Button>
      </Sheet>
      <Sheet
        visible={Boolean(contribute)}
        title="Add to your savings"
        onClose={() => setContribute(undefined)}
      >
        <Text style={S.text}>
          How much are you setting aside for {contribute?.name}?
        </Text>
        <Field
          label={`CONTRIBUTION · ${data.currency}`}
          value={amount}
          onChange={setAmount}
          numeric
          placeholder="0"
        />
        {error && <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>}
        <Button onPress={add}>Add contribution</Button>
      </Sheet>
    </Shell>
  );
}
