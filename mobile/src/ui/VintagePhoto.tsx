import React from "react";
import { View, Image, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const SCENE_TINT: Record<string, [string, string, string]> = {
  beach: ["#a8d4e0", "#f4d8a0", "#d8a868"],
  park: ["#a4c08a", "#d4d090", "#7a9460"],
  sunset: ["#f4a868", "#e87a64", "#7a3a4a"],
  kimono: ["#d4a8a0", "#a87060", "#5a3424"],
  newyear: ["#e0a878", "#d4684a", "#7a2e1e"],
  family: ["#c8c0a8", "#a89880", "#5a4a3a"],
  school: ["#c4ccb8", "#a8b094", "#5a604a"],
  snow: ["#e0e8ec", "#c0d0d8", "#7a8088"],
  default: ["#cbb98e", "#a08c66", "#5a4a2a"]
};

type Props = {
  uri?: string | null;
  scene?: string | null;
  width: number;
  height: number;
  rotation?: number;
  fade?: number;
};

export function VintagePhoto({ uri, scene, width, height, rotation = 0, fade = 0.55 }: Props) {
  const tint = SCENE_TINT[scene || "default"] || SCENE_TINT.default;
  return (
    <View
      style={[
        styles.frame,
        { width, height, transform: [{ rotate: `${rotation}deg` }] }
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={tint}
          start={{ x: 0.0, y: 0.0 }}
          end={{ x: 1.0, y: 1.0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* sepia/film fade overlay */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(120,90,60,${0.18 * fade})` }
        ]}
      />
      {/* corner darkening (vignette light) */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0)", "rgba(0,0,0,0.10)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
    borderColor: "rgba(255,255,255,0.5)",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3
  } as ViewStyle
});
