import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  LayoutChangeEvent
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { GestureType } from "react-native-gesture-handler";
import { api, AlbumDTO, PageDTO, PhotoDTO } from "../../src/lib/api";
import { colors, themeToPaper, themeToCorner, PaperKind } from "../../src/ui/palette";
import { SpreadHeader, SpreadFooter } from "../../src/ui/SpreadChrome";
import { SpreadPage } from "../../src/ui/SpreadPage";
import { PageTurner } from "../../src/ui/PageTurner";
import { PageIndicator } from "../../src/ui/PageIndicator";

export default function AlbumSpread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const goBackToShelf = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, [router]);

  const albumId = Number(id);

  const [album, setAlbum] = useState<AlbumDTO | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | "idle">("idle");
  const [busyAddingPhoto, setBusyAddingPhoto] = useState(false);
  // When a new photo is added, animate it sliding into the corners.
  const [insertingPhotoId, setInsertingPhotoId] = useState<number | null>(null);
  const insertScale = useSharedValue(0);
  const insertOpacity = useSharedValue(0);
  const parentTapRef = useRef<GestureType | undefined>(undefined);

  const load = useCallback(async () => {
    const res = await api.album(albumId);
    setAlbum(res.album);
  }, [albumId]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const pages: PageDTO[] = album?.pages || [];
  const currentPage = pages[pageIdx];
  const targetPage = useMemo(() => {
    if (turning === "next") return pages[pageIdx + 1];
    if (turning === "prev") return pages[pageIdx - 1];
    return null;
  }, [pages, pageIdx, turning]);

  const flippingPage =
    turning === "next" ? currentPage :
    turning === "prev" ? targetPage :
    null;
  const flippingPaperKind: PaperKind =
    (flippingPage?.paper_kind as PaperKind) || themeToPaper(album?.theme || "A");

  const [indicatorH, setIndicatorH] = useState(36);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const onStageLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStageSize((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height }
    );
  }, []);

  const turn = (dir: "next" | "prev") => {
    if (turning !== "idle") return;
    const next = dir === "next" ? pageIdx + 1 : pageIdx - 1;
    if (next < 0 || next >= pages.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    setTurning(dir);
  };

  const SWIPE_DISTANCE_FACTOR = 0.25;
  const SWIPE_VELOCITY = 500;

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      const dxThreshold = stageSize.w * SWIPE_DISTANCE_FACTOR;
      if (e.translationX < -dxThreshold || e.velocityX < -SWIPE_VELOCITY) {
        turn("next");
      } else if (e.translationX > dxThreshold || e.velocityX > SWIPE_VELOCITY) {
        turn("prev");
      }
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .withRef(parentTapRef)
    .onEnd((e, success) => {
      if (!success) return;
      if (e.x < stageSize.w / 2) turn("prev");
      else turn("next");
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const onTurnFinished = useCallback(() => {
    setPageIdx((idx) => (turning === "next" ? idx + 1 : turning === "prev" ? idx - 1 : idx));
    setTurning("idle");
  }, [turning]);

  const onAddPhoto = async () => {
    if (!album || !currentPage) return;
    if (busyAddingPhoto) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("写真の許可", "写真ライブラリへのアクセスを許可してください。");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
      exif: false
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];

    setBusyAddingPhoto(true);
    try {
      // pick a random-ish position so multiple photos don't stack exactly
      const xs = currentPage.photos.length;
      const x = 0.1 + (xs % 2) * 0.4 + Math.random() * 0.05;
      const y = 0.12 + Math.floor(xs / 2) * 0.35 + Math.random() * 0.05;
      const rotation = (Math.random() - 0.5) * 4;

      const uploaded = await api.uploadPhoto(
        currentPage.id,
        { uri: asset.uri, name: asset.fileName || "photo.jpg", type: asset.mimeType || "image/jpeg" },
        {
          x,
          y,
          w: 0.42,
          h: 0.32,
          rotation,
          corner_kind: themeToCorner(album.theme) as PhotoDTO["corner_kind"],
          washi_tape_color: album.theme === "B" ? "#f4c834" : album.theme === "A" ? "#7ac8e0" : null
        } as Partial<PhotoDTO>
      );

      const newPhoto = uploaded.photo;
      setAlbum((a) => {
        if (!a) return a;
        return {
          ...a,
          pages: a.pages.map((p) =>
            p.id === currentPage.id ? { ...p, photos: [...p.photos, newPhoto] } : p
          )
        };
      });

      // play the insert animation
      setInsertingPhotoId(newPhoto.id);
      insertScale.value = 1.6;
      insertOpacity.value = 0;
      insertScale.value = withSequence(
        withTiming(1.6, { duration: 0 }),
        withTiming(1.0, { duration: 320, easing: Easing.out(Easing.cubic) })
      );
      insertOpacity.value = withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200 })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setInsertingPhotoId(null), 700);
    } catch (e: any) {
      Alert.alert("追加に失敗しました", e?.body?.error || "");
    } finally {
      setBusyAddingPhoto(false);
    }
  };

  const onPhotoTap = useCallback((photo: PhotoDTO) => {
    if (turning !== "idle") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    // Alert.prompt is iOS-only; spec accepts this trade-off (iOS-only app per README). Android requires a modal sheet — see spec §3-2.
    Alert.prompt(
      "かきこみ",
      "写真へのひとこと",
      [
        { text: "やめる", style: "cancel" },
        {
          text: "ほぞん",
          onPress: async (text?: string) => {
            const next = (text ?? "").trim();
            try {
              await api.updatePhoto(photo.id, { caption: next || null });
            } catch (e: any) {
              Alert.alert("ほぞんに失敗しました", e?.body?.error || "");
              return;
            }
            setAlbum((a) => {
              if (!a) return a;
              return {
                ...a,
                pages: a.pages.map((p) => ({
                  ...p,
                  photos: p.photos.map((ph) =>
                    ph.id === photo.id ? { ...ph, caption: next || null } : ph
                  )
                }))
              };
            });
          }
        }
      ],
      "plain-text",
      photo.caption || ""
    );
  }, [turning]);

  const onAddPage = async () => {
    if (!album) return;
    try {
      const res = await api.createPage(album.id, {
        position: (album.pages.at(-1)?.position || 0) + 1,
        paper_kind: themeToPaper(album.theme)
      });
      setAlbum({ ...album, pages: [...album.pages, { ...res.page, photos: [] }] });
      setPageIdx(album.pages.length);
    } catch {}
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: insertOpacity.value,
    transform: [{ scale: insertScale.value }]
  }));

  if (!album) {
    return (
      <LinearGradient colors={[colors.shelfBgTop, colors.shelfBgMid]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.ink} />
      </LinearGradient>
    );
  }

  const renderSpread = (page: PageDTO) => (
    <SpreadPage
      album={album}
      page={page}
      width={stageSize.w}
      height={stageSize.h}
      onPhotoTap={onPhotoTap}
      parentTapRef={parentTapRef}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0e0a06" }} edges={["top", "bottom"]}>
      <SpreadHeader
        title={`${album.title}${album.year ? " · " + album.year : ""}`}
        onBack={goBackToShelf}
      />

      {/* Stage fills the residual area between header and indicator. SpreadPage is tuned for portrait aspect (app.json locks orientation). */}
      <View style={{ flex: 1 }} onLayout={onStageLayout}>
        <GestureDetector gesture={composedGesture}>
          {stageSize.h > 0 ? (
            <View style={[styles.stage, { width: stageSize.w, height: stageSize.h }]}>
              {turning === "idle" || !targetPage ? (
                currentPage ? renderSpread(currentPage) : null
              ) : (
                <PageTurner
                  width={stageSize.w}
                  height={stageSize.h}
                  direction={turning}
                  frontPaperKind={flippingPaperKind}
                  topPage={
                    turning === "next"
                      ? (currentPage ? renderSpread(currentPage) : null)
                      : (targetPage ? renderSpread(targetPage) : null)
                  }
                  bottomPage={
                    turning === "next"
                      ? (targetPage ? renderSpread(targetPage) : null)
                      : (currentPage ? renderSpread(currentPage) : null)
                  }
                  onFinished={onTurnFinished}
                />
              )}

              {/* "photo dropping into corners" overlay flash on insert */}
              {insertingPhotoId && currentPage ? (
                <Animated.View pointerEvents="none" style={[styles.insertOverlay, overlayStyle]}>
                  <View style={styles.insertChip}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#f4c834" }} />
                  </View>
                </Animated.View>
              ) : null}
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colors.ink} />
            </View>
          )}
        </GestureDetector>
      </View>

      <PageIndicator
        onLayout={(e) => setIndicatorH(e.nativeEvent.layout.height)}
        current={currentPage ? currentPage.position : 0}
        total={pages.length}
      />

      <SpreadFooter
        onBackToShelf={goBackToShelf}
        onPhoto={onAddPhoto}
        onWrite={() => Alert.alert("かきこみ", "写真をタップしてかきこみできます。")}
        onSticker={() => Alert.alert("シール", "次のアップデートで対応します。")}
      />

      {/* floating add-page button at end of book */}
      {pageIdx === pages.length - 1 ? (
        <Animated.View style={[styles.addPageBtnWrap, { bottom: 78 + indicatorH + 10 }]} pointerEvents="box-none">
          <View onTouchEnd={onAddPage} style={styles.addPageBtn}>
            <View style={styles.addPageInner} />
            <View style={[styles.addPageInner, styles.addPageVertical]} />
          </View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: "center", backgroundColor: "#0e0a06" },
  insertOverlay: {
    position: "absolute",
    top: "30%",
    alignSelf: "center"
  },
  insertChip: {
    width: 80, height: 80, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)"
  },
  addPageBtnWrap: {
    // bottom is intentionally omitted here; it is supplied inline as
    // (78 + indicatorH + 10) so it tracks the measured PageIndicator height.
    position: "absolute", right: 18
  },
  addPageBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#1a1a1a",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8
  },
  addPageInner: {
    position: "absolute",
    width: 18, height: 2, backgroundColor: "#fff"
  },
  addPageVertical: {
    width: 2, height: 18
  }
});
