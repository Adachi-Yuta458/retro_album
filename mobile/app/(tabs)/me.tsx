import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/lib/session";
import { colors } from "../../src/ui/palette";

export default function Me() {
  const { state, logout } = useSession();
  const user = state.status === "authed" ? state.user : null;
  return (
    <LinearGradient colors={[colors.shelfBgTop, colors.shelfBgMid]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24 }} edges={["top"]}>
        <Text style={styles.eyebrow}>PROFILE</Text>
        <Text style={styles.title}>わたし</Text>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.name || "—"}</Text>
          <Text style={styles.email}>{user?.email || ""}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={() => logout()}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, color: colors.inkSubtle, letterSpacing: 4, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 28, color: colors.ink, fontWeight: "700", letterSpacing: 1.5, marginBottom: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 4
  },
  name: { fontSize: 18, color: colors.ink, fontWeight: "600" },
  email: { fontSize: 13, color: colors.inkDim },
  logoutBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder
  },
  logoutText: { fontSize: 14, color: colors.ink, fontWeight: "500", letterSpacing: 1 }
});
