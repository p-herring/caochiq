"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionWithBlocks, SessionType, WorkoutBlock } from "@coaching/shared";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SESSION_COLORS: Record<SessionType, { bar: string; bg: string; label: string }> = {
  swim:     { bar: "var(--blue)",   bg: "var(--blue-dim)",   label: "Swim" },
  bike:     { bar: "var(--accent)", bg: "var(--accent-dim)", label: "Bike" },
  run:      { bar: "var(--green)",  bg: "var(--green-dim)",  label: "Run" },
  strength: { bar: "var(--amber)",  bg: "var(--amber-dim)",  label: "Strength" },
  rest:     { bar: "var(--text-3)", bg: "var(--surface-3)",  label: "Rest" },
  other:    { bar: "var(--text-2)", bg: "var(--surface-3)",  label: "Other" },
};

const BLOCK_TYPES = ["warmup", "interval", "steady", "cooldown", "rest", "note"] as const;
type BlockType = typeof BLOCK_TYPES[number];

interface Props {
  athleteId: string;
  planId: string;
  initialWeek?: Date;
  onWeekChange?: () => void;
}

export default function WeekPlanner({ athleteId, planId, initialWeek, onWeekChange }: Props) {
  const [weekStart, setWeekStart] = useState(() => initialWeek ?? getMondayOf(new Date()));
  const [sessions, setSessions]   = useState<SessionWithBlocks[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<SessionWithBlocks | null>(null);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.athletes.getSessions(athleteId, weekStart.toISOString().split("T")[0]!);
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
    onWeekChange?.();
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    onWeekChange?.();
  }

  async function handleAddSession(date: string, type: SessionType, title: string) {
    setAdding(null);
    const session = await api.sessions.create({ plan_id: planId, athlete_id: athleteId, date, type, title, status: "scheduled" });
    setSessions((prev) => [...prev, session]);
  }

  async function handleDeleteSession(id: string) {
    await api.sessions.delete(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (editingSession?.id === id) setEditingSession(null);
  }

  async function handleStatusToggle(session: SessionWithBlocks) {
    const next = session.status === "completed" ? "scheduled" : "completed";
    const updated = await api.sessions.update(session.id, { status: next });
    setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, ...updated } : s));
    if (editingSession?.id === session.id) setEditingSession((prev) => prev ? { ...prev, ...updated } : prev);
  }

  function handleOpenEditor(session: SessionWithBlocks) {
    setEditingSession(session);
    setAdding(null);
  }

  function handleEditorUpdate(updated: SessionWithBlocks) {
    setSessions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setEditingSession(updated);
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
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span
            className="text-[12px] font-medium px-2"
            style={{ color: "var(--text-2)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {weekLabel}
          </span>
          <button
            onClick={nextWeek}
            className="h-8 w-8 rounded-md flex items-center justify-center transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
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
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
          >
            Today
          </button>
        )}
      </div>

      {/* Week grid + optional editor panel */}
      <div className={`flex gap-3 ${editingSession ? "items-start" : ""}`}>
        <div className={`${editingSession ? "flex-1 min-w-0" : "w-full"}`}>
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
                        style={{ color: isToday ? "var(--accent)" : "var(--text-3)" }}
                      >
                        {DAYS[idx]}
                      </span>
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: isToday ? "var(--accent)" : "var(--text-1)", fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Sessions */}
                    {daySessions.map((session) => {
                      const cfg = SESSION_COLORS[session.type] ?? SESSION_COLORS.other;
                      const isEditing = editingSession?.id === session.id;
                      return (
                        <div
                          key={session.id}
                          className="rounded group relative cursor-pointer"
                          style={{
                            background: isEditing ? cfg.bar + "22" : cfg.bg,
                            borderLeft: `2px solid ${cfg.bar}`,
                            outline: isEditing ? `1px solid ${cfg.bar}` : "none",
                            padding: "5px 7px",
                          }}
                          onClick={() => handleOpenEditor(session)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.bar }}>
                                {cfg.label}
                              </p>
                              <p className="text-[11px] font-semibold truncate mt-0.5" style={{ color: "var(--text-1)" }}>
                                {session.title}
                              </p>
                              {session.duration_min && (
                                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                                  {session.duration_min}m
                                </p>
                              )}
                            </div>
                            {/* Action buttons — stop propagation so they don't open editor */}
                            <div
                              className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => void handleStatusToggle(session)}
                                title={session.status === "completed" ? "Mark incomplete" : "Mark complete"}
                                className="h-5 w-5 rounded flex items-center justify-center transition-all"
                                style={{
                                  background: session.status === "completed" ? "var(--green-dim)" : "var(--surface-3)",
                                  color: session.status === "completed" ? "var(--green)" : "var(--text-3)",
                                }}
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              </button>
                              <button
                                onClick={() => void handleDeleteSession(session.id)}
                                className="h-5 w-5 rounded flex items-center justify-center transition-all"
                                style={{ background: "var(--surface-3)", color: "var(--text-3)" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-dim)"; e.currentTarget.style.color = "var(--red)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-3)"; e.currentTarget.style.color = "var(--text-3)"; }}
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
                        onClick={() => { setAdding(dateStr); setEditingSession(null); }}
                        className="w-full flex items-center justify-center rounded transition-all mt-auto"
                        style={{ height: 24, border: "1px dashed var(--border-2)", color: "var(--text-3)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-3)"; }}
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

        {/* Session editor panel */}
        {editingSession && (
          <SessionEditorPanel
            session={editingSession}
            onClose={() => setEditingSession(null)}
            onUpdate={handleEditorUpdate}
            onDelete={(id) => void handleDeleteSession(id)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Session editor panel ─────────────────────────────────────────────────────

function SessionEditorPanel({
  session,
  onClose,
  onUpdate,
  onDelete,
}: {
  session: SessionWithBlocks;
  onClose: () => void;
  onUpdate: (s: SessionWithBlocks) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(session.title);
  const [type, setType] = useState<SessionType>(session.type);
  const [duration, setDuration] = useState(session.duration_min?.toString() ?? "");
  const [description, setDescription] = useState(session.description ?? "");
  const [blocks, setBlocks] = useState<WorkoutBlock[]>(session.blocks ?? []);
  const [saving, setSaving] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);

  // Reset when session changes
  useEffect(() => {
    setTitle(session.title);
    setType(session.type);
    setDuration(session.duration_min?.toString() ?? "");
    setDescription(session.description ?? "");
    setBlocks(session.blocks ?? []);
  }, [session.id]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.sessions.update(session.id, {
        title: title.trim(),
        type,
        duration_min: duration ? Number(duration) : null,
        description: description.trim() || null,
      });
      onUpdate({ ...updated, blocks });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBlock(blockType: BlockType, blockDesc: string) {
    const newBlock = await api.sessions.addBlock(session.id, {
      type: blockType,
      description: blockDesc,
    });
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    onUpdate({ ...session, title, type, duration_min: duration ? Number(duration) : null, description: description || null, blocks: updated });
    setAddingBlock(false);
  }

  async function handleDeleteBlock(blockId: string) {
    await api.sessions.deleteBlock(session.id, blockId);
    const updated = blocks.filter((b) => b.id !== blockId);
    setBlocks(updated);
    onUpdate({ ...session, title, type, blocks: updated });
  }

  const cfg = SESSION_COLORS[type] ?? SESSION_COLORS.other;

  return (
    <div
      className="w-72 shrink-0 rounded-lg flex flex-col"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.bar }}>
          Edit Session
        </span>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded transition-all"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-[12px] rounded px-2.5 py-2 outline-none transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SessionType)}
              className="w-full text-[12px] rounded px-2.5 py-2 outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            >
              {(["swim", "bike", "run", "strength", "rest", "other"] as SessionType[]).map((t) => (
                <option key={t} value={t}>{SESSION_COLORS[t].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Duration (min)">
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="—"
              className="w-full text-[12px] rounded px-2.5 py-2 outline-none transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Session notes…"
            rows={2}
            className="w-full text-[12px] rounded px-2.5 py-2 outline-none resize-none transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </Field>

        {/* Save button */}
        <button
          onClick={() => void handleSave()}
          disabled={saving || !title.trim()}
          className="w-full py-2 rounded text-[12px] font-semibold transition-all disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#0C0C0F" }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {/* Blocks */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
              Blocks
            </p>
            <button
              onClick={() => setAddingBlock(true)}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all"
              style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
            >
              + Add
            </button>
          </div>

          {blocks.length === 0 && !addingBlock && (
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>No blocks yet.</p>
          )}

          <div className="space-y-1.5">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex items-start gap-2 rounded px-2.5 py-2"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-3)" }}>{block.type}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--text-1)" }}>{block.description}</p>
                  {block.duration_min && (
                    <p className="text-[10px]" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {block.duration_min}m
                    </p>
                  )}
                </div>
                <button
                  onClick={() => void handleDeleteBlock(block.id)}
                  className="h-5 w-5 flex items-center justify-center rounded shrink-0 transition-all"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "var(--red-dim)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = ""; }}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {addingBlock && (
              <AddBlockForm
                onAdd={handleAddBlock}
                onCancel={() => setAddingBlock(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete session */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => { if (confirm("Delete this session?")) onDelete(session.id); }}
          className="w-full py-1.5 rounded text-[11px] font-semibold transition-all"
          style={{ color: "var(--red)", background: "var(--red-dim)" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Delete session
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: "var(--text-3)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Add block inline form ────────────────────────────────────────────────────

function AddBlockForm({ onAdd, onCancel }: { onAdd: (type: BlockType, desc: string) => void; onCancel: () => void }) {
  const [type, setType] = useState<BlockType>("interval");
  const [desc, setDesc] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) return;
    onAdd(type, desc.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5 rounded px-2.5 py-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as BlockType)}
        className="w-full text-[11px] rounded px-2 py-1 outline-none"
        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-1)" }}
      >
        {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input
        autoFocus
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description…"
        className="w-full text-[11px] rounded px-2 py-1 outline-none"
        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
      <div className="flex gap-1">
        <button type="submit" className="flex-1 text-[10px] font-semibold py-1 rounded" style={{ background: "var(--accent)", color: "#0C0C0F" }}>
          Add
        </button>
        <button type="button" onClick={onCancel} className="flex-1 text-[10px] font-semibold py-1 rounded" style={{ background: "var(--surface-3)", color: "var(--text-2)" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Add session inline form ──────────────────────────────────────────────────

function AddSessionForm({ onAdd, onCancel }: { onAdd: (type: SessionType, title: string) => void; onCancel: () => void }) {
  const [type, setType] = useState<SessionType>("run");
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(type, title.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md p-2 space-y-1.5" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SessionType)}
        className="w-full text-[11px] rounded px-1.5 py-1 outline-none"
        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-1)" }}
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
        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      />
      <div className="flex gap-1">
        <button type="submit" className="flex-1 text-[10px] font-semibold py-1 rounded transition-all" style={{ background: "var(--accent)", color: "#0C0C0F" }}>
          Add
        </button>
        <button type="button" onClick={onCancel} className="flex-1 text-[10px] font-semibold py-1 rounded transition-all" style={{ background: "var(--surface-3)", color: "var(--text-2)" }}>
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
