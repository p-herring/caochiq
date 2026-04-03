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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.athletes.list()
      .then(setAthletes)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load athletes"))
      .finally(() => setLoading(false));
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

          {/* Add Athlete */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-[12px] font-semibold transition-all duration-150"
            style={{ background: "var(--accent)", color: "#fff" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Athlete
          </button>
        </div>
      </div>

      {showModal && (
        <AddAthleteModal
          onClose={() => setShowModal(false)}
          onCreated={(a) => {
            setAthletes((prev) => [a, ...prev]);
            setShowModal(false);
          }}
        />
      )}

      {/* Table */}
      {loading ? (
        <LoadingSkeleton />
      ) : loadError ? (
        <div className="rounded-lg px-8 py-12 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--red)" }}>Failed to load athletes</p>
          <p className="text-[11px] font-mono" style={{ color: "var(--text-3)" }}>{loadError}</p>
        </div>
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

type SearchResult = { id: string; full_name: string; email: string };

function AddAthleteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: AthleteWithProfile) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  React.useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.athletes.search(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleAssign(r: SearchResult) {
    setError(null);
    setSaving(true);
    try {
      const athlete = await api.athletes.assign(r.id);
      onCreated({ ...athlete, compliance_7d: 0, active_flags: 0, next_race: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add athlete");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const athlete = await api.athletes.create({ full_name: fullName.trim(), email: email.trim() });
      onCreated({ ...athlete, compliance_7d: 0, active_flags: 0, next_race: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create athlete");
    } finally {
      setSaving(false);
    }
  }

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2
            className="text-[18px] font-bold leading-none tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Add Athlete
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

        <div className="px-5 pb-5 space-y-3">
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
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowCreate(false); setError(null); }}
              placeholder="Search by name or email…"
              className="w-full pl-8 pr-4 py-2 text-[13px] rounded outline-none transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              autoFocus
            />
          </div>

          {/* Search results */}
          {query.trim().length >= 2 && (
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {searching ? (
                <div className="px-4 py-3 text-[12px]" style={{ color: "var(--text-3)" }}>Searching…</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-[12px]" style={{ color: "var(--text-3)" }}>No unassigned athletes found.</div>
              ) : (
                results.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{ borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div
                      className="h-7 w-7 rounded shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "var(--surface-3)", color: "var(--text-2)", fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {initials(r.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{r.full_name}</p>
                      <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{r.email}</p>
                    </div>
                    <button
                      onClick={() => handleAssign(r)}
                      disabled={saving}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded transition-all disabled:opacity-50 shrink-0"
                      style={{ background: "var(--accent)", color: "#fff" }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {error && (
            <p className="text-[11px] px-3 py-2 rounded" style={{ background: "var(--red-dim)", color: "var(--red)" }}>
              {error}
            </p>
          )}

          {/* Divider + create new */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-3)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {!showCreate ? (
            <button
              onClick={() => { setShowCreate(true); setFullName(query.trim()); }}
              className="w-full py-2 rounded text-[12px] font-semibold transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              Create new athlete
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-3)" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-3 py-2 text-[13px] rounded outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded text-[12px] font-semibold transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded text-[12px] font-semibold transition-all disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {saving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
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
      <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>Click "Add Athlete" to get started.</p>
    </div>
  );
}
