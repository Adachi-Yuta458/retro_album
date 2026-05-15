import React from "react";
import { View, StyleSheet } from "react-native";
import { VintagePhoto } from "./VintagePhoto";
import { CornerHolder } from "./CornerHolder";
import { CornerKind } from "./palette";

type Props = {
  uri?: string | null;
  scene?: string | null;
  width: number;
  height: number;
  rotation?: number;
  cornerKind?: CornerKind;
  cornerSize?: number;
  fade?: number;
};

export function HeldPhoto({
  uri,
  scene,
  width,
  height,
  rotation = 0,
  cornerKind = "kraft",
  cornerSize = 16,
  fade = 0.5
}: Props) {
  return (
    <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <View style={{ width, height }}>
        <VintagePhoto uri={uri} scene={scene} width={width} height={height} fade={fade} />
        <CornerHolder pos="tl" size={cornerSize} kind={cornerKind} />
        <CornerHolder pos="tr" size={cornerSize} kind={cornerKind} />
        <CornerHolder pos="bl" size={cornerSize} kind={cornerKind} />
        <CornerHolder pos="br" size={cornerSize} kind={cornerKind} />
      </View>
    </View>
  );
}
