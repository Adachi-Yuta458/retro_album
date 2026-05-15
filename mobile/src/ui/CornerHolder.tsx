import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Polygon, Defs, LinearGradient, Stop } from "react-native-svg";
import { cornerPalette, CornerKind } from "./palette";

type Pos = "tl" | "tr" | "bl" | "br";

type Props = {
  pos: Pos;
  size?: number;
  kind?: CornerKind;
};

export function CornerHolder({ pos, size = 18, kind = "kraft" }: Props) {
  const p = cornerPalette[kind];
  // Polygon points (in a `size`x`size` viewBox) per corner
  const points: Record<Pos, string> = {
    tl: `0,0 ${size},0 0,${size}`,
    tr: `0,0 ${size},0 ${size},${size}`,
    bl: `0,0 0,${size} ${size},${size}`,
    br: `${size},0 ${size},${size} 0,${size}`
  };
  const anchor: Record<Pos, any> = {
    tl: { top: 0, left: 0 },
    tr: { top: 0, right: 0 },
    bl: { bottom: 0, left: 0 },
    br: { bottom: 0, right: 0 }
  };
  return (
    <View pointerEvents="none" style={[styles.holder, { width: size, height: size }, anchor[pos]]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={`g${pos}${kind}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.highlight} />
            <Stop offset="0.4" stopColor={p.base} />
            <Stop offset="1" stopColor={p.shade} />
          </LinearGradient>
        </Defs>
        <Polygon points={points[pos]} fill={`url(#g${pos}${kind})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { position: "absolute" }
});
