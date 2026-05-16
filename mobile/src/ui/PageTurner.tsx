import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { PaperKind } from "./palette";
import { PaperBg } from "./PaperBg";

type Props = {
  width: number;
  height: number;
  direction: "next" | "prev" | "idle";
  onFinished?: () => void;
  topPage: React.ReactNode;     // the visible page that will fold away (next) or fold in (prev)
  bottomPage: React.ReactNode;  // the page revealed underneath
  frontPaperKind: PaperKind;    // paper color used as the back of the flipping page
};

const DURATION = 850;
const MAX_ANGLE = 180;

export function PageTurner({
  width, height, direction, onFinished, topPage, bottomPage, frontPaperKind
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (direction === "idle") {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.bezier(0.32, 0.72, 0, 1) },
      (finished) => {
        if (finished && onFinished) runOnJS(onFinished)();
      }
    );
  }, [direction, onFinished, progress]);

  const flipStyle = useAnimatedStyle(() => {
    if (direction === "idle") {
      return {
        transform: [{ perspective: 1400 }, { rotateY: "0deg" }],
        shadowOpacity: 0,
        shadowOffset: { width: 0, height: 4 }
      };
    }
    const angle = direction === "next"
      ? -progress.value * MAX_ANGLE
      : -(1 - progress.value) * MAX_ANGLE;
    const shadowOpacity = 0.4 * Math.sin(progress.value * Math.PI);
    return {
      transform: [
        { perspective: 1400 },
        { rotateY: `${angle}deg` }
      ],
      shadowOpacity,
      shadowOffset: { width: 8 * progress.value, height: 4 }
    };
  });

  const foldShadowStyle = useAnimatedStyle(() => {
    if (direction === "idle") return { opacity: 0, width: 0 };
    return {
      opacity: Math.sin(progress.value * Math.PI),
      width: width * 0.4 * progress.value
    };
  });

  return (
    <View style={{ width, height }}>
      {/* bottom (revealed) page */}
      <View style={StyleSheet.absoluteFill}>{bottomPage}</View>

      {/* fold shadow over bottom page — left-edge anchored, width grows with progress */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden" },
          foldShadowStyle
        ]}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* flipping page: front (content) + back (paper color) */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transformOrigin: "left center",
            shadowColor: "#000",
            shadowRadius: 24
          },
          flipStyle
        ]}
      >
        {/* front face — visible at angle 0, hidden after 90° */}
        <View style={[StyleSheet.absoluteFill, { backfaceVisibility: "hidden" }]}>
          {topPage}
        </View>
        {/* back face — paper-textured (base color + paper noise), rotated 180° in-place; visible after 90° */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backfaceVisibility: "hidden",
              transform: [{ rotateY: "180deg" }]
            }
          ]}
        >
          <PaperBg kind={frontPaperKind} style={StyleSheet.absoluteFillObject} />
        </View>
      </Animated.View>
    </View>
  );
}
