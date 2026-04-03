"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteWithProfile, ComplianceData, Insight, WorkoutLog } from "@coaching/shared";

export default function AthleteDetailPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const [athlete, setAthlete]       = useState<AthleteWithProfile | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [insights, setInsights]     = useState<Insight[]>([]);
  const [logs, setLogs]             = useState<WorkoutLog[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.athletes.get(id),
      api.athletes.getCompliance(id),
      api.athletes.getInsights(id),
      api.logs.getAthleteHistory(id),
    ]).then(([a, c, ins, l]) => {
      setAthlete(a); setCompliance(c); setInsights(ins); setLogs(l);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Skeleton />;
  if (!athlete) return (
    <div className="px-8 py-7" style={{ color: "var(--text-3)" }}>Athlete not found.</div>
  );

  const initials = athlete.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const compColor =
    athlete.compliance_7d >= 80 ? "var(--green)"
    : athlete.compliance_7d >= 50 ? "var(--amber)"
    : "var(--red)";

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6">
        <Link
          href="/athletes"
          className="text-[11px] transition-colors duration-150"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
        >
          Athletes
        </Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: "var(--text-3)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{athlete.full_name}</span>
      </nav>

      {/* Hero header card */}
      <div
        className="rounded-lg px-6 py-5 mb-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="h-12 w-12 rounded-lg shrink-0 flex items-center justify-center text-[16px] font-bold"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-2)",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1
                  className="text-[24px] font-bold leading-tight tracking-tight"
                  style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {athlete.full_name}
                </h1>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>{athlete.email}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/athletes/${id}/planner`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-all duration-150"
                  style={{ background: "var(--accent)", color: "#0C0C0F" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                  Planner
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-2)",
                    border: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Message
                </Link>
              </div>
            </div>

            {/* Stat strip */}
            <div
              className="flex items-center gap-6 mt-4 pt-4 flex-wrap"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <MiniStat label="7d Compliance" value={`${athlete.compliance_7d}%`} color={compColor} />
              {compliance && (
                <MiniStat
                  label="30d Compliance"
                  value={`${compliance.last_30d_pct}%`}
                  color={
                    compliance.last_30d_pct >= 80 ? "var(--green)"
                    : compliance.last_30d_pct >= 50 ? "var(--amber)"
                    : "var(--red)"
                  }
                />
              )}
              <MiniStat
                label="Active Flags"
                value={String(athlete.active_flags)}
                color={athlete.active_flags > 0 ? "var(--red)" : "var(--text-3)"}
              />
              {athlete.profile?.weight_kg && (
                <MiniStat label="Weight" value={`${athlete.profile.weight_kg} kg`} color="var(--text-2)" />
              )}
              {athlete.next_race && (
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    Next Race
                  </p>
                  <p className="text-[13px] font-semibold mt-0.5 flex items-center gap-2" style={{ color: "var(--text-1)" }}>
                    {athlete.next_race.name}
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {new Date(athlete.next_race.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <ComplianceSection compliance={compliance} />
          <RecentSessions logs={logs} />
        </div>
        <div className="space-y-5">
          <FlagsSection
            insights={insights}
            onDismiss={(iid) => {
              setInsights((p) => p.filter((i) => i.id !== iid));
              api.insights.dismiss(iid);
            }}
          />
          <ProfileNotes athlete={athlete} athleteId={id} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-bold mt-0.5 tabular-nums"
        style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
      style={{ color: "var(--text-3)" }}
    >
      {children}
    </h2>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg px-5 py-4 ${className ?? ""}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function ComplianceSection({ compliance }: { compliance: ComplianceData | null }) {
  if (!compliance) return (
    <Card>
      <SectionLabel>Compliance</SectionLabel>
      <p className="text-[12px] text-center py-6" style={{ color: "var(--text-3)" }}>No compliance data yet.</p>
    </Card>
  );

  const weeks = compliance.weeks.slice(-10);
  const maxSched = Math.max(...weeks.map((w) => w.scheduled), 1);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Weekly Compliance</SectionLabel>
        <div className="flex items-center gap-4">
          <LegendDot color="var(--accent)" label="Completed" />
          <LegendDot color="var(--surface-3)" label="Scheduled" />
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col justify-end gap-0.5 h-20 relative">
              {/* Scheduled (bg) */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm opacity-30"
                style={{
                  height: `${(w.scheduled / maxSched) * 100}%`,
                  background: "var(--border-2)",
                }}
              />
              {/* Completed (fg) */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm"
                style={{
                  height: `${(w.completed / maxSched) * 100}%`,
                  background: w.pct >= 80 ? "var(--green)" : w.pct >= 50 ? "var(--amber)" : "var(--red)",
                  opacity: 0.85,
                }}
              />
            </div>
            <span
              className="text-[9px] tabular-nums"
              style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {w.label?.slice(0, 3) ?? `W${i + 1}`}
            </span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div
        className="flex items-center gap-5 mt-4 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <CompliancePill label="7 day" value={compliance.last_7d_pct} />
        <CompliancePill label="30 day" value={compliance.last_30d_pct} />
        <CompliancePill label="All time" value={compliance.all_time_pct} />
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-sm" style={{ background: color }} />
      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{label}</span>
    </div>
  );
}

function CompliancePill({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "var(--green)" : value >= 50 ? "var(--amber)" : "var(--red)";
  const bg    = value >= 80 ? "var(--green-dim)" : value >= 50 ? "var(--amber-dim)" : "var(--red-dim)";
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>{label}</p>
      <span
        className="text-[13px] font-bold mt-1 inline-block px-2 py-0.5 rounded tabular-nums"
        style={{ color, background: bg, fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}%
      </span>
    </div>
  );
}

function RecentSessions({ logs }: { logs: WorkoutLog[] }) {
  const recent = logs.slice(0, 8);

  return (
    <Card>
      <SectionLabel>Recent Sessions</SectionLabel>
      {recent.length === 0 ? (
        <p className="text-[12px] text-center py-6" style={{ color: "var(--text-3)" }}>
          No sessions logged yet.
        </p>
      ) : (
        <div>
          {recent.map((log, i) => (
            <div
              key={log.id}
              className="flex items-center gap-3 py-2.5"
              style={{ borderBottom: i < recent.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              {/* Status dot */}
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  background: log.status === "completed" ? "var(--green)"
                    : log.status === "missed" ? "var(--red)"
                    : "var(--amber)",
                }}
              />

              {/* Date */}
              <span
                className="text-[11px] tabular-nums shrink-0 w-20"
                style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {new Date(log.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>

              {/* Session name */}
              <span className="text-[12px] font-medium flex-1 truncate" style={{ color: "var(--text-2)" }}>
                {log.session_name ?? "Session"}
              </span>

              {/* RPE */}
              {log.rpe != null && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0"
                  style={{
                    background: "var(--surface-3)",
                    color: "var(--text-3)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  RPE {log.rpe}
                </span>
              )}

              {/* Duration */}
              {log.duration_min && (
                <span
                  className="text-[11px] tabular-nums shrink-0"
                  style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {log.duration_min}m
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const INSIGHT_SEV = {
  critical: { bar: "var(--red)",   text: "var(--red)",   bg: "var(--red-dim)" },
  warning:  { bar: "var(--amber)", text: "var(--amber)", bg: "var(--amber-dim)" },
  info:     { bar: "var(--blue)",  text: "var(--blue)",  bg: "var(--blue-dim)" },
} as const;

const INSIGHT_TYPE_LABEL: Record<string, string> = {
  compliance: "Compliance",
  missed_sessions: "Missed",
  fatigue: "Fatigue",
  weight_trend: "Weight",
  overtraining: "Overtraining",
};

function FlagsSection({ insights, onDismiss }: { insights: Insight[]; onDismiss: (id: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--text-3)" }}
        >
          Flags
        </h2>
        {insights.length > 0 && (
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{
              background: "var(--red-dim)",
              color: "var(--red)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {insights.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {insights.length === 0 ? (
          <div
            className="rounded-lg px-4 py-6 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ background: "var(--green-dim)" }}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                style={{ color: "var(--green)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-[12px] font-medium" style={{ color: "var(--green)" }}>All clear</p>
          </div>
        ) : insights.map((ins) => {
          const cfg = INSIGHT_SEV[ins.severity as keyof typeof INSIGHT_SEV] ?? INSIGHT_SEV.info;
          return (
            <div
              key={ins.id}
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-stretch">
                <div className="w-0.5 shrink-0" style={{ background: cfg.bar }} />
                <div className="flex-1 px-3.5 py-3 flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1"
                      style={{ color: cfg.text }}
                    >
                      {INSIGHT_TYPE_LABEL[ins.type] ?? ins.type}
                    </p>
                    <p className="text-[12px] leading-snug" style={{ color: "var(--text-1)" }}>
                      {ins.message}
                    </p>
                    {ins.coach_note && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
                        {ins.coach_note}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onDismiss(ins.id)}
                    className="shrink-0 transition-colors duration-150"
                    style={{ color: "var(--text-3)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileNotes({ athlete, athleteId }: { athlete: AthleteWithProfile; athleteId: string }) {
  const [notes, setNotes] = useState(athlete.profile?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.athletes.updateProfile(athleteId, { notes });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const p = athlete.profile;
  return (
    <div
      className="rounded-lg px-5 py-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h2
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-4"
        style={{ color: "var(--text-3)" }}
      >
        Profile
      </h2>

      <div className="space-y-2.5 mb-4">
        {p?.dob && (
          <Row
            label="DOB"
            value={new Date(p.dob).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          />
        )}
        {p?.weight_kg && <Row label="Weight" value={`${p.weight_kg} kg`} />}
        {p?.timezone  && <Row label="Timezone" value={p.timezone} />}
        {p?.goals && (
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1"
              style={{ color: "var(--text-3)" }}
            >
              Goals
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{p.goals}</p>
          </div>
        )}
      </div>

      <div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5"
          style={{ color: "var(--text-3)" }}
        >
          Coach Notes
        </p>
        <textarea
          className="w-full text-[13px] resize-none rounded-md px-3 py-2.5 outline-none transition-all"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
          }}
          rows={4}
          placeholder="Private notes visible only to you…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-md transition-all disabled:opacity-50"
            style={
              saved
                ? { background: "var(--green-dim)", color: "var(--green)" }
                : { background: "var(--accent)", color: "#0C0C0F" }
            }
            onMouseEnter={(e) => { if (!saved && !saving) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{label}</p>
      <p
        className="text-[12px] font-medium"
        style={{ color: "var(--text-2)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto animate-pulse">
      <div className="h-3 w-40 rounded mb-6" style={{ background: "var(--surface-2)" }} />
      <div className="rounded-lg px-6 py-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-lg" style={{ background: "var(--surface-3)" }} />
          <div className="flex-1 space-y-2.5">
            <div className="h-6 w-52 rounded" style={{ background: "var(--surface-3)" }} />
            <div className="h-3 w-36 rounded" style={{ background: "var(--surface-3)" }} />
          </div>
        </div>
      </div>
      <div className="grid xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="h-52 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          <div className="h-64 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
        </div>
        <div className="space-y-5">
          <div className="h-48 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          <div className="h-64 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
        </div>
      </div>
    </div>
  );
}
