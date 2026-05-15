import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, UserDTO } from "./api";
import { clearToken, loadToken, saveToken } from "./auth";

type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authed"; user: UserDTO };

type Ctx = {
  state: SessionState;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    const token = await loadToken();
    if (!token) {
      setState({ status: "anonymous" });
      return;
    }
    try {
      const me = (await api.me()) as { user: UserDTO };
      setState({ status: "authed", user: me.user });
    } catch {
      await clearToken();
      setState({ status: "anonymous" });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = (await api.login(email, password)) as { token: string; user: UserDTO };
    await saveToken(res.token);
    setState({ status: "authed", user: res.user });
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const res = (await api.signup(email, password, name)) as { token: string; user: UserDTO };
    await saveToken(res.token);
    setState({ status: "authed", user: res.user });
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    await clearToken();
    setState({ status: "anonymous" });
  }, []);

  const value = useMemo(() => ({ state, login, signup, logout, refresh }), [state, login, signup, logout, refresh]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
