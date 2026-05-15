import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert
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
import { api, AlbumDTO, PageDTO, PhotoDTO } from "../../src/lib/api";
import { colors, themeToPaper, themeToCorner } from "../../src/ui/palette";
import { SpreadHeader, SpreadFooter } from "../../src/ui/SpreadChrome";
import { SpreadPage } from "../../src/ui/SpreadPage";
import { PageTurner } from "../../src/ui/PageTurner";

const SCREEN = Dimensions.get("window");

export default function AlbumSpread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const albumId = Number(id);

  const [album, setAlbum] = useState<AlbumDTO | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | "idle">("idle");
  const [busyAddingPhoto, setBusyAddingPhoto] = useState(false);
  // When a new photo is added, animate it sliding into the corners.
  const [insertingPhotoId, setInsertingPhotoId] = useState<number | null>(null);
  const insertScale = useSharedValue(0);
  const insertOpacity = useSharedValue(0);

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

  const pageWidth = SCREEN.width;
  // Reserve room for header (~60) and footer (~78) and safe areas
  const pageHeight = SCREEN.height - 60 - 78 - 40;

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

  const onTurnFinished = () => {
    setPageIdx((idx) => (turning === "next" ? idx + 1 : turning === "prev" ? idx - 1 : idx));
    setTurning("idle");
  };

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0e0a06" }} edges={["top", "bottom"]}>
      <SpreadHeader
        title={`${album.title}${album.year ? " · " + album.year : ""}`}
        page={`${currentPage ? currentPage.position : 0} / ${pages.length}`}
        onBack={() => router.back()}
      />

      <View style={[styles.stage, { width: pageWidth, height: pageHeight }]}>
        {turning === "idle" || !targetPage ? (
          currentPage ? (
            <SpreadPage album={album} page={currentPage} width={pageWidth} height={pageHeight} />
          ) : null
        ) : (
          <PageTurner
            width={pageWidth}
            height={pageHeight}
            direction={turning}
            topPage={
              turning === "next" ? (
                currentPage ? <SpreadPage album={album} page={currentPage} width={pageWidth} height={pageHeight} /> : null
              ) : (
                targetPage ? <SpreadPage album={album} page={targetPage} width={pageWidth} height={pageHeight} /> : null
              )
            }
            bottomPage={
              turning === "next" ? (
                targetPage ? <SpreadPage album={album} page={targetPage} width={pageWidth} height={pageHeight} /> : null
              ) : (
                currentPage ? <SpreadPage album={album} page={currentPage} width={pageWidth} height={pageHeight} /> : null
              )
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

      <SpreadFooter
        onTurn={() => turn("next")}
        onPhoto={onAddPhoto}
        onWrite={() => Alert.alert("かきこみ", "次のアップデートで対応します。")}
        onSticker={() => Alert.alert("シール", "次のアップデートで対応します。")}
      />

      {/* prev/next quick tap zones */}
      <View pointerEvents="box-none" style={styles.tapLayer}>
        <View style={{ flex: 1 }} onTouchEnd={() => turn("prev")} />
        <View style={{ flex: 1 }} onTouchEnd={() => turn("next")} />
      </View>

      {/* floating add-page button at end of book */}
      {pageIdx === pages.length - 1 ? (
        <Animated.View style={styles.addPageBtnWrap} pointerEvents="box-none">
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
  tapLayer: {
    position: "absolute",
    top: 60, bottom: 78, left: 0, right: 0,
    flexDirection: "row"
  },
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
    position: "absolute", right: 18, bottom: 110
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
