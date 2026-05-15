import React from "react";
import Svg, { Circle, Path, G, Polygon } from "react-native-svg";

export type StickerKind = "sun" | "flower" | "heart" | "cherry" | "star";

type Props = {
  kind: StickerKind;
  size?: number;
  color?: string;
};

export function Sticker({ kind, size = 28, color = "#f0648a" }: Props) {
  const c = size / 2;
  switch (kind) {
    case "sun":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="5" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
            <Polygon
              key={i}
              points="12,1 13,7 11,7"
              fill={color}
              transform={`rotate(${a} 12 12)`}
            />
          ))}
        </Svg>
      );
    case "flower":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          {[0, 60, 120, 180, 240, 300].map((a, i) => (
            <Circle key={i} cx="12" cy="6" r="3.5" fill={color} opacity={0.85} transform={`rotate(${a} 12 12)`} />
          ))}
          <Circle cx="12" cy="12" r="3" fill="#ffd86a" />
        </Svg>
      );
    case "heart":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10z"
            fill={color}
          />
        </Svg>
      );
    case "cherry":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M8 14a4 4 0 1 0 0 1z" fill={color} />
          <Circle cx="8" cy="17" r="4" fill={color} />
          <Circle cx="15" cy="17" r="4" fill={color} />
          <Path d="M8 13 Q10 6 16 5" stroke="#5a3a1e" strokeWidth="1.4" fill="none" />
          <Path d="M15 13 Q15 8 16 5" stroke="#5a3a1e" strokeWidth="1.4" fill="none" />
        </Svg>
      );
    case "star":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polygon
            points="12,2 14.4,8.6 21.5,8.6 15.8,12.9 18.1,19.5 12,15.4 5.9,19.5 8.2,12.9 2.5,8.6 9.6,8.6"
            fill={color}
          />
        </Svg>
      );
  }
}
