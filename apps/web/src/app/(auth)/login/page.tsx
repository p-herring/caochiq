"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<"login" | "signup">("login");
  const [sent, setSent]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-full max-w-sm rounded-xl px-8 py-10 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "var(--green-dim)" }}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: "var(--green)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--t1)" }}>Check your email</p>
          <p className="text-[13px]" style={{ color: "var(--t3)" }}>
            We sent a confirmation link to <span style={{ color: "var(--t2)" }}>{email}</span>. Click it to activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#0C0C0F">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span
            className="text-[20px] font-bold"
            style={{ color: "var(--t1)", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            CoachIQ
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-xl px-8 py-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h1
            className="text-[18px] font-bold mb-1"
            style={{ color: "var(--t1)", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-[12px] mb-7" style={{ color: "var(--t3)" }}>
            {mode === "login" ? "Sign in to your coaching dashboard" : "Get started with CoachIQ"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "var(--t3)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none transition-all"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--t1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: "var(--t3)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md px-3 py-2.5 text-[13px] outline-none transition-all"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--t1)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <div
                className="text-[12px] px-3 py-2.5 rounded-md"
                style={{ background: "var(--red-dim)", color: "var(--red)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-[13px] font-semibold transition-all disabled:opacity-50 mt-2"
              style={{ background: "var(--accent)", color: "#0C0C0F" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="text-[12px] transition-colors"
              style={{ color: "var(--t3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t2)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
