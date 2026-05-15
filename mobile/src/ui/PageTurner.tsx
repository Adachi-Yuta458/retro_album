import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type Props = {
  width: number;
  height: number;
  direction: "next" | "prev" | "idle";
  onFinished?: () => void;
  topPage: React.ReactNode;     // the visible page (will fold away on next, slide on prev)
  bottomPage: React.ReactNode;  // the page revealed underneath
};

const DURATION = 700;

export function PageTurner({ width, height, direction, onFinished, topPage, bottomPage }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (direction === "idle") {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.bezier(0.4, 0, 0.2, 1) },
      (finished) => {
        if (finished && onFinished) runOnJS(onFinished)();
      }
    );
  }, [direction, onFinished, progress]);

  const topStyle = useAnimatedStyle(() => {
    if (direction === "idle") return { opacity: 1 };
    const angle = direction === "next" ? -progress.value * 160 : -(1 - progress.value) * 160;
    const shadowOpacity = 0.4 * Math.sin(progress.value * Math.PI);
    return {
      transform: [
        { perspective: 1400 },
        { rotateY: `${angle}deg` }
      ],
      shadowOpacity
    };
  });

  return (
    <View style={{ width, height }}>
      <View style={StyleSheet.absoluteFill}>{bottomPage}</View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transformOrigin: "left center",
            shadowColor: "#000",
            shadowOffset: { width: 8, height: 4 },
            shadowRadius: 24
          },
          topStyle
        ]}
      >
        {topPage}
      </Animated.View>
    </View>
  );
}
