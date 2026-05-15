import React, { useMemo } from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { palette, PaperKind } from "./palette";

type Props = {
  kind?: PaperKind;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  grain?: number;
};

// Deterministic pseudo-random for paper grain dots
function seed(i: number, salt: number) {
  const x = Math.sin(i * 9876.5421 + salt * 137.31) * 43758.5453;
  return x - Math.floor(x);
}

const GRAIN_DOTS = 360;

function GrainOverlay({ opacity }: { opacity: number }) {
  const dots = useMemo(() => {
    const arr: Array<{ x: number; y: number; r: number; dark: boolean; o: number }> = [];
    for (let i = 0; i < GRAIN_DOTS; i++) {
      arr.push({
        x: seed(i, 1) * 100,
        y: seed(i, 2) * 100,
        r: 0.25 + seed(i, 3) * 0.5,
        dark: seed(i, 4) > 0.5,
        o: 0.18 + seed(i, 5) * 0.42
      });
    }
    return arr;
  }, []);
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents="none"
    >
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.dark ? "#000" : "#fff"} opacity={d.o} />
      ))}
    </Svg>
  );
}

export function PaperBg({ kind = "cream", grain = 0.35, style, children }: Props) {
  const tone = palette[kind];
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[tone.base, tone.base, tone.edge]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <GrainOverlay opacity={grain} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "relative", overflow: "hidden" },
  content: { flex: 1 }
});
