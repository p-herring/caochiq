"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AthleteWithProfile, TrainingPlan } from "@coaching/shared";
import WeekPlanner from "@/components/planner/WeekPlanner";

export default function PlannerPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const [athlete, setAthlete] = useState<AthleteWithProfile | null>(null);
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.athletes.get(id),
      api.plans.getActive(id),
    ]).then(([a, plan]) => {
      setAthlete(a);
      setActivePlan(plan);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleCreatePlan() {
    setCreating(true);
    try {
      const today = new Date().toISOString().split("T")[0]!;
      const plan = await api.plans.create({
        athlete_id: id,
        name: `${new Date().getFullYear()} Training Plan`,
        start_date: today,
        end_date: null,
        is_active: true,
      });
      setActivePlan(plan);
    } finally {
      setCreating(false);
    }
  }

  const initials = athlete?.full_name
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "…";

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-7">
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
        <Link
          href={`/athletes/${id}`}
          className="text-[11px] transition-colors duration-150"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
        >
          {loading ? "…" : (athlete?.full_name ?? "Athlete")}
        </Link>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ color: "var(--text-3)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[11px]" style={{ color: "var(--text-2)" }}>Planner</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3.5">
          <div
            className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-[13px] font-bold"
            style={{
              background: "var(--surface-3)",
              color: "var(--text-2)",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {initials}
          </div>
          <div>
            <h1
              className="text-[24px] font-bold leading-tight tracking-tight"
              style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {loading ? "Loading…" : `${athlete?.full_name ?? "Athlete"}'s Planner`}
            </h1>
            {activePlan && (
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                {activePlan.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activePlan && (
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--green)" }}
              />
              <span className="text-[11px]" style={{ color: "var(--text-3)" }}>Plan active</span>
            </div>
          )}

          {/* Back to profile */}
          <Link
            href={`/athletes/${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all duration-150"
            style={{
              background: "var(--surface)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Profile
          </Link>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <PlannerSkeleton />
      ) : !activePlan ? (
        <NoPlanState
          athleteName={athlete?.full_name ?? "this athlete"}
          onCreate={handleCreatePlan}
          creating={creating}
        />
      ) : (
        <WeekPlanner athleteId={id} planId={activePlan.id} />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function NoPlanState({
  athleteName,
  onCreate,
  creating,
}: {
  athleteName: string;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div
      className="rounded-lg px-8 py-20 text-center"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "var(--surface-3)" }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ color: "var(--text-3)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
      </div>
      <p className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>
        No active training plan
      </p>
      <p className="text-[13px] mb-7 max-w-xs mx-auto" style={{ color: "var(--text-3)" }}>
        Create a training plan for {athleteName} to start scheduling sessions.
      </p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-all disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#0C0C0F" }}
        onMouseEnter={(e) => { if (!creating) e.currentTarget.style.opacity = "0.9"; }}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {creating ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating…
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create training plan
          </>
        )}
      </button>
    </div>
  );
}

function PlannerSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 rounded w-48" style={{ background: "var(--surface-2)" }} />
      <div className="grid grid-cols-7 gap-2">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="h-72 rounded-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}
