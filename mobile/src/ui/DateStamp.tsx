import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  year?: string;
  month?: string;
  day?: string;
  color?: string;
  rotation?: number;
};

export function DateStamp({
  year = "1984",
  month = "JUL",
  day = "16",
  color = "#c8606c",
  rotation = -3
}: Props) {
  return (
    <View style={[styles.wrap, { borderColor: color, transform: [{ rotate: `${rotation}deg` }] }]}>
      <Text style={[styles.month, { color }]}>{month}</Text>
      <Text style={[styles.day, { color }]}>{day}</Text>
      <Text style={[styles.year, { color }]}>{year}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: "center",
    opacity: 0.85
  },
  month: { fontSize: 9, fontWeight: "700", letterSpacing: 2 },
  day: { fontSize: 18, fontWeight: "700", lineHeight: 20 },
  year: { fontSize: 9, fontWeight: "600", letterSpacing: 1 }
});
