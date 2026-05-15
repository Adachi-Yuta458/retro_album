import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/lib/api";
import { colors } from "../../src/ui/palette";

const THEMES: { key: "A" | "B" | "C"; label: string; spine: string; cloth: string; deco: "gold" | "silver" }[] = [
  { key: "A", label: "A · クラフト紙",  spine: "#f0a890", cloth: "#d88670", deco: "gold" },
  { key: "B", label: "B · 色画用紙",    spine: "#f5c0d0", cloth: "#e090ac", deco: "gold" },
  { key: "C", label: "C · ミント台紙",  spine: "#bee4d2", cloth: "#84c8a8", deco: "silver" }
];

export default function New() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [year, setYear] = useState("");
  const [theme, setTheme] = useState<"A" | "B" | "C">("A");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return Alert.alert("タイトルを入れてください");
    setBusy(true);
    try {
      const meta = THEMES.find((t) => t.key === theme)!;
      const res = await api.createAlbum({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        year: year.trim() || undefined,
        theme,
        spine_color: meta.spine,
        spine_cloth_color: meta.cloth,
        spine_deco: meta.deco
      });
      router.replace(`/album/${res.album.id}`);
    } catch (e: any) {
      Alert.alert("作成に失敗しました", e?.body?.details?.[0] || "");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.shelfBgTop, colors.shelfBgMid]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 140 }}>
          <Text style={styles.eyebrow}>NEW ALBUM</Text>
          <Text style={styles.title}>新しい思い出</Text>

          <Text style={styles.label}>タイトル</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="家族のきろく"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.label}>副題</Text>
          <TextInput
            style={styles.input}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="春夏秋冬"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.label}>年</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={setYear}
            placeholder="1984"
            keyboardType="number-pad"
            placeholderTextColor="#aaa"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>台紙のテーマ</Text>
          <View style={{ gap: 10 }}>
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTheme(t.key)}
                  style={[styles.themeRow, active && styles.themeRowActive]}
                >
                  <View style={[styles.swatch, { backgroundColor: t.spine, borderColor: t.cloth }]} />
                  <Text style={[styles.themeLabel, active && { color: "#fff" }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable disabled={busy} onPress={submit} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>棚に並べる</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, color: colors.inkSubtle, letterSpacing: 4, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 28, color: colors.ink, fontWeight: "700", letterSpacing: 1.5, marginBottom: 18 },
  label: { fontSize: 12, color: colors.inkDim, marginTop: 12, marginBottom: 6, letterSpacing: 1 },
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
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: 12
  },
  themeRowActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 2
  },
  themeLabel: { fontSize: 15, color: colors.ink, fontWeight: "500" },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center"
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16, letterSpacing: 2 }
});
