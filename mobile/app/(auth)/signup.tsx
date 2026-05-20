import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "../../src/lib/session";
import { colors } from "../../src/ui/palette";

export default function Signup() {
  const { signup } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signup(email.trim(), password, name.trim());
    } catch (e: any) {
      const detail = e?.body?.details?.[0] || "登録できませんでした";
      setErr(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.shelfBgTop, colors.shelfBgMid, colors.shelfBgBot]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: 24 }}
      >
        <Text style={styles.eyebrow}>NEW MEMBER</Text>
        <Text style={styles.title}>はじめまして</Text>
        <Text style={styles.subtitle}>あなたのアルバムを作りましょう</Text>

        <View style={styles.field}>
          <Text style={styles.label}>お名前</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="光子" placeholderTextColor="#aaa" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>メール</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#aaa"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>パスワード</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="6文字以上"
            placeholderTextColor="#aaa"
          />
        </View>

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Pressable disabled={busy} onPress={submit} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>はじめる</Text>}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>ログインに戻る</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, color: colors.inkSubtle, letterSpacing: 4, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 32, color: colors.ink, fontWeight: "700", letterSpacing: 2 },
  subtitle: { fontSize: 13, color: colors.inkDim, marginBottom: 28, marginTop: 4 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: colors.inkDim, marginBottom: 6, letterSpacing: 1 },
  input: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink
  },
  err: { color: "#a82a48", marginTop: 6, marginBottom: 6 },
  primaryBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16, letterSpacing: 2 },
  secondaryBtn: { marginTop: 14, alignItems: "center" },
  secondaryBtnText: { color: colors.inkDim, fontSize: 13, letterSpacing: 1 }
});
