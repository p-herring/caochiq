import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AthleteRoster from "@/components/dashboard/AthleteRoster";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import QuickStats from "@/components/dashboard/QuickStats";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  void user;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1.5" style={{ color: "var(--text-3)" }}>
            CoachIQ
          </p>
          <h1
            className="text-[28px] font-bold leading-none tracking-tight"
            style={{ color: "var(--text-1)", fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Overview
          </h1>
        </div>
        <p className="text-[12px] pb-0.5" style={{ color: "var(--text-3)", fontFamily: "'JetBrains Mono', monospace" }}>
          {today}
        </p>
      </div>

      {/* Stats row */}
      <QuickStats />

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AthleteRoster />
        </div>
        <div>
          <AlertsFeed />
        </div>
      </div>
    </div>
  );
}
