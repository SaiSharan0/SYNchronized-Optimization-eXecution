import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { authAPI } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = Cookies.get("access_token");
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authAPI.me();
      setUser(data);
    } catch {
      Cookies.remove("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "lax" });
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "lax" });
    setUser(data.user);
    return data;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const { data } = await authAPI.google(credential);
    Cookies.set("access_token", data.access_token, { expires: 1, sameSite: "lax" });
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    Cookies.remove("access_token");
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((u) => ({ ...u, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
