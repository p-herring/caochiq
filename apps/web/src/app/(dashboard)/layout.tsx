import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }): Promise<React.JSX.Element> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Athletes have accounts but cannot access the coach dashboard
  if (user.user_metadata?.role === 'athlete') redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
