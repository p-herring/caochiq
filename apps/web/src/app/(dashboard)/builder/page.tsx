"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteWithProfile, WorkoutTemplateWithBlocks, SessionType } from "@coaching/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockDraft = {
  type: "warmup" | "interval" | "steady" | "cooldown" | "rest" | "note";
  description: string;
  duration_min: number | "";
  intensity: string;
  reps: number | "";
};

const SESSION_TYPES: SessionType[] = ["run", "bike", "swim", "strength", "rest", "other"];
const BLOCK_TYPES = ["warmup", "interval", "steady", "cooldown", "rest", "note"] as const;

function emptyBlock(): BlockDraft {
  return { type: "interval", description: "", duration_min: "", intensity: "", reps: "" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuilderPage(): React.JSX.Element {
  const [athletes, setAthletes] = useState<AthleteWithProfile[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [templates, setTemplates] = useState<{ own: WorkoutTemplateWithBlocks[]; shared: WorkoutTemplateWithBlocks[] }>({ own: [], shared: [] });
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplateWithBlocks | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    api.athletes.list().then(setAthletes).finally(() => setLoadingAthletes(false));
    api.templates.list().then(setTemplates).finally(() => setLoadingTemplates(false));
  }, []);

  function openNewTemplate() {
    setEditingTemplate(null);
    setShowTemplateModal(true);
  }

  function openEditTemplate(t: WorkoutTemplateWithBlocks) {
    setEditingTemplate(t);
    setShowTemplateModal(true);
  }

  function onTemplateSaved(t: WorkoutTemplateWithBlocks) {
    setTemplates((prev) => {
      const isNew = !prev.own.find((x) => x.id === t.id);
      return {
        ...prev,
        own: isNew
          ? [t, ...prev.own]
          : prev.own.map((x) => (x.id === t.id ? t : x)),
      };
    });
    setShowTemplateModal(false);
  }

  function onTemplateDeleted(id: string) {
    setTemplates((prev) => ({ ...prev, own: prev.own.filter((x) => x.id !== id) }));
    setShowTemplateModal(false);
  }

  async function handleCopy(t: WorkoutTemplateWithBlocks) {
    try {
      const copy = await api.templates.copy(t.id);
      setTemplates((prev) => ({ ...prev, own: [copy, ...prev.own] }));
    } catch {
      // silently fail — user will see nothing happen
    }
  }

  async function handleToggleShare(t: WorkoutTemplateWithBlocks) {
    try {
      const updated = await api.templates.update(t.id, { is_shared: !t.is_shared });
      setTemplates((prev) => ({ ...prev, own: prev.own.map((x) => (x.id === t.id ? updated : x)) }));
    } catch {
      // silently fail
    }
  }

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
          Select an athlete to open their weekly planner, or build reusable templates.
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

            {loadingAthletes ? (
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
                        className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center text-[12px] font-bold"
                        style={{ background: "var(--surface-3)", color: "var(--text-2)", fontFamily: "'Barlow Condensed', sans-serif" }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{a.full_name}</p>
                        <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{a.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-[3px] w-12 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                          <div className="h-full rounded-full" style={{ width: `${a.compliance_7d}%`, background: compColor }} />
                        </div>
                        <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: compColor, fontFamily: "'JetBrains Mono', monospace" }}>
                          {a.compliance_7d}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                        >
                          Open
                        </span>
                        <svg className="h-3.5 w-3.5 transition-all duration-150 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: "var(--text-3)" }}>
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

        {/* Sidebar */}
        <div className="space-y-4">
          <TemplatesPanel
            templates={templates}
            loading={loadingTemplates}
            onNew={openNewTemplate}
            onEdit={openEditTemplate}
            onDelete={onTemplateDeleted}
            onToggleShare={handleToggleShare}
            onCopy={handleCopy}
          />

          {/* AI Generation tease */}
          <div className="rounded-lg p-5" style={{ background: "var(--surface)", border: "1px dashed var(--border-2)" }}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-dim)" }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--accent)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-2)" }}>AI Plan Generation</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Generate a full training block from athlete history, goals, and race calendar automatically.
            </p>
            <div className="mt-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded inline-block" style={{ background: "var(--surface-3)", color: "var(--text-3)" }}>
              Coming soon
            </div>
          </div>
        </div>
      </div>

      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => setShowTemplateModal(false)}
          onSaved={onTemplateSaved}
          onDeleted={onTemplateDeleted}
        />
      )}
    </div>
  );
}

// ─── Templates Panel ──────────────────────────────────────────────────────────

function TemplatesPanel({
  templates,
  loading,
  onNew,
  onEdit,
  onDelete,
  onToggleShare,
  onCopy,
}: {
  templates: { own: WorkoutTemplateWithBlocks[]; shared: WorkoutTemplateWithBlocks[] };
  loading: boolean;
  onNew: () => void;
  onEdit: (t: WorkoutTemplateWithBlocks) => void;
  onDelete: (id: string) => void;
  onToggleShare: (t: WorkoutTemplateWithBlocks) => void;
  onCopy: (t: WorkoutTemplateWithBlocks) => void;
}) {
  const [tab, setTab] = useState<"mine" | "shared">("mine");

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-3)" }}>
          Workout Templates
        </p>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-all"
          style={{ background: "var(--accent)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["mine", "shared"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-[11px] font-semibold transition-all"
            style={{
              color: tab === t ? "var(--text-1)" : "var(--text-3)",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            }}
          >
            {t === "mine" ? `Mine (${templates.own.length})` : `Shared (${templates.shared.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="px-4 py-3 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-2">
              <div className="h-6 w-6 rounded shrink-0" style={{ background: "var(--surface-3)" }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-32 rounded" style={{ background: "var(--surface-3)" }} />
                <div className="h-2 w-20 rounded" style={{ background: "var(--surface-3)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : tab === "mine" ? (
        templates.own.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No templates yet.</p>
            <button
              onClick={onNew}
              className="mt-2 text-[11px] font-semibold transition-all"
              style={{ color: "var(--accent)" }}
            >
              Create your first →
            </button>
          </div>
        ) : (
          <div>
            {templates.own.map((t, i) => (
              <OwnTemplateRow
                key={t.id}
                template={t}
                last={i === templates.own.length - 1}
                onEdit={onEdit}
                onToggleShare={onToggleShare}
              />
            ))}
          </div>
        )
      ) : (
        templates.shared.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>No shared templates from other coaches yet.</p>
          </div>
        ) : (
          <div>
            {templates.shared.map((t, i) => (
              <SharedTemplateRow
                key={t.id}
                template={t}
                last={i === templates.shared.length - 1}
                onCopy={onCopy}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function OwnTemplateRow({
  template: t,
  last,
  onEdit,
  onToggleShare,
}: {
  template: WorkoutTemplateWithBlocks;
  last: boolean;
  onEdit: (t: WorkoutTemplateWithBlocks) => void;
  onToggleShare: (t: WorkoutTemplateWithBlocks) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 group"
      style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <TypeDot type={t.type} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{t.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
          {t.type} · {t.blocks.length} block{t.blocks.length !== 1 ? "s" : ""}
          {t.duration_min ? ` · ${t.duration_min}min` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Share toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleShare(t); }}
          title={t.is_shared ? "Shared with other coaches — click to make private" : "Private — click to share with other coaches"}
          className="h-6 w-6 flex items-center justify-center rounded transition-all"
          style={{ color: t.is_shared ? "var(--accent)" : "var(--text-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <svg className="h-3.5 w-3.5" fill={t.is_shared ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </button>
        {/* Edit */}
        <button
          onClick={() => onEdit(t)}
          className="h-6 w-6 flex items-center justify-center rounded transition-all"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SharedTemplateRow({
  template: t,
  last,
  onCopy,
}: {
  template: WorkoutTemplateWithBlocks;
  last: boolean;
  onCopy: (t: WorkoutTemplateWithBlocks) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5"
      style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <TypeDot type={t.type} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{t.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
          {t.type} · {t.blocks.length} block{t.blocks.length !== 1 ? "s" : ""}
          {t.duration_min ? ` · ${t.duration_min}min` : ""}
        </p>
      </div>
      <button
        onClick={() => onCopy(t)}
        className="text-[10px] font-semibold px-2 py-1 rounded transition-all shrink-0"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        Copy
      </button>
    </div>
  );
}

function TypeDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    run: "var(--green)",
    bike: "var(--accent)",
    swim: "#38bdf8",
    strength: "var(--amber)",
    rest: "var(--text-3)",
    other: "var(--text-3)",
  };
  return (
    <div
      className="h-2 w-2 rounded-full shrink-0"
      style={{ background: colors[type] ?? "var(--text-3)" }}
    />
  );
}

// ─── Template Modal ───────────────────────────────────────────────────────────

function TemplateModal({
  template,
  onClose,
  onSaved,
  onDeleted,
}: {
  template: WorkoutTemplateWithBlocks | null;
  onClose: () => void;
  onSaved: (t: WorkoutTemplateWithBlocks) => void;
  onDeleted: (id: string) => void;
}) {
  const isEdit = template !== null;

  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [type, setType] = useState<SessionType>(template?.type ?? "run");
  const [durationMin, setDurationMin] = useState<number | "">(template?.duration_min ?? "");
  const [tss, setTss] = useState<number | "">(template?.tss ?? "");
  const [isShared, setIsShared] = useState(template?.is_shared ?? false);
  const [blocks, setBlocks] = useState<BlockDraft[]>(
    template?.blocks.map((b) => ({
      type: b.type,
      description: b.description,
      duration_min: b.duration_min ?? "",
      intensity: b.intensity ?? "",
      reps: b.reps ?? "",
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addBlock() {
    setBlocks((prev) => [...prev, emptyBlock()]);
  }

  function removeBlock(i: number) {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateBlock(i: number, field: keyof BlockDraft, value: string | number) {
    setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      type,
      duration_min: durationMin === "" ? null : Number(durationMin),
      tss: tss === "" ? null : Number(tss),
      is_shared: isShared,
      blocks: blocks.map((b) => ({
        type: b.type,
        description: b.description,
        duration_min: b.duration_min === "" ? null : Number(b.duration_min),
        distance_m: null,
        intensity: b.intensity || null,
        reps: b.reps === "" ? null : Number(b.reps),
      })),
    };
    try {
      const saved = isEdit
        ? await api.templates.update(template.id, payload)
        : await api.templates.create(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!template) return;
    setDeleting(true);
    try {
      await api.templates.delete(template.id);
      onDeleted(template.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-xl shadow-2xl flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2
            className="text-[20px] font-bold leading-none tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {isEdit ? "Edit Template" : "New Template"}
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded transition-all"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Name + Type row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="5×400m Track Session"
                  className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as SessionType)}
                  className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                >
                  {SESSION_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>Description <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief notes on purpose or execution…"
                rows={2}
                className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all resize-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Duration + TSS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>Duration (min)</label>
                <input
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="60"
                  className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>TSS</label>
                <input
                  type="number"
                  min={0}
                  value={tss}
                  onChange={(e) => setTss(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="85"
                  className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            {/* Blocks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>Workout Blocks</label>
                <button
                  type="button"
                  onClick={addBlock}
                  className="flex items-center gap-1 text-[11px] font-semibold transition-all"
                  style={{ color: "var(--accent)" }}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add block
                </button>
              </div>

              {blocks.length === 0 ? (
                <div
                  className="rounded-lg px-4 py-5 text-center cursor-pointer transition-all"
                  style={{ border: "1px dashed var(--border-2)", color: "var(--text-3)" }}
                  onClick={addBlock}
                >
                  <p className="text-[12px]">No blocks yet — click to add one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blocks.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3 space-y-2"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Block number */}
                        <span className="text-[10px] font-bold tabular-nums w-4 shrink-0" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {i + 1}
                        </span>
                        {/* Type */}
                        <select
                          value={b.type}
                          onChange={(e) => updateBlock(i, "type", e.target.value)}
                          className="px-2 py-1 text-[11px] rounded outline-none"
                          style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                        >
                          {BLOCK_TYPES.map((t) => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                        {/* Duration */}
                        <input
                          type="number"
                          min={1}
                          value={b.duration_min}
                          onChange={(e) => updateBlock(i, "duration_min", e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="min"
                          className="w-14 px-2 py-1 text-[11px] rounded outline-none text-center"
                          style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                        />
                        {/* Intensity */}
                        <input
                          type="text"
                          value={b.intensity}
                          onChange={(e) => updateBlock(i, "intensity", e.target.value)}
                          placeholder="Z3 / RPE 7"
                          className="w-20 px-2 py-1 text-[11px] rounded outline-none"
                          style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                        />
                        {/* Reps */}
                        <input
                          type="number"
                          min={1}
                          value={b.reps}
                          onChange={(e) => updateBlock(i, "reps", e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="reps"
                          className="w-14 px-2 py-1 text-[11px] rounded outline-none text-center"
                          style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                        />
                        <div className="flex-1" />
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeBlock(i)}
                          className="h-5 w-5 flex items-center justify-center rounded shrink-0 transition-all"
                          style={{ color: "var(--text-3)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {/* Description */}
                      <input
                        type="text"
                        value={b.description}
                        onChange={(e) => updateBlock(i, "description", e.target.value)}
                        placeholder="e.g. 400m at 5K pace with 90s recovery"
                        className="w-full px-2 py-1 text-[12px] rounded outline-none"
                        style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Share toggle */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>Share with other coaches</p>
                <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                  {isShared ? "Visible to all coaches on the platform" : "Only visible to you"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShared((v) => !v)}
                className="relative h-5 w-9 rounded-full transition-all duration-200 shrink-0"
                style={{ background: isShared ? "var(--accent)" : "var(--surface-3)" }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200"
                  style={{
                    background: "#fff",
                    left: isShared ? "calc(100% - 18px)" : "2px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            {error && (
              <p className="text-[11px] px-3 py-2 rounded" style={{ background: "var(--red-dim)", color: "var(--red)" }}>
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2 px-6 py-4 shrink-0"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-[12px] font-semibold transition-all disabled:opacity-50"
                style={{ color: "var(--red)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--red-dim)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-[12px] font-semibold transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
