import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { colors } from "./palette";

type HeaderProps = {
  title: string;
  page: string;
  onBack?: () => void;
  onMenu?: () => void;
};

export function SpreadHeader({ title, page, onBack, onMenu }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path d="M15 6 L9 12 L15 18" stroke="#1a1a1a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.page}>{page}</Text>
      </View>
      <Pressable onPress={onMenu} style={styles.iconBtn} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Circle cx="5"  cy="12" r="1.6" fill="#1a1a1a" />
          <Circle cx="12" cy="12" r="1.6" fill="#1a1a1a" />
          <Circle cx="19" cy="12" r="1.6" fill="#1a1a1a" />
        </Svg>
      </Pressable>
    </View>
  );
}

type FooterProps = {
  onTurn?: () => void;
  onPhoto?: () => void;
  onWrite?: () => void;
  onSticker?: () => void;
};

export function SpreadFooter({ onTurn, onPhoto, onWrite, onSticker }: FooterProps) {
  return (
    <View style={styles.footer}>
      <FooterBtn label="めくる" onPress={onTurn} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4 5 L12 5 L20 8 L20 21 L12 18 L4 18 Z" stroke="#1a1a1a" strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="M12 5 L12 18" stroke="#1a1a1a" strokeWidth={1.5} />
        </Svg>
      } />
      <FooterBtn label="しゃしん" onPress={onPhoto} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="6" width="18" height="14" rx="2" stroke="#1a1a1a" strokeWidth={1.5} />
          <Circle cx="12" cy="13" r="3.5" stroke="#1a1a1a" strokeWidth={1.5} />
          <Path d="M8 6 L9.5 4 L14.5 4 L16 6" stroke="#1a1a1a" strokeWidth={1.5} />
        </Svg>
      } />
      <FooterBtn label="かきこみ" onPress={onWrite} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4 20 L4 17 L16 5 L19 8 L7 20 Z" stroke="#1a1a1a" strokeWidth={1.5} strokeLinejoin="round" />
          <Line x1="14" y1="7" x2="17" y2="10" stroke="#1a1a1a" strokeWidth={1.5} />
        </Svg>
      } />
      <FooterBtn label="シール" onPress={onSticker} icon={
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" fill="#1a1a1a" />
        </Svg>
      } />
    </View>
  );
}

function FooterBtn({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", gap: 3, flex: 1 }}>
      {icon}
      <Text style={{ fontSize: 10, color: colors.ink, fontWeight: "500", letterSpacing: 0.3 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)"
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center"
  },
  title: { fontSize: 14, fontWeight: "600", color: colors.ink, letterSpacing: 0.5 },
  page: { fontSize: 10, color: colors.inkSubtle, marginTop: 2 },
  footer: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)"
  }
});
