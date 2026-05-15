import React from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { AlbumSummary } from "../lib/api";

type Props = {
  album: AlbumSummary;
  index: number;
  onPress?: () => void;
};

export function AlbumSpine({ album, index, onPress }: Props) {
  const w = 70 + (index % 3) * 4;
  const h = 188 + ((index * 7) % 22);
  const tilt = index % 5 === 1 ? -1.5 : index % 5 === 3 ? 1.2 : 0;
  const decoColor = album.spine_deco === "gold" ? "#e8c878" : "#dcd6c4";
  const lineColor = album.spine_deco === "gold" ? "#d4ae66" : "#c8c4b8";
  return (
    <Pressable onPress={onPress} style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <View
        style={[
          styles.shadow,
          { width: w, height: h }
        ]}
      >
        <LinearGradient
          colors={[album.spine_cloth_color, album.spine_color, album.spine_color, album.spine_cloth_color]}
          locations={[0, 0.08, 0.92, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.spine}
        >
          {/* cloth weave grid */}
          <View pointerEvents="none" style={styles.weave}>
            {Array.from({ length: Math.ceil(h / 3) }).map((_, i) => (
              <View
                key={`h${i}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: i * 3,
                  height: 1,
                  backgroundColor: "rgba(0,0,0,0.06)"
                }}
              />
            ))}
          </View>
          {/* top + bottom rules */}
          <View style={[styles.rule, { top: 14, backgroundColor: lineColor }]} />
          <View style={[styles.rule, { bottom: 14, backgroundColor: lineColor }]} />
          {/* vertical title */}
          <View style={styles.titleWrap}>
            {album.title.split("").map((ch, i) => (
              <Text key={i} style={[styles.titleChar, { color: decoColor }]}>{ch}</Text>
            ))}
          </View>
          {/* year on bottom */}
          {album.year ? (
            <Text style={[styles.year, { color: lineColor }]}>{album.year}</Text>
          ) : null}
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: "#2a1605",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 6
  } as ViewStyle,
  spine: {
    flex: 1,
    borderRadius: 3,
    overflow: "hidden",
    paddingHorizontal: 6
  },
  weave: { position: "absolute", inset: 0 as any, top: 0, left: 0, right: 0, bottom: 0 },
  rule: {
    position: "absolute",
    left: 6,
    right: 6,
    height: 1
  },
  titleWrap: {
    position: "absolute",
    top: 28,
    left: 0,
    right: 0,
    alignItems: "center"
  },
  titleChar: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 2,
    lineHeight: 16
  },
  year: {
    position: "absolute",
    bottom: 18,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1
  }
});
