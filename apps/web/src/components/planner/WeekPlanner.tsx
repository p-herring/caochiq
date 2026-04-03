"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionWithBlocks, SessionType } from "@coaching/shared";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SESSION_COLORS: Record<SessionType, { bar: string; bg: string; label: string }> = {
  swim:     { bar: "var(--blue)",   bg: "var(--blue-dim)",   label: "Swim" },
  bike:     { bar: "var(--accent)", bg: "var(--accent-dim)", label: "Bike" },
  run:      { bar: "var(--green)",  bg: "var(--green-dim)",  label: "Run" },
  strength: { bar: "var(--amber)",  bg: "var(--amber-dim)",  label: "Strength" },
  rest:     { bar: "var(--t3)",     bg: "var(--surface-3)",  label: "Rest" },
  other:    { bar: "var(--t2)",     bg: "var(--surface-3)",  label: "Other" },
};

interface Props { athleteId: string; planId: string; }

export default function WeekPlanner({ athleteId, planId }: Props) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [sessions, setSessions]   = useState<SessionWithBlocks[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState<string | null>(null); // date being added to
  const [editingId, setEditingId] = useState<string | null>(null);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.athletes.getSessions(
        athleteId,
        weekStart.toISOString().split("T")[0]!
      );
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, [athleteId, weekStart]);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  async function handleAddSession(date: string, type: SessionType, title: string) {
    setAdding(null);
    const session = await api.sessions.create({
      plan_id: planId,
      athlete_id: athleteId,
      date,
      type,
      title,
      status: "scheduled",
    });
    setSessions((prev) => [...prev, session]);
  }

  async function handleDeleteSession(id: string) {
    await api.sessions.delete(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleStatusToggle(session: SessionWithBlocks) {
    const next = session.status === "completed" ? "scheduled" : "completed";
    const updated = await api.sessions.update(session.id, { status: next });
    setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, ...updated } : s));
  }

  const weekLabel = `${weekDates[0]!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekDates[6]!.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  const isCurrentWeek = getMondayOf(new Date()).toDateString() === weekStart.toDateString();

  return (
    <div>
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="h-8 w-8 rounded-md flex items-center justify-center transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--t2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t2)")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span
            className="text-[12px] font-medium px-2"
            style={{ color: "var(--t2)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="h-8 w-8 rounded-md flex items-center justify-center transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--t2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t2)")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {!isCurrentWeek && (
          <button
            onClick={() => setWeekStart(getMondayOf(new Date()))}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--t3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
          >
            Today
          </button>
        )}
      </div>

      {/* Week grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d) => (
            <div key={d} className="rounded-lg animate-pulse" style={{ height: 200, background: "var(--surface)", border: "1px solid var(--border)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dateStr = date.toISOString().split("T")[0]!;
            const daySessions = sessions
              .filter((s) => s.date === dateStr)
              .sort((a, b) => a.position - b.position);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={dateStr}
                className="rounded-lg p-2.5 flex flex-col gap-1.5 min-h-[180px]"
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: isToday ? "var(--accent)" : "var(--t3)" }}
                  >
                    {DAYS[idx]}
                  </span>
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: isToday ? "var(--accent)" : "var(--t1)", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* Sessions */}
                {daySessions.map((session) => {
                  const cfg = SESSION_COLORS[session.type] ?? SESSION_COLORS.other;
                  return (
                    <div
                      key={session.id}
                      className="rounded group relative"
                      style={{
                        background: cfg.bg,
                        borderLeft: `2px solid ${cfg.bar}`,
                        padding: "5px 7px",
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-[9px] font-bold uppercase tracking-wider"
                            style={{ color: cfg.bar }}
                          >
                            {cfg.label}
                          </p>
                          <p
                            className="text-[11px] font-semibold truncate mt-0.5"
                            style={{ color: "var(--t1)" }}
                          >
                            {session.title}
                          </p>
                          {session.duration_min && (
                            <p
                              className="text-[10px] mt-0.5"
                              style={{ color: "var(--t3)", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {session.duration_min}m
                            </p>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => void handleStatusToggle(session)}
                            title={session.status === "completed" ? "Mark incomplete" : "Mark complete"}
                            className="h-5 w-5 rounded flex items-center justify-center transition-all"
                            style={{
                              background: session.status === "completed" ? "var(--green-dim)" : "var(--surface-3)",
                              color: session.status === "completed" ? "var(--green)" : "var(--t3)",
                            }}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                          <button
                            onClick={() => void handleDeleteSession(session.id)}
                            className="h-5 w-5 rounded flex items-center justify-center transition-all"
                            style={{ background: "var(--surface-3)", color: "var(--t3)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-dim)"; e.currentTarget.style.color = "var(--red)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-3)"; e.currentTarget.style.color = "var(--t3)"; }}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add session */}
                {adding === dateStr ? (
                  <AddSessionForm
                    onAdd={(type, title) => void handleAddSession(dateStr, type, title)}
                    onCancel={() => setAdding(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAdding(dateStr)}
                    className="w-full flex items-center justify-center rounded transition-all mt-auto"
                    style={{
                      height: 24,
                      border: "1px dashed var(--border-2)",
                      color: "var(--t3)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--t3)"; }}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Add session inline form ──────────────────────────────────────────────────

function AddSessionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (type: SessionType, title: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<SessionType>("run");
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(type, title.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md p-2 space-y-1.5"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SessionType)}
        className="w-full text-[11px] rounded px-1.5 py-1 outline-none"
        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--t1)" }}
      >
        {(["swim", "bike", "run", "strength", "rest", "other"] as SessionType[]).map((t) => (
          <option key={t} value={t}>{SESSION_COLORS[t].label}</option>
        ))}
      </select>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session title…"
        className="w-full text-[11px] rounded px-1.5 py-1 outline-none"
        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--t1)" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
      <div className="flex gap-1">
        <button
          type="submit"
          className="flex-1 text-[10px] font-semibold py-1 rounded transition-all"
          style={{ background: "var(--accent)", color: "#0C0C0F" }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-[10px] font-semibold py-1 rounded transition-all"
          style={{ background: "var(--surface-3)", color: "var(--t2)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
