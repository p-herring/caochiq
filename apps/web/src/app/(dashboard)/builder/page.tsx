"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteWithProfile } from "@coaching/shared";

export default function BuilderPage(): React.JSX.Element {
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.athletes.list().then(setAthletes).finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5" style={{ color: "var(--text-3)" }}>
          Training
        </p>
        <h1
          className="text-[28px] font-bold leading-none tracking-tight"
          style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Session Builder
        </h1>
        <p className="text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
          Select an athlete to open their weekly planner and build sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Athlete list */}
        <div className="xl:col-span-2">
          <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
                Jump to athlete planner
              </p>
            </div>

            {loading ? (
              <div>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="px-5 py-4 animate-pulse flex items-center gap-3"
                    style={{ borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}
                  >
                    <div className="h-9 w-9 rounded-md shrink-0" style={{ background: "var(--surface-3)" }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded" style={{ background: "var(--surface-3)" }} />
                      <div className="h-2 w-28 rounded" style={{ background: "var(--surface-3)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : athletes.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No athletes assigned yet.</p>
              </div>
            ) : (
              <div>
                {athletes.map((a, i) => {
                  const initials = a.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const compColor =
                    a.compliance_7d >= 80 ? "var(--green)"
                    : a.compliance_7d >= 50 ? "var(--amber)"
                    : "var(--red)";

                  return (
                    <Link
                      key={a.id}
                      href={`/athletes/${a.id}/planner`}
                      className="flex items-center gap-3.5 px-5 py-3.5 transition-all duration-150 group"
                      style={{ borderBottom: i < athletes.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <div
                        className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center text-[12px] font-bold transition-all duration-150"
                        style={{
                          background: "var(--surface-3)",
                          color: "var(--text-2)",
                          fontFamily: "'Barlow Condensed', sans-serif",
                        }}
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                          {a.full_name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{a.email}</p>
                      </div>

                      {/* Compliance indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-[3px] w-12 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${a.compliance_7d}%`, background: compColor }}
                          />
                        </div>
                        <span
                          className="text-[11px] font-bold tabular-nums w-8 text-right"
                          style={{ color: compColor, fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {a.compliance_7d}%
                        </span>
                      </div>

                      {/* Open planner badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                        >
                          Open
                        </span>
                        <svg
                          className="h-3.5 w-3.5 transition-all duration-150 group-hover:translate-x-0.5"
                          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                          style={{ color: "var(--text-3)" }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Templates coming soon */}
        <div className="space-y-4">
          {/* Templates card */}
          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border-2)",
            }}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
              style={{ background: "var(--surface-3)" }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--text-3)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>
              Workout Templates
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Build reusable templates with intervals, sets, and rest blocks. Apply to any athlete in one click.
            </p>
            <div
              className="mt-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded inline-block"
              style={{ background: "var(--surface-3)", color: "var(--text-3)" }}
            >
              Coming soon
            </div>
          </div>

          {/* AI generation tease */}
          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--border-2)",
            }}
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center mb-4"
              style={{ background: "var(--accent-dim)" }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>
              AI Plan Generation
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Generate a full training block from athlete history, goals, and race calendar automatically.
            </p>
            <div
              className="mt-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded inline-block"
              style={{ background: "var(--surface-3)", color: "var(--text-3)" }}
            >
              Coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
