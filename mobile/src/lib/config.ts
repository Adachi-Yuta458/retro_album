import { Platform } from "react-native";

// iOS シミュレータからは `localhost` が自分自身を指してしまうので、
// docker compose でホスト 3000 にバインドされたバックエンドへ届くよう
// 環境ごとにフォールバックする。
// 実機で動かしたいときは EXPO_PUBLIC_API_URL を上書きする。
const fallback = (() => {
  if (Platform.OS === "ios") return "http://localhost:3000";
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://localhost:3000";
})();

export const API_URL = process.env.EXPO_PUBLIC_API_URL || fallback;
