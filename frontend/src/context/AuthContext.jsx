import { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await api.get("/me");
      setUser(response.data.user);
    } catch (error) {
      console.error("Authentication check failed:", error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post("/login", { email, password });
    const { access_token, refresh_token, user } = response.data;
    localStorage.setItem("access_token", access_token);
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.get("/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  useEffect(() => { checkUser(); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
