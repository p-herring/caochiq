/**
 * Typed API client for the Fastify backend.
 * All requests include the Supabase auth token.
 */

import type {
  AthleteWithProfile,
  SessionWithBlocks,
  TrainingPlan,
  WorkoutLog,
  Insight,
  Message,
  ComplianceData,
  TodayResponse,
  CreateSession,
  CreateTrainingPlan,
  UpdateAthleteProfile,
  CreateMessage,
} from "@coaching/shared";

const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1";

async function getToken(): Promise<string> {
  // Import dynamically to avoid SSR issues
  const { createClient } = await import("./supabase");
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const json = (await res.json()) as { success: boolean; data?: T; error?: unknown };

  if (!json.success) {
    throw new Error(JSON.stringify(json.error));
  }

  return json.data as T;
}

// ─── Athletes ─────────────────────────────────────────────────────────────────

export const api = {
  athletes: {
    list: () => request<AthleteWithProfile[]>("/athletes"),
    create: (data: { full_name: string; email: string }) =>
      request<AthleteWithProfile>("/athletes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<AthleteWithProfile>(`/athletes/${id}`),
    updateProfile: (id: string, data: UpdateAthleteProfile) =>
      request(`/athletes/${id}/profile`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    getSessions: (id: string, week?: string) =>
      request<SessionWithBlocks[]>(
        `/athletes/${id}/sessions${week ? `?week=${week}` : ""}`
      ),
    getCompliance: (id: string) =>
      request<ComplianceData>(`/athletes/${id}/compliance`),
    getInsights: (id: string) =>
      request<Insight[]>(`/athletes/${id}/insights`),
    getRaces: (id: string) =>
      request(`/athletes/${id}/races`),
  },

  plans: {
    create: (data: CreateTrainingPlan) =>
      request<TrainingPlan>("/plans", { method: "POST", body: JSON.stringify(data) }),
    getActive: (athleteId: string) =>
      request<TrainingPlan | null>(`/plans?athlete_id=${athleteId}`),
    get: (id: string) =>
      request<TrainingPlan & { sessions: SessionWithBlocks[] }>(`/plans/${id}`),
    update: (id: string, data: Partial<CreateTrainingPlan>) =>
      request<TrainingPlan>(`/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/plans/${id}`, { method: "DELETE" }),
  },

  sessions: {
    get: (id: string) => request<SessionWithBlocks>(`/sessions/${id}`),
    create: (data: CreateSession) =>
      request<SessionWithBlocks>("/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<CreateSession>) =>
      request<SessionWithBlocks>(`/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/sessions/${id}`, { method: "DELETE" }),
    reorderBlocks: (sessionId: string, blockIds: string[]) =>
      request(`/sessions/${sessionId}/blocks/reorder`, {
        method: "POST",
        body: JSON.stringify({ block_ids: blockIds }),
      }),
  },

  logs: {
    getAthleteHistory: (athleteId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return request<WorkoutLog[]>(
        `/athletes/${athleteId}/logs${params.size ? `?${params}` : ""}`
      );
    },
  },

  insights: {
    list: (athleteId?: string) =>
      request<Insight[]>(`/insights${athleteId ? `?athlete_id=${athleteId}` : ""}`),
    dismiss: (id: string) =>
      request<Insight>(`/insights/${id}/dismiss`, { method: "POST" }),
  },

  messages: {
    thread: (withUserId: string) =>
      request<Message[]>(`/messages?with=${withUserId}`),
    send: (data: CreateMessage) =>
      request<Message>("/messages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    markRead: (id: string) =>
      request<Message>(`/messages/${id}/read`, { method: "PATCH" }),
    unreadCount: () => request<{ count: number }>("/messages/unread-count"),
  },

  today: {
    get: () => request<TodayResponse>("/today"),
  },

  integrations: {
    status: () => request("/integrations/status"),
    stravaConnect: () =>
      request<{ url: string }>("/integrations/strava/connect"),
    stravaDisconnect: () =>
      request("/integrations/strava", { method: "DELETE" }),
    stravaSync: () =>
      request<{ synced_count: number }>("/integrations/strava/sync", {
        method: "POST",
      }),
  },
};
