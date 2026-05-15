import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { TabIcon, TabIconKind } from "../../src/ui/TabIcon";
import { colors } from "../../src/ui/palette";

const TABS: Record<string, { label: string; icon: TabIconKind }> = {
  index:  { label: "アルバム",   icon: "book" },
  new:    { label: "あたらしく", icon: "plus" },
  search: { label: "さがす",     icon: "search" },
  me:     { label: "わたし",     icon: "user" }
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const meta = TABS[route.name] || { label: route.name, icon: "book" as TabIconKind };
        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: { paddingVertical: 6 },
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: "#aaa39a",
          tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.5, fontWeight: "500" },
          tabBarIcon: ({ color }) => <TabIcon kind={meta.icon} color={color} size={22} />,
          title: meta.label
        };
      }}
    />
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: Platform.OS === "ios" ? 24 : 12,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(252,250,244,0.95)",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10
  }
});
