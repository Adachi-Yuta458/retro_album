import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api, AlbumSummary } from "../../src/lib/api";
import { colors } from "../../src/ui/palette";

export default function Search() {
  const [query, setQuery] = useState("");
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const router = useRouter();

  useEffect(() => {
    api.albums().then((r) => setAlbums(r.albums)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle || "").toLowerCase().includes(q) ||
        (a.year || "").includes(q)
    );
  }, [albums, query]);

  return (
    <LinearGradient colors={[colors.shelfBgTop, colors.shelfBgMid]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ padding: 22 }}>
          <Text style={styles.eyebrow}>SEARCH</Text>
          <Text style={styles.title}>さがす</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="タイトル・副題・年"
            placeholderTextColor="#aaa"
            style={styles.input}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 140 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/album/${item.id}`)} style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: item.spine_color, borderColor: item.spine_cloth_color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{[item.subtitle, item.year].filter(Boolean).join(" · ")}</Text>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, color: colors.inkSubtle, letterSpacing: 4, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 28, color: colors.ink, fontWeight: "700", letterSpacing: 1.5, marginBottom: 14 },
  input: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder
  },
  swatch: { width: 30, height: 30, borderRadius: 4, borderWidth: 2 },
  rowTitle: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  rowSub: { fontSize: 12, color: colors.inkDim, marginTop: 2 }
});
