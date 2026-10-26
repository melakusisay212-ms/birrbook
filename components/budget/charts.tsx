import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { C, S } from "./ui";
import { money } from "@/lib/budget/analytics";
import { Category } from "@/lib/budget/types";
export function Donut({
  categories,
  total,
  currency,
}: {
  categories: { category: Category; spent: number }[];
  total: number;
  currency: string;
}) {
  const radius = 68;
  const length = 2 * Math.PI * radius;
  let position = 0;
  return (
    <View
      style={{
        width: 190,
        height: 190,
        alignSelf: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={190}
        height={190}
        viewBox="0 0 190 190"
        accessibilityLabel={`Category spending chart, ${money(total, currency)} total`}
      >
        <Circle
          cx={95}
          cy={95}
          r={radius}
          stroke="#F0F2EA"
          strokeWidth={19}
          fill="none"
        />
        {total > 0 &&
          categories
            .filter((c) => c.spent > 0)
            .map((c) => {
              const size = (c.spent / total) * length;
              const offset = position;
              position += size;
              return (
                <Circle
                  key={c.category.id}
                  cx={95}
                  cy={95}
                  r={radius}
                  fill="none"
                  stroke={c.category.color}
                  strokeWidth={19}
                  strokeDasharray={`${Math.max(size - 3, 0)} ${length - Math.max(size - 3, 0)}`}
                  strokeDashoffset={-offset}
                  rotation={-90}
                  origin="95,95"
                />
              );
            })}
      </Svg>
      <View
        style={{
          position: "absolute",
          alignSelf: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: C.muted, fontSize: 11, marginBottom: 6 }}>
          TOTAL SPENT
        </Text>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: C.ink,
            letterSpacing: -0.5,
          }}
        >
          {money(total, currency)}
        </Text>
      </View>
    </View>
  );
}
export function Trend({
  values,
  currency,
}: {
  values: { label: string; income: number; expenses: number }[];
  currency: string;
}) {
  const [chartWidth, setChartWidth] = React.useState(360);
  const max = Math.max(...values.flatMap((v) => [v.income, v.expenses]), 1);
  const ceiling =
    max > 1000 ? Math.ceil(max / 10000) * 10000 : Math.ceil(max / 100) * 100;
  const y = (n: number) => 155 - (n / ceiling) * 120;
  const x = (i: number) =>
    36 + i * ((chartWidth - 55) / Math.max(values.length - 1, 1));
  const path = (field: "income" | "expenses") =>
    values.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v[field])}`).join(" ");
  return (
    <View
      onLayout={(event) =>
        setChartWidth(Math.max(220, event.nativeEvent.layout.width))
      }
    >
      <Svg
        width="100%"
        height={214}
        viewBox={`0 0 ${chartWidth} 214`}
        accessibilityLabel={`Income and expenses for ${values.length} Ethiopian months in ${currency}`}
      >
        {[0, 1, 2, 3].map((i) => {
          const amount = (ceiling * i) / 3;
          return (
            <React.Fragment key={i}>
              <Line
                x1={36}
                x2={chartWidth - 19}
                y1={y(amount)}
                y2={y(amount)}
                stroke={C.line}
                strokeDasharray="3 5"
              />
              <SvgText x={0} y={y(amount) + 4} fill="#9BA192" fontSize={10}>
                {amount >= 1000
                  ? `${Number((amount / 1000).toFixed(1))}k`
                  : Math.round(amount)}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Path
          d={path("income")}
          fill="none"
          stroke="#648157"
          strokeWidth={2.5}
        />
        <Path
          d={path("expenses")}
          fill="none"
          stroke="#D59A70"
          strokeWidth={2.5}
        />
        {values.map((v, i) => (
          <React.Fragment key={i}>
            <Circle cx={x(i)} cy={y(v.income)} r={3} fill="#648157" />
            <Circle cx={x(i)} cy={y(v.expenses)} r={3} fill="#D59A70" />
            <SvgText
              x={x(i)}
              y={184}
              textAnchor="middle"
              fill="#8A9283"
              fontSize={10}
            >
              {v.label.split(" ")[0].slice(0, 3)}
            </SvgText>
            <SvgText
              x={x(i)}
              y={200}
              textAnchor="middle"
              fill="#A2A99A"
              fontSize={9}
            >
              {v.label.split(" ").slice(1).join(" ")}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
      <View style={[S.row, { justifyContent: "center", gap: 20 }]}>
        {[
          ["#648157", "Income"],
          ["#D59A70", "Expenses"],
        ].map(([color, label]) => (
          <View key={label} style={[S.row, { gap: 6 }]}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: color,
              }}
            />
            <Text style={{ color: C.muted, fontSize: 11 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
