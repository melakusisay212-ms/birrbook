import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { useBudget, emptyData } from "@/lib/budget/store";
import {
  MONTH_AMHARIC,
  MONTH_NAMES,
  gregorianRange,
  shiftMonth as calendarShiftMonth,
  todayEth,
} from "@/lib/budget/calendar";

const shiftMonth: typeof calendarShiftMonth = (month, offset) => {
  const index = (month.year - 1) * 13 + month.month - 1 + offset;
  return index < 0 || index >= 9999 * 13
    ? month
    : calendarShiftMonth(month, offset);
};

export const C = {
  bg: "#F7F7F2",
  paper: "#FFFFFF",
  ink: "#29382F",
  muted: "#899087",
  green: "#38543F",
  pale: "#EEF2E9",
  line: "#E9ECE3",
  orange: "#C9784B",
  red: "#B7644A",
  gold: "#DCC58E",
};
export const S = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: C.paper,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: C.line,
  },
  title: { fontSize: 21, fontWeight: "600", color: C.ink, letterSpacing: -0.5 },
  label: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  text: { color: C.ink, fontSize: 14, lineHeight: 21 },
  input: {
    borderWidth: 1,
    borderColor: "#DEE3D9",
    backgroundColor: "#FAFBF8",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: C.ink,
    minHeight: 48,
  },
});
export function Icon({
  name,
  size = 20,
  color = C.green,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name as any} size={size} color={color} />;
}
export function Button({
  children,
  onPress,
  secondary,
  small,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  small?: boolean;
  disabled?: boolean;
  icon?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        paddingHorizontal: small ? 14 : 20,
        paddingVertical: small ? 10 : 15,
        minHeight: small ? 40 : 48,
        backgroundColor: secondary ? C.pale : C.green,
        borderRadius: 12,
        opacity: disabled ? 0.4 : pressed ? 0.78 : 1,
      })}
    >
      {icon && (
        <Icon name={icon} size={18} color={secondary ? C.green : "white"} />
      )}
      <Text
        style={{
          fontSize: small ? 13 : 14,
          color: secondary ? C.green : "white",
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={S.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          S.input,
          multiline && { minHeight: 100, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#A0A69C"
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
      />
    </View>
  );
}
export function Sheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(28,43,31,0.38)",
          padding: 18,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 560,
            maxHeight: "92%",
            backgroundColor: C.paper,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <View
            style={[
              S.between,
              { padding: 24, borderBottomWidth: 1, borderColor: C.line },
            ]}
          >
            <Text style={S.title}>{title}</Text>
            <Pressable
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={{ padding: 8 }}
            >
              <Icon name="close-outline" size={24} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 20 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function Confirm({
  visible,
  title,
  detail,
  action,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  detail: string;
  action: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text style={S.text}>{detail}</Text>
      <View style={[S.row, { gap: 10 }]}>
        <Button secondary onPress={onClose}>
          Cancel
        </Button>
        <Button
          onPress={() => {
            onConfirm();
            onClose();
          }}
        >
          {action}
        </Button>
      </View>
    </Sheet>
  );
}
export function Choice({
  selected,
  children,
  onPress,
}: {
  selected: boolean;
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        borderRadius: 10,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: selected ? C.green : C.line,
        backgroundColor: selected ? C.pale : "white",
      }}
    >
      <Text
        style={{
          color: selected ? C.green : "#737B70",
          fontSize: 13,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
const NAV = [
  { path: "/", label: "Overview", icon: "grid-outline" },
  { path: "/calendar", label: "Calendar", icon: "calendar-outline" },
  { path: "/accounts", label: "Accounts", icon: "wallet-outline" },
  { path: "/goals", label: "Goals", icon: "flag-outline" },
  { path: "/loans", label: "Loans", icon: "swap-horizontal-outline" },
  { path: "/settings", label: "More", icon: "ellipsis-horizontal-outline" },
];
export function Shell({
  children,
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { data, ready, storageError, month, setMonth, update } = useBudget();
  const dark = data.preferences.theme === "dark";
  const accent = data.preferences.accent || C.green;
  const [chooseMonth, setChooseMonth] = useState(false);
  const [year, setYear] = useState(String(month.year));
  const [start, setStart] = useState(false);
  const isActive = (p: string) =>
    p === "/" ? path === "/" : path.startsWith(p);
  const nav = (bottom = false) =>
    NAV.map((n) => (
      <Pressable
        key={n.path}
        accessibilityRole="button"
        accessibilityLabel={n.label}
        onPress={() => router.push(n.path as any)}
        style={{
          flex: bottom ? 1 : undefined,
          flexDirection: bottom ? "column" : "row",
          alignItems: "center",
          gap: bottom ? 5 : 13,
          paddingVertical: bottom ? 12 : 15,
          paddingHorizontal: bottom ? 0 : 18,
          borderRadius: 12,
          backgroundColor:
            !bottom && isActive(n.path) ? `${accent}18` : "transparent",
          marginBottom: bottom ? 0 : 7,
        }}
      >
        <Icon
          name={isActive(n.path) ? n.icon.replace("-outline", "") : n.icon}
          size={bottom ? 22 : 20}
          color={isActive(n.path) ? C.green : C.muted}
        />
        <Text
          style={{
            fontSize: bottom ? 10 : 14,
            color: isActive(n.path) ? C.green : C.muted,
            fontWeight: isActive(n.path) ? "600" : "400",
          }}
        >
          {n.label}
        </Text>
      </Pressable>
    ));
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: dark ? "#18231D" : C.bg,
        paddingTop: insets.top,
      }}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        {wide && (
          <View
            style={{
              width: 230,
              backgroundColor: dark ? "#202E25" : "#F0F2EB",
              borderRightWidth: 1,
              borderColor: C.line,
              padding: 24,
            }}
          >
            <Brand />
            <Text
              style={[
                S.label,
                { fontSize: 10, marginTop: 48, marginBottom: 15 },
              ]}
            >
              YOUR MONEY
            </Text>
            {nav()}
            <View style={{ flex: 1 }} />
            <View style={{ gap: 10, paddingBottom: 25 }}>
              <Icon name="leaf-outline" />
              <Text style={{ color: C.green, fontSize: 14, fontWeight: "500" }}>
                Small steps. Better habits.
              </Text>
              <Text style={{ color: C.muted, fontSize: 12, lineHeight: 19 }}>
                A little intention goes a long way.
              </Text>
            </View>
            <View style={[S.row, { gap: 7 }]}>
              <Icon name="lock-closed-outline" size={13} color={C.muted} />
              <Text style={{ color: C.muted, fontSize: 11 }}>
                Stored only on this device
              </Text>
            </View>
          </View>
        )}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: wide ? 42 : 20,
            paddingTop: wide ? 30 : 18,
            paddingBottom: 36,
            maxWidth: 1320,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <View style={[S.between, { marginBottom: wide ? 38 : 28 }]}>
            {wide ? (
              <View style={[S.row, { gap: 8 }]}>
                <Icon name="sunny-outline" size={17} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  Make room for what matters.
                </Text>
              </View>
            ) : (
              <Brand />
            )}
            <View
              style={{
                backgroundColor: `${accent}18`,
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="person-outline" size={18} />
            </View>
          </View>
          {data.demo && (
            <View
              style={[
                S.between,
                {
                  backgroundColor: "#EDF0E6",
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 13,
                  marginBottom: 24,
                  gap: 8,
                },
              ]}
            >
              <Text style={{ color: "#707D60", fontSize: 12 }}>
                You’re exploring sample data
              </Text>
              <Pressable
                onPress={() => setStart(true)}
                accessibilityRole="button"
              >
                <Text
                  style={{ color: C.green, fontSize: 12, fontWeight: "700" }}
                >
                  Start my budget →
                </Text>
              </Pressable>
            </View>
          )}
          {storageError !== "" && (
            <View
              style={{
                padding: 14,
                backgroundColor: "#F8EAE2",
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              <Text style={{ color: C.red, fontSize: 13 }}>{storageError}</Text>
            </View>
          )}
          <View
            style={{
              flexDirection: wide ? "row" : "column",
              justifyContent: "space-between",
              gap: 18,
              marginBottom: 28,
            }}
          >
            <View>
              <Text
                style={{
                  color: C.ink,
                  fontSize: wide ? 34 : 29,
                  fontWeight: "600",
                  letterSpacing: -1.2,
                }}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  style={{
                    color: C.muted,
                    fontSize: 13,
                    marginTop: 9,
                    lineHeight: 20,
                  }}
                >
                  {subtitle}
                </Text>
              )}
            </View>
            <View style={[S.row, { gap: 10, flexWrap: "wrap" }]}>
              <View
                style={[
                  S.row,
                  {
                    backgroundColor: "white",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.line,
                  },
                ]}
              >
                <Pressable
                  accessibilityLabel="Previous Ethiopian month"
                  onPress={() => setMonth(shiftMonth(month, -1))}
                  style={{ padding: 12 }}
                >
                  <Icon name="chevron-back" size={15} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setYear(String(month.year));
                    setChooseMonth(true);
                  }}
                  accessibilityLabel="Choose Ethiopian month"
                  style={{ paddingVertical: 11 }}
                >
                  <Text
                    style={{ color: C.ink, fontSize: 13, fontWeight: "600" }}
                  >
                    {MONTH_NAMES[month.month - 1]} {month.year}{" "}
                    <Text style={{ color: C.muted, fontSize: 10 }}>E.C.</Text>
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Next Ethiopian month"
                  onPress={() => setMonth(shiftMonth(month, 1))}
                  style={{ padding: 12 }}
                >
                  <Icon name="chevron-forward" size={15} />
                </Pressable>
              </View>
              {action}
            </View>
          </View>
          {!ready ? (
            <ActivityIndicator color={C.green} size="large" />
          ) : (
            children
          )}
          <View
            style={[S.row, { justifyContent: "center", gap: 7, marginTop: 28 }]}
          >
            <Icon name="shield-checkmark-outline" color={C.muted} size={13} />
            <Text style={{ color: C.muted, fontSize: 11 }}>
              Your numbers stay yours. No account. No cloud sync.
            </Text>
          </View>
        </ScrollView>
      </View>
      {!wide && (
        <View
          style={[
            S.row,
            {
              backgroundColor: "white",
              borderTopWidth: 1,
              borderColor: C.line,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          {nav(true)}
        </View>
      )}
      <Sheet
        visible={chooseMonth}
        title="Choose your Ethiopian month"
        onClose={() => setChooseMonth(false)}
      >
        <Field label="ETHIOPIAN YEAR" value={year} onChange={setYear} numeric />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {MONTH_NAMES.map((name, i) => (
            <Choice
              key={name}
              selected={month.month === i + 1}
              onPress={() => {
                const y = Number(year);
                if (!Number.isInteger(y) || y < 1 || y > 9999) return;
                setMonth({ year: y, month: i + 1 });
                setChooseMonth(false);
              }}
            >
              {name} · {MONTH_AMHARIC[i]}
            </Choice>
          ))}
        </View>
        <Text style={{ color: C.muted, fontSize: 12 }}>
          {gregorianRange(month)} Gregorian
        </Text>
        <Button
          secondary
          onPress={() => {
            setMonth(todayEth());
            setChooseMonth(false);
          }}
        >
          Return to this month
        </Button>
      </Sheet>
      <Confirm
        visible={start}
        title="Make this budget yours"
        detail="This will remove the labeled sample transactions and budgets. Your own budget starts empty, with categories ready to use."
        action="Start fresh"
        onClose={() => setStart(false)}
        onConfirm={() => update(() => emptyData())}
      />
    </View>
  );
}
export function Brand() {
  return (
    <View style={[S.row, { gap: 9 }]}>
      <View
        style={{
          width: 32,
          height: 32,
          backgroundColor: C.green,
          borderRadius: 9,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="book-outline" color="#F6F2DC" size={19} />
      </View>
      <Text
        style={{
          color: C.ink,
          fontSize: 24,
          fontWeight: "600",
          letterSpacing: -1.2,
        }}
      >
        birrbook<Text style={{ color: "#A1AD87" }}>.</Text>
      </Text>
    </View>
  );
}
