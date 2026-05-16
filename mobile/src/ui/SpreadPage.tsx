import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { GestureType } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { PaperBg } from "./PaperBg";
import { BindingHoles } from "./BindingHoles";
import { HeldPhoto } from "./HeldPhoto";
import { WashiTape } from "./WashiTape";
import { Sticker, StickerKind } from "./Sticker";
import { DateStamp } from "./DateStamp";
import { CornerKind, PaperKind, themeToCorner, themeToPaper } from "./palette";
import type { PageDTO, AlbumDTO, PhotoDTO } from "../lib/api";

type PhotoItemProps = {
  photo: PhotoDTO;
  album: AlbumDTO;
  left: number;
  top: number;
  w: number;
  h: number;
  cornerKind: CornerKind;
  onPhotoTap?: (photo: PhotoDTO) => void;
  parentTapRef?: React.MutableRefObject<GestureType | undefined>;
};

function PhotoItem({ photo, album, left, top, w, h, cornerKind, onPhotoTap, parentTapRef }: PhotoItemProps) {
  const pressOpacity = useSharedValue(1);

  let photoTap = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onBegin(() => {
      pressOpacity.value = withTiming(0.85, { duration: 80 });
    })
    .onFinalize(() => {
      pressOpacity.value = withTiming(1, { duration: 140 });
    })
    .onEnd((_, success) => {
      if (success) onPhotoTap?.(photo);
    });
  if (parentTapRef) {
    photoTap = photoTap.blocksExternalGesture(parentTapRef);
  }

  const pressedStyle = useAnimatedStyle(() => ({ opacity: pressOpacity.value }));

  const stickerKind = (photo.sticker_kind as StickerKind | null) || null;

  return (
    <GestureDetector gesture={photoTap}>
      <Animated.View style={[{ position: "absolute", left, top, width: w, height: h }, pressedStyle]}>
        {photo.washi_tape_color ? (
          <WashiTape
            color={photo.washi_tape_color}
            width={Math.min(60, w * 0.5)}
            height={14}
            rotation={-8}
            style={{ position: "absolute", top: -7, left: -10, zIndex: 3 }}
          />
        ) : null}
        <HeldPhoto
          uri={photo.image_url}
          scene={photo.scene}
          width={w}
          height={h}
          rotation={photo.rotation || 0}
          cornerKind={(photo.corner_kind as CornerKind) || cornerKind}
          cornerSize={Math.max(12, Math.min(20, w * 0.1))}
          fade={album.theme === "C" ? 0.65 : 0.5}
        />
        {photo.caption ? (
          <Text style={[spreadStyles.caption, captionStyleForTheme(album.theme)]}>
            {photo.caption}
          </Text>
        ) : null}
        {stickerKind ? (
          <View style={{ position: "absolute", right: -14, top: -14, zIndex: 4 }}>
            <Sticker kind={stickerKind} size={32} color={photo.sticker_color || "#f4c834"} />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

type Props = {
  album: AlbumDTO;
  page: PageDTO;
  width: number;
  height: number;
  onPhotoTap?: (photo: PhotoDTO) => void;
  parentTapRef?: React.MutableRefObject<GestureType | undefined>;
};

export function SpreadPage({ album, page, width, height, onPhotoTap, parentTapRef }: Props) {
  const paperKind: PaperKind = (page.paper_kind as PaperKind) || themeToPaper(album.theme);
  const cornerKind: CornerKind = themeToCorner(album.theme);
  // Photos area: leave room for binding (left) and footer (bottom is handled outside)
  const insetLeft = 36;
  const padding = 12;
  const innerW = width - insetLeft - padding;
  const innerH = height - 32;

  return (
    <PaperBg kind={paperKind} style={{ width, height }}>
      <BindingHoles side="left" kind={album.theme === "A" ? "kraft" : "white"} top={18} bottom={28} />

      {/* date stamp (for A theme only, top-right) */}
      {album.theme === "A" && album.year ? (
        <View style={{ position: "absolute", top: 14, right: 16 }}>
          <DateStamp year={album.year} month="JUL" day="16" rotation={-3} />
        </View>
      ) : null}

      {/* title for theme C (top centered) */}
      {album.theme === "C" ? (
        <View style={{ position: "absolute", top: 22, left: 40, right: 16 }}>
          <Text style={spreadStyles.cTitle}>─── {album.year || "1960"} · MAY ───</Text>
        </View>
      ) : null}

      {page.photos.map((photo) => {
        const w = photo.w * innerW;
        const h = photo.h * innerH;
        const left = insetLeft + photo.x * innerW;
        const top = 24 + photo.y * innerH;
        return (
          <PhotoItem
            key={photo.id}
            photo={photo}
            album={album}
            left={left}
            top={top}
            w={w}
            h={h}
            cornerKind={cornerKind}
            onPhotoTap={onPhotoTap}
            parentTapRef={parentTapRef}
          />
        );
      })}

      {/* page number */}
      <Text style={[spreadStyles.pageNumber, pageNumberStyleForTheme(album.theme)]}>
        — {String(page.position).padStart(2, "0")} —
      </Text>
    </PaperBg>
  );
}

function captionStyleForTheme(theme: "A" | "B" | "C") {
  switch (theme) {
    case "A": return { color: "#3a2818", fontStyle: "italic" as const, transform: [{ rotate: "-1deg" }] };
    case "B": return { color: "#5a3a3e", fontWeight: "600" as const, transform: [{ rotate: "-1deg" }] };
    case "C": return { color: "#1a4a32", textAlign: "center" as const };
  }
}

function pageNumberStyleForTheme(theme: "A" | "B" | "C") {
  switch (theme) {
    case "A": return { color: "#a07a3a" };
    case "B": return { color: "#5a3a3e" };
    case "C": return { color: "#2e6a4a" };
  }
}

const spreadStyles = StyleSheet.create({
  cTitle: {
    textAlign: "center",
    fontSize: 13,
    color: "#2e6a4a",
    letterSpacing: 6,
    fontWeight: "600"
  },
  caption: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 180
  },
  pageNumber: {
    position: "absolute",
    bottom: 18,
    right: 22,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "600"
  }
});
