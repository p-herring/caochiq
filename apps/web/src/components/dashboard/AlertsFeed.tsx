"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Insight } from "@coaching/shared";

const SEV_CFG = {
  critical: { bar: "var(--red)",   text: "var(--red)",   label: "Critical" },
  warning:  { bar: "var(--amber)", text: "var(--amber)", label: "Warning" },
  info:     { bar: "var(--blue)",  text: "var(--blue)",  label: "Info" },
} as const;

const TYPE_LABEL: Record<string, string> = {
  compliance: "Compliance", missed_sessions: "Missed", fatigue: "Fatigue",
  weight_trend: "Weight", overtraining: "Overtraining", race_approaching: "Race",
};

export default function AlertsFeed(): React.JSX.Element {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.insights.list().then(setInsights).finally(() => setLoading(false));
  }, []);

  function dismiss(id: string) {
    setInsights((p) => p.filter((i) => i.id !== id));
    api.insights.dismiss(id);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--t3)" }}>
          Alerts
        </h2>
        {insights.length > 0 && (
          <span
            className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: "var(--red-dim)", color: "var(--red)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {insights.length}
          </span>
        )}
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse flex gap-3" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <div className="w-0.5 rounded shrink-0 h-10" style={{ background: "var(--surface-3)" }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-16 rounded" style={{ background: "var(--surface-3)" }} />
                <div className="h-2.5 w-full rounded" style={{ background: "var(--surface-3)" }} />
              </div>
            </div>
          ))
        ) : insights.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ background: "var(--green-dim)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ color: "var(--green)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-[12px] font-medium" style={{ color: "var(--green)" }}>All clear</p>
          </div>
        ) : (
          insights.map((ins, i) => {
            const cfg = SEV_CFG[ins.severity as keyof typeof SEV_CFG] ?? SEV_CFG.info;
            return (
              <div
                key={ins.id}
                className="flex items-stretch"
                style={{ borderBottom: i < insights.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="w-0.5 shrink-0" style={{ background: cfg.bar }} />
                <div className="flex-1 px-3.5 py-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1" style={{ color: cfg.text }}>
                      {TYPE_LABEL[ins.type] ?? ins.type}
                    </p>
                    <p className="text-[12px] leading-snug" style={{ color: "var(--t1)" }}>{ins.message}</p>
                  </div>
                  <button
                    onClick={() => dismiss(ins.id)}
                    className="shrink-0 transition-colors"
                    style={{ color: "var(--t3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
