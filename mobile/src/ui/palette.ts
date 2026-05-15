// album-shared.jsx の PALETTES から pastel パレットを React Native へ移植
export type PaperKind = "kraft" | "cream" | "pink" | "mint" | "blue" | "yellow";
export type PaperTone = { base: string; edge: string; dot: string; text: string };

export const PALETTES: Record<string, Record<PaperKind, PaperTone> & { label: string }> = {
  pastel: {
    label: "パステル",
    kraft:  { base: "#fbf2dc", edge: "#ead8b0", dot: "#b89c70", text: "#3a3327" },
    cream:  { base: "#fdf6e4", edge: "#f0e0b8", dot: "#b89c70", text: "#332c20" },
    pink:   { base: "#fbd6d2", edge: "#f4a8a2", dot: "#c86862", text: "#5a2426" },
    mint:   { base: "#d2f0de", edge: "#9adcc0", dot: "#3e9472", text: "#0a4a2e" },
    blue:   { base: "#c8e2f0", edge: "#94c0e0", dot: "#4a7aa0", text: "#1f2a34" },
    yellow: { base: "#fbe898", edge: "#e8c850", dot: "#a8801c", text: "#3a2a0a" }
  }
};

export const palette = PALETTES.pastel;

export const colors = {
  shelfBgTop: "#f1e7d0",
  shelfBgMid: "#e3d4b0",
  shelfBgBot: "#c8b48a",
  woodLight: "#8a6a3e",
  woodDark: "#5a3a1e",
  woodFloor: "#3a2818",
  ink: "#1a1a1a",
  inkDim: "#3a342a",
  inkSubtle: "#8a8378",
  glassBg: "rgba(252,250,244,0.92)",
  glassBorder: "rgba(60,52,42,0.10)"
};

export const cornerPalette = {
  kraft: { base: "#7d4f2a", shade: "#5a3920", highlight: "#9a6e4a" },
  gold:  { base: "#a88243", shade: "#6e5022", highlight: "#d4ae66" },
  black: { base: "#1d1a17", shade: "#000000", highlight: "#3a3530" },
  white: { base: "#f5ecd6", shade: "#c8b88a", highlight: "#ffffff" }
} as const;

export type CornerKind = keyof typeof cornerPalette;

export const themeToPaper = (theme: "A" | "B" | "C"): PaperKind =>
  theme === "A" ? "kraft" : theme === "B" ? "pink" : "mint";

export const themeToCorner = (theme: "A" | "B" | "C"): CornerKind =>
  theme === "A" ? "kraft" : "white";
