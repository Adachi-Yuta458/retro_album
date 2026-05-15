import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";

type Props = {
  color?: string;
  stripe?: string;
  width?: number;
  height?: number;
  rotation?: number;
  style?: ViewStyle | ViewStyle[];
};

export function WashiTape({
  color = "#e8b8b8",
  stripe = "#ffffff",
  width = 80,
  height = 18,
  rotation = 0,
  style
}: Props) {
  const stripes = Array.from({ length: 4 }).map((_, i) => (
    <View
      key={i}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: i * (height / 4) + height * 0.1,
        height: 1,
        backgroundColor: stripe,
        opacity: 0.6
      }}
    />
  ));
  return (
    <View
      style={[
        styles.tape,
        {
          width,
          height,
          backgroundColor: color,
          transform: [{ rotate: `${rotation}deg` }]
        },
        style
      ]}
    >
      {stripes}
    </View>
  );
}

const styles = StyleSheet.create({
  tape: {
    opacity: 0.92,
    borderRadius: 1
  }
});
