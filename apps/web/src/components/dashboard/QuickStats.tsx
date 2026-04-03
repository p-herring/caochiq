"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TodayResponse } from "@coaching/shared";

export default function QuickStats(): React.JSX.Element {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.today.get().then(setData).finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    {
      label: "Active Athletes",
      value: String(data.athletes.length),
      sub: "on your roster",
      color: "var(--t1)",
    },
    {
      label: "Avg 7d Compliance",
      value: data.athletes.length
        ? `${Math.round(data.athletes.reduce((sum, a) => sum + a.athlete.compliance_7d, 0) / data.athletes.length)}%`
        : "—",
      sub: "last 7 days",
      color: (() => {
        if (!data.athletes.length) return "var(--t3)";
        const avg = data.athletes.reduce((s, a) => s + a.athlete.compliance_7d, 0) / data.athletes.length;
        return avg >= 80 ? "var(--green)" : avg >= 50 ? "var(--amber)" : "var(--red)";
      })(),
    },
    {
      label: "Open Flags",
      value: String(data.open_flags),
      sub: data.open_flags === 0 ? "all clear" : "need attention",
      color: data.open_flags > 0 ? "var(--red)" : "var(--t3)",
    },
    {
      label: "Unread Messages",
      value: String(data.unread_messages),
      sub: "from athletes",
      color: data.unread_messages > 0 ? "var(--accent)" : "var(--t3)",
    },
  ] : Array(4).fill(null);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((stat, i) =>
        loading || !stat ? (
          <div
            key={i}
            className="rounded-lg p-4 animate-pulse"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="h-2.5 w-20 rounded mb-3" style={{ background: "var(--surface-3)" }} />
            <div className="h-7 w-12 rounded" style={{ background: "var(--surface-3)" }} />
          </div>
        ) : (
          <div
            key={i}
            className="rounded-lg p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.12em] mb-2"
              style={{ color: "var(--t3)" }}
            >
              {stat.label}
            </p>
            <p
              className="text-[26px] font-bold leading-none"
              style={{ color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {stat.value}
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--t3)" }}>{stat.sub}</p>
          </div>
        )
      )}
    </div>
  );
}
