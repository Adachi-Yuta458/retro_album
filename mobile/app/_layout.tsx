import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SessionProvider, useSession } from "../src/lib/session";
import { View, ActivityIndicator } from "react-native";
import { colors } from "../src/ui/palette";

function AuthGate() {
  const { state } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "loading") return;
    const first = segments[0] as string | undefined;
    const inAuthGroup = first === "(auth)";
    if (state.status === "anonymous" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (state.status === "authed" && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [state.status, segments, router]);

  if (state.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fbf2dc" }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SessionProvider>
          <AuthGate />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
