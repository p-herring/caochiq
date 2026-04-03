"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { PlanWeekSummary, PlanPhase, SessionType } from "@coaching/shared";

const PHASES: { value: PlanPhase; label: string; color: string; bg: string }[] = [
  { value: "base",     label: "Base",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  { value: "build",    label: "Build",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { value: "peak",     label: "Peak",     color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { value: "taper",    label: "Taper",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { value: "race",     label: "Race",     color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { value: "recovery", label: "Recovery", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
];

const TYPE_COLORS: Record<SessionType, string> = {
  run:      "var(--green)",
  bike:     "var(--accent)",
  swim:     "#38bdf8",
  strength: "var(--amber)",
  rest:     "var(--text-3)",
  other:    "var(--text-3)",
};

interface Props {
  planId: string;
  planStartDate: string;
  onOpenWeek: (weekStart: string) => void;
}

export default function PlanOverview({ planId, planStartDate, onOpenWeek }: Props) {
  const [weeks, setWeeks] = useState<PlanWeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.plans.getWeeks(planId);
      setWeeks(data);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { void load(); }, [load]);

  async function handlePhaseChange(weekNumber: number, phase: PlanPhase | "") {
    setSaving(weekNumber);
    try {
      await api.plans.updateWeek(planId, weekNumber, { phase: phase === "" ? null : phase });
      setWeeks((prev) =>
        prev.map((w) => w.week_number === weekNumber ? { ...w, phase: phase === "" ? null : phase } : w)
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleTargetChange(weekNumber: number, field: "tss_target" | "hours_target", value: number | null) {
    setSaving(weekNumber);
    try {
      await api.plans.updateWeek(planId, weekNumber, { [field]: value });
      setWeeks((prev) =>
        prev.map((w) => w.week_number === weekNumber ? { ...w, [field]: value } : w)
      );
    } finally {
      setSaving(null);
    }
  }

  const todayStr = new Date().toISOString().split("T")[0]!;
  const currentWeek = weeks.find((w) => w.week_start <= todayStr && w.week_end >= todayStr);

  if (loading) return <PlanSkeleton />;

  return (
    <div>
      {/* Summary strip */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: "var(--text-3)" }}>Weeks</p>
          <p className="text-[20px] font-bold leading-none" style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}>{weeks.length}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: "var(--text-3)" }}>Sessions planned</p>
          <p className="text-[20px] font-bold leading-none" style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}>
            {weeks.reduce((sum, w) => sum + w.session_count, 0)}
          </p>
        </div>
        {currentWeek && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: "var(--text-3)" }}>Current week</p>
            <p className="text-[20px] font-bold leading-none" style={{ color: "var(--accent)", fontFamily: "'Barlow Condensed', sans-serif" }}>W{currentWeek.week_number}</p>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-3 flex-wrap">
          {PHASES.map((p) => (
            <div key={p.value} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* Column headers */}
        <div
          className="grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{
            gridTemplateColumns: "40px 130px 110px 90px 1fr 80px 60px",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-3)",
          }}
        >
          <span>Wk</span>
          <span>Dates</span>
          <span>Phase</span>
          <span>TSS target</span>
          <span>Sessions</span>
          <span className="text-right">Load</span>
          <span />
        </div>

        {weeks.map((w, i) => {
          const isCurrentWeek = currentWeek?.week_number === w.week_number;
          const phase = PHASES.find((p) => p.value === w.phase);
          const tssPercent = w.tss_target && w.tss_target > 0
            ? Math.min(Math.round((w.actual_tss / w.tss_target) * 100), 150)
            : null;

          const startLabel = new Date(w.week_start + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
          const endLabel = new Date(w.week_end + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

          return (
            <div
              key={w.week_number}
              className="grid items-center px-4 py-2.5 transition-all"
              style={{
                gridTemplateColumns: "40px 130px 110px 90px 1fr 80px 60px",
                borderBottom: i < weeks.length - 1 ? "1px solid var(--border)" : "none",
                borderLeft: phase ? `3px solid ${phase.color}` : "3px solid transparent",
                background: isCurrentWeek ? "var(--surface-2)" : "",
              }}
            >
              {/* Week number */}
              <div className="flex items-center gap-1">
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{
                    color: isCurrentWeek ? "var(--accent)" : "var(--text-3)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {w.week_number}
                </span>
                {isCurrentWeek && (
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "var(--accent)" }} />
                )}
              </div>

              {/* Dates */}
              <span className="text-[11px]" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                {startLabel} – {endLabel}
              </span>

              {/* Phase select */}
              <div className="relative">
                <select
                  value={w.phase ?? ""}
                  onChange={(e) => void handlePhaseChange(w.week_number, e.target.value as PlanPhase | "")}
                  disabled={saving === w.week_number}
                  className="w-full pl-2 pr-6 py-1 text-[11px] rounded outline-none appearance-none transition-all cursor-pointer"
                  style={{
                    background: phase ? phase.bg : "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: phase ? phase.color : "var(--text-3)",
                    fontWeight: phase ? 600 : 400,
                  }}
                >
                  <option value="">— no phase —</option>
                  {PHASES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <svg
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  style={{ color: phase ? phase.color : "var(--text-3)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {/* TSS target */}
              <TssTargetInput
                value={w.tss_target}
                disabled={saving === w.week_number}
                onCommit={(val) => void handleTargetChange(w.week_number, "tss_target", val)}
              />

              {/* Session dots */}
              <div className="flex items-center gap-1 flex-wrap">
                {w.session_types.map(({ type, count }) =>
                  Array.from({ length: count }).map((_, k) => (
                    <div
                      key={`${type}-${k}`}
                      className="h-2.5 w-2.5 rounded-full"
                      title={type}
                      style={{ background: TYPE_COLORS[type as SessionType] ?? "var(--text-3)" }}
                    />
                  ))
                )}
                {w.session_count === 0 && (
                  <span className="text-[11px]" style={{ color: "var(--surface-3)" }}>—</span>
                )}
              </div>

              {/* TSS load bar */}
              <div className="flex items-center gap-1.5 justify-end">
                {tssPercent !== null ? (
                  <>
                    <div className="h-[3px] w-12 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(tssPercent, 100)}%`,
                          background: tssPercent > 110 ? "var(--red)" : tssPercent >= 80 ? "var(--green)" : "var(--amber)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {tssPercent}%
                    </span>
                  </>
                ) : w.actual_tss > 0 ? (
                  <span className="text-[10px] tabular-nums" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {w.actual_tss}
                  </span>
                ) : (
                  <span style={{ color: "var(--surface-3)" }}>—</span>
                )}
              </div>

              {/* Open week */}
              <div className="flex justify-end">
                <button
                  onClick={() => onOpenWeek(w.week_start)}
                  className="text-[10px] font-semibold px-2 py-1 rounded transition-all"
                  style={{ color: "var(--text-3)", background: "var(--surface-2)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "var(--surface-2)"; }}
                >
                  Open
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Inline TSS target input ──────────────────────────────────────────────────

function TssTargetInput({
  value,
  disabled,
  onCommit,
}: {
  value: number | null;
  disabled: boolean;
  onCommit: (val: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  function handleBlur() {
    setEditing(false);
    const n = draft === "" ? null : Number(draft);
    if (n !== value) onCommit(isNaN(n as number) ? null : n);
  }

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(value?.toString() ?? ""); setEditing(false); } }}
        className="w-20 px-2 py-1 text-[11px] rounded outline-none"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text-1)", fontFamily: "'JetBrains Mono', monospace" }}
        disabled={disabled}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value?.toString() ?? ""); setEditing(true); }}
      className="text-left w-full px-2 py-1 text-[11px] rounded transition-all"
      style={{ color: value ? "var(--text-2)" : "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      disabled={disabled}
    >
      {value ?? "Set target"}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PlanSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 w-48 rounded" style={{ background: "var(--surface-2)" }} />
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < 7 ? "1px solid var(--border)" : "none", background: "var(--surface)" }}
          >
            <div className="h-4 w-6 rounded" style={{ background: "var(--surface-3)" }} />
            <div className="h-3 w-28 rounded" style={{ background: "var(--surface-3)" }} />
            <div className="h-6 w-24 rounded" style={{ background: "var(--surface-3)" }} />
            <div className="h-3 w-16 rounded" style={{ background: "var(--surface-3)" }} />
            <div className="flex gap-1 flex-1">
              {[...Array(3)].map((_, j) => <div key={j} className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--surface-3)" }} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
