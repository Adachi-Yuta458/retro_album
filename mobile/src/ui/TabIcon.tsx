import React from "react";
import Svg, { Path, Circle, Line, Polygon } from "react-native-svg";

export type TabIconKind = "book" | "plus" | "search" | "user";

export function TabIcon({ kind, color, size = 22 }: { kind: TabIconKind; color: string; size?: number }) {
  switch (kind) {
    case "book":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 5 L12 7 L20 5 L20 19 L12 21 L4 19 Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
          <Line x1="12" y1="7" x2="12" y2="21" stroke={color} strokeWidth={1.4} />
        </Svg>
      );
    case "plus":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.6} />
          <Line x1="12" y1="7" x2="12" y2="17" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1="7" y1="12" x2="17" y2="12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case "search":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="6" stroke={color} strokeWidth={1.6} />
          <Line x1="15.5" y1="15.5" x2="20" y2="20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
    case "user":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="9" r="3.5" stroke={color} strokeWidth={1.6} />
          <Path d="M5 20 C5 16 8 14 12 14 C16 14 19 16 19 20" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      );
  }
}
