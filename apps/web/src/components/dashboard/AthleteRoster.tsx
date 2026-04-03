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

export default function AthleteRoster(): React.JSX.Element {
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.athletes.list().then(setAthletes).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--t3)" }}
        >
          Athlete Roster
        </h2>
        <Link
          href="/athletes"
          className="text-[11px] transition-colors"
          style={{ color: "var(--t3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t2)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
        >
          View all →
        </Link>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="grid px-4 py-2"
          style={{ gridTemplateColumns: "1fr 130px 90px 60px", borderBottom: "1px solid var(--border)" }}
        >
          {["Athlete", "Next Race", "7d", "Flags"].map((h, i) => (
            <span
              key={h}
              className="text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--t3)", textAlign: i >= 2 ? "right" : "left" }}
            >
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 animate-pulse"
              style={{ borderBottom: i < 3 ? "1px solid var(--border)" : "none" }}
            >
              <div className="h-7 w-7 rounded-md shrink-0" style={{ background: "var(--surface-3)" }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-32 rounded" style={{ background: "var(--surface-3)" }} />
                <div className="h-2 w-20 rounded" style={{ background: "var(--surface-3)" }} />
              </div>
            </div>
          ))
        ) : athletes.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[12px]" style={{ color: "var(--t3)" }}>No athletes yet.</p>
          </div>
        ) : (
          athletes.slice(0, 6).map((a, i) => {
            const initials = a.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const color = complianceColor(a.compliance_7d);
            return (
              <Link
                key={a.id}
                href={`/athletes/${a.id}`}
                className="grid items-center px-4 py-3 transition-all duration-100 group"
                style={{
                  gridTemplateColumns: "1fr 130px 90px 60px",
                  borderBottom: i < athletes.slice(0, 6).length - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-7 w-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "var(--surface-3)", color: "var(--t2)", fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--t1)" }}>{a.full_name}</p>
                    <p className="text-[10px] truncate" style={{ color: "var(--t3)" }}>{a.email}</p>
                  </div>
                </div>
                <div className="min-w-0 pr-2">
                  {a.next_race ? (
                    <div>
                      <p className="text-[11px] truncate" style={{ color: "var(--t2)" }}>{a.next_race.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--t3)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(a.next_race.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  ) : (
                    <span style={{ color: "var(--t3)" }}>—</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-[3px] w-10 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                    <div className="h-full rounded-full" style={{ width: `${a.compliance_7d}%`, background: color }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums w-7 text-right" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
                    {a.compliance_7d}%
                  </span>
                </div>
                <div className="text-right">
                  {a.active_flags > 0 ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--red-dim)", color: "var(--red)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {a.active_flags}
                    </span>
                  ) : (
                    <span style={{ color: "var(--t3)" }}>—</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
