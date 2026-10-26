import { Stack } from "expo-router";
import { BudgetProvider } from "@/lib/budget/store";
export default function TabLayout() {
  return (
    <BudgetProvider>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </BudgetProvider>
  );
}
