"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteWithProfile } from "@coaching/shared";

function complianceColor(pct: number) {
  if (pct >= 80) return "var(--green)";
  if (pct >= 50) return "var(--amber)";
  return "var(--red)";
}

function complianceBg(pct: number) {
  if (pct >= 80) return "var(--green-dim)";
  if (pct >= 50) return "var(--amber-dim)";
  return "var(--red-dim)";
}

export default function AthletesPage(): React.JSX.Element {
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.athletes.list().then(setAthletes).finally(() => setLoading(false));
  }, []);

  const filtered = athletes.filter((a) =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5" style={{ color: "var(--text-3)" }}>
            Roster
          </p>
          <h1
            className="text-[28px] font-bold leading-none tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Athletes
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              style={{ color: "var(--text-3)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search athletes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-[12px] rounded outline-none transition-all w-52"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Count pill */}
          {!loading && (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded font-mono tabular-nums"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}
            >
              {filtered.length}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton />
      ) : athletes.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div
          className="rounded-lg px-8 py-16 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>No athletes match "{search}"</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {/* Column headers */}
          <div
            className="grid px-5 py-2.5"
            style={{
              gridTemplateColumns: "1fr 160px 120px 80px 44px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["Athlete", "Next Race", "7d Compliance", "Flags", ""].map((label, i) => (
              <span
                key={i}
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{
                  color: "var(--text-3)",
                  textAlign: i >= 2 && i < 4 ? "right" : "left",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {filtered.map((a, i) => (
            <AthleteRow key={a.id} athlete={a} last={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function AthleteRow({ athlete, last }: { athlete: AthleteWithProfile; last: boolean }) {
  const initials = athlete.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const pct = athlete.compliance_7d;
  const color = complianceColor(pct);
  const bgColor = complianceBg(pct);

  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className="grid items-center px-5 py-3.5 transition-all duration-150 group"
      style={{
        gridTemplateColumns: "1fr 160px 120px 80px 44px",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {/* Athlete */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center text-[11px] font-bold transition-all duration-150"
          style={{
            background: "var(--surface-3)",
            color: "var(--text-2)",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.03em",
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold truncate transition-colors duration-150" style={{ color: "var(--text-1)" }}>
            {athlete.full_name}
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{athlete.email}</p>
        </div>
      </div>

      {/* Next race */}
      <div className="min-w-0 pr-4">
        {athlete.next_race ? (
          <div>
            <p className="text-[12px] truncate" style={{ color: "var(--text-2)" }}>
              {athlete.next_race.name.length > 20 ? athlete.next_race.name.slice(0, 20) + "…" : athlete.next_race.name}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(athlete.next_race.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          </div>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--text-3)" }}>—</span>
        )}
      </div>

      {/* Compliance */}
      <div className="flex items-center justify-end gap-2.5">
        <div className="h-[3px] w-16 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span
          className="text-[11px] font-bold tabular-nums w-9 text-right"
          style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {pct}%
        </span>
      </div>

      {/* Flags */}
      <div className="flex justify-end">
        {athlete.active_flags > 0 ? (
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              background: bgColor,
              color: "var(--red)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {athlete.active_flags}
          </span>
        ) : (
          <span style={{ color: "var(--text-3)" }}>—</span>
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-end">
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
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="px-5 py-4 animate-pulse flex items-center gap-3"
          style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}
        >
          <div className="h-8 w-8 rounded-md shrink-0" style={{ background: "var(--surface-3)" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-36 rounded" style={{ background: "var(--surface-3)" }} />
            <div className="h-2 w-24 rounded" style={{ background: "var(--surface-3)" }} />
          </div>
          <div className="h-2 w-20 rounded" style={{ background: "var(--surface-3)" }} />
          <div className="h-3 w-10 rounded" style={{ background: "var(--surface-3)" }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-lg px-8 py-20 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-4"
        style={{ background: "var(--surface-3)" }}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--text-3)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
      <p className="text-[13px] font-semibold" style={{ color: "var(--text-2)" }}>No athletes yet</p>
      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>Create an athlete in Supabase and set their coach_id.</p>
    </div>
  );
}
