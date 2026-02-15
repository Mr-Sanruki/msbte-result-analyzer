"use client";

import * as React from "react";

import { api } from "@/lib/api";

type Teacher = {
  id: string;
  name: string;
  email: string;
  role: "teacher";
};

type AuthContextValue = {
  teacher: Teacher | null;
  token: string | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: "teacher";
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "msbte_rm_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [teacher, setTeacher] = React.useState<Teacher | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  React.useEffect(() => {
    async function hydrate() {
      if (!token) {
        setTeacher(null);
        return;
      }

      try {
        const res = await api.get("/auth/me");
        setTeacher(res.data.teacher);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setTeacher(null);
      }
    }

    hydrate();
  }, [token]);

  async function login(input: { email: string; password: string }) {
    const res = await api.post("/auth/login", input);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setTeacher(res.data.teacher);
  }

  async function register(input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: "teacher";
  }) {
    const res = await api.post("/auth/register", input);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setTeacher(res.data.teacher);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setTeacher(null);
  }

  const value: AuthContextValue = {
    teacher,
    token,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
