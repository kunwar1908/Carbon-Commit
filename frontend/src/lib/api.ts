import type {
  ActivityLogResponse,
  DepartmentAnalytics,
  LeaderboardEntry,
  LogSubmission,
  ReferenceData,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, accessToken?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { data: T };
  return payload.data;
}

export const api = {
  getReferenceData: (accessToken: string) => request<ReferenceData>("/analytics/reference-data", accessToken),
  getAnalytics: (accessToken: string) => request<DepartmentAnalytics[]>("/analytics", accessToken),
  getLeaderboard: (accessToken: string) => request<LeaderboardEntry[]>("/leaderboard", accessToken),
  submitLog: (body: LogSubmission, accessToken: string) =>
    request<ActivityLogResponse>("/logs", accessToken, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};