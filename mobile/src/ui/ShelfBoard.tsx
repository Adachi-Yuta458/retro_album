import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "./palette";

export function ShelfBoard({ style }: { style?: ViewStyle | ViewStyle[] }) {
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={[colors.woodLight, colors.woodDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.plank}
      />
      <View style={styles.shadowEdge} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -8, marginBottom: 16 } as ViewStyle,
  plank: {
    height: 12,
    borderRadius: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6
  },
  shadowEdge: {
    height: 4,
    backgroundColor: "#3a2818"
  }
});
