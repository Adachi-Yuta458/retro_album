import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";
import { api, AlbumSummary } from "../../src/lib/api";
import { colors } from "../../src/ui/palette";
import { AlbumSpine } from "../../src/ui/AlbumSpine";
import { ShelfBoard } from "../../src/ui/ShelfBoard";

const CATEGORIES = [
  { key: "all",    label: "すべて" },
  { key: "family", label: "家族" },
  { key: "travel", label: "旅" },
  { key: "event",  label: "イベント" },
  { key: "old",    label: "古いもの" }
];

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export default function Home() {
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    const res = await api.albums();
    setAlbums(res.albums);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const filtered = (albums || []).filter((a) => {
    if (category === "all") return true;
    if (category === "old") return a.year && parseInt(a.year, 10) < 1975;
    return a.category === category;
  });

  const rows = chunk(filtered, 3);

  return (
    <LinearGradient
      colors={[colors.shelfBgTop, colors.shelfBgMid, colors.shelfBgBot]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MY ALBUM</Text>
            <Text style={styles.title}>Filmy</Text>
          </View>
          <Pressable style={styles.pill} onPress={() => router.push("/(tabs)/new")}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Line x1="12" y1="5" x2="12" y2="19" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
              <Line x1="5" y1="12" x2="19" y2="12" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
            </Svg>
            <Text style={styles.pillText}>作る</Text>
          </Pressable>
        </View>

        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {albums === null ? (
            <View style={{ paddingTop: 60, alignItems: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>このカテゴリのアルバムはまだありません。</Text>
            </View>
          ) : (
            rows.map((row, ri) => {
              const startIdx = ri * 3;
              return (
                <View key={ri}>
                  <View style={styles.shelfRow}>
                    {row.map((album, i) => (
                      <AlbumSpine
                        key={album.id}
                        album={album}
                        index={startIdx + i}
                        onPress={() => router.push(`/album/${album.id}`)}
                      />
                    ))}
                  </View>
                  <ShelfBoard />
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  eyebrow: { fontSize: 10, color: colors.inkSubtle, letterSpacing: 3, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 28, color: colors.ink, fontWeight: "700", letterSpacing: 1.5 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: colors.glassBorder
  },
  pillText: { fontSize: 13, color: colors.ink, fontWeight: "500" },
  chipsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 22,
    paddingBottom: 8,
    flexWrap: "wrap"
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: colors.glassBorder
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  chipText: { fontSize: 12, color: colors.inkDim, fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  shelfRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
    paddingLeft: 4,
    paddingBottom: 6
  },
  empty: {
    marginTop: 60,
    alignItems: "center"
  },
  emptyText: {
    fontSize: 13,
    color: colors.inkDim,
    textAlign: "center"
  }
});
