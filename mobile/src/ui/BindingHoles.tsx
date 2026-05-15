import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

type Props = {
  side?: "left" | "right";
  kind?: "kraft" | "white" | "brass";
  top?: number;
  bottom?: number;
};

export function BindingHoles({ side = "left", kind = "kraft", top = 20, bottom = 60 }: Props) {
  const colors = {
    kraft: { hole: "#3a2818", ring: "#7d4f2a", shine: "#9a6e4a" },
    white: { hole: "#3a2818", ring: "#f8efd2", shine: "#ffffff" },
    brass: { hole: "#0a0908", ring: "#a88243", shine: "#d4ae66" }
  }[kind];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.column,
        { top, bottom },
        side === "left" ? { left: 8 } : { right: 8 }
      ]}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.hole}>
          <Svg width={18} height={18} viewBox="0 0 18 18">
            <Defs>
              <RadialGradient id={`ring${kind}${i}`} cx="0.35" cy="0.30" r="0.7">
                <Stop offset="0" stopColor={colors.shine} />
                <Stop offset="0.5" stopColor={colors.ring} />
                <Stop offset="1" stopColor={colors.hole} />
              </RadialGradient>
            </Defs>
            <Circle cx="9" cy="9" r="9" fill={`url(#ring${kind}${i})`} />
            <Circle cx="9" cy="9" r="3.5" fill={colors.hole} />
          </Svg>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    position: "absolute",
    width: 22,
    alignItems: "center",
    justifyContent: "space-around"
  },
  hole: { width: 18, height: 18 }
});
