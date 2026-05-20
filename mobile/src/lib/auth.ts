import * as SecureStore from "expo-secure-store";

const KEY = "filmy.token";

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(KEY, token);
}

export async function loadToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(KEY);
}
