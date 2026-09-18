"use client";

import { useCallback, useEffect, useState } from "react";

export interface AdminUser {
  id: string;
  username: string;
  /** "admin" = full panel, "moderator" = limited panel */
  role: string;
}

const TOKEN_KEY = "ludzo_admin_token";
const USER_KEY = "ludzo_admin_user";

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function isModeratorUser(user: AdminUser | null): boolean {
  return String(user?.role ?? "").toLowerCase() === "moderator";
}

export function saveAdminSession(token: string, user: AdminUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

function readCachedUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminUser;
    if (!parsed || typeof parsed.role !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Logged-in staff account (admin ya moderator).
 *
 * Login ke waqt `ludzo_admin_user` cache ho jata hai; agar cache missing ho
 * (purani session) to GET /api/admin/auth ("me") se hydrate karte hain.
 * Asli protection hamesha server-side hai — ye sirf UI (nav/badge) ke liye.
 */
export function useAdminUser() {
  const [user, setUser] = useState<AdminUser | null>(() => readCachedUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const cached = readCachedUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch("/api/admin/auth", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          clearAdminSession();
          return null;
        }
        const data = await res.json();
        return data?.success ? (data.data as AdminUser) : null;
      })
      .then((me) => {
        if (cancelled || !me) return;
        try {
          window.localStorage.setItem(USER_KEY, JSON.stringify(me));
        } catch {
          /* ignore */
        }
        setUser(me);
      })
      .catch(() => {
        /* silent — pages apna 401 redirect khud karti hain */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();
  }, []);

  return { user, loading, logout };
}
