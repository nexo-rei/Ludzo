"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import LudzoLogo from "@/components/layout/LudzoLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("ludzo_admin_token", data.data.token);
        router.push("/admin/dashboard");
      } else {
        setError(data.error ?? "Invalid credentials");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 mb-8">
          <LudzoLogo size={52} />
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-sm text-gray-400">Restricted access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
              className="w-full mt-1.5 px-4 py-3 bg-[#111] border border-[#333] rounded-xl
                         text-white text-sm outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full mt-1.5 px-4 py-3 bg-[#111] border border-[#333] rounded-xl
                         text-white text-sm outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-bold text-sm
                       transition-colors disabled:opacity-60"
          >
            {loading ? "Authenticating…" : "Sign In"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
