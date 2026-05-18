import { API_URL } from "./config";
import { loadToken } from "./auth";

export type ApiError = { status: number; body: any };

async function request(path: string, init: RequestInit = {}) {
  const token = await loadToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined)
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const err: ApiError = { status: res.status, body };
    throw err;
  }
  return body;
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}

export type UserDTO = { id: number; email: string; name: string };
export type AlbumSummary = {
  id: number;
  title: string;
  subtitle: string | null;
  year: string | null;
  category: string | null;
  theme: "A" | "B" | "C";
  spine_color: string;
  spine_cloth_color: string;
  spine_deco: "gold" | "silver";
  page_count: number;
  updated_at: string;
};
export type PhotoDTO = {
  id: number;
  caption: string | null;
  scene: string | null;
  x: number; y: number; w: number; h: number; rotation: number;
  corner_kind: "kraft" | "gold" | "white" | "black";
  washi_tape_color: string | null;
  sticker_kind: string | null;
  sticker_color: string | null;
  image_url: string | null;
};
export type PageDTO = {
  id: number;
  position: number;
  paper_kind: "kraft" | "cream" | "pink" | "mint" | "blue" | "yellow";
  title: string | null;
  photos: PhotoDTO[];
};
export type AlbumDTO = AlbumSummary & { pages: PageDTO[] };

export const api = {
  signup: (email: string, password: string, name: string) =>
    request("/signup", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/me"),
  logout: () => request("/logout", { method: "DELETE" }),
  albums: (): Promise<{ albums: AlbumSummary[] }> => request("/albums"),
  album: (id: number): Promise<{ album: AlbumDTO }> => request(`/albums/${id}`),
  createAlbum: (data: Partial<AlbumSummary>): Promise<{ album: AlbumDTO }> =>
    request("/albums", { method: "POST", body: JSON.stringify(data) }),
  createPage: (albumId: number, data: { position?: number; paper_kind?: string; title?: string }): Promise<{ page: PageDTO }> =>
    request(`/albums/${albumId}/pages`, { method: "POST", body: JSON.stringify(data) }),
  uploadPhoto: async (pageId: number, image: { uri: string; name: string; type: string }, fields: Partial<PhotoDTO> = {}) => {
    const form = new FormData();
    // @ts-expect-error RN FormData accepts blob-like
    form.append("image", { uri: image.uri, name: image.name, type: image.type });
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, String(v));
    });
    return request(`/pages/${pageId}/photos`, { method: "POST", body: form }) as Promise<{ photo: PhotoDTO }>;
  },
  updatePhoto: (id: number, patch: Pick<PhotoDTO, "caption">): Promise<{ photo: PhotoDTO }> =>
    request(`/photos/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
};
