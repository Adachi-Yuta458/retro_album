import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "./palette";

type Props = {
  current: number;
  total: number;
};

export function PageIndicator({ current, total }: Props) {
  const showDots = total > 0 && total <= 8;
  return (
    <View style={styles.wrap}>
      {showDots ? (
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i + 1 === current ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      ) : null}
      <Text style={styles.text}>{current} / {total} べーじ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: "rgba(255,255,255,0.85)"
  },
  dots: {
    flexDirection: "row",
    marginBottom: 3
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 3
  },
  dotActive: {
    backgroundColor: colors.ink
  },
  dotInactive: {
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: "transparent"
  },
  text: {
    fontSize: 11,
    color: colors.inkSubtle,
    letterSpacing: 0.6,
    fontFamily: fonts.serif
  }
});
