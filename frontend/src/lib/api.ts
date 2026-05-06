import type {
  ActivityLogResponse,
  AuditLogEntry,
  CsvImportResult,
  DepartmentAnalytics,
  LeaderboardEntry,
  LogSubmission,
  NotificationItem,
  OperationsSummary,
  RecentActivityLog,
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
  getRecentLogs: (accessToken: string, limit = 8) =>
    request<RecentActivityLog[]>(`/logs/recent?limit=${limit}`, accessToken),
  getOperationsSummary: (accessToken: string) => request<OperationsSummary>("/operations/summary", accessToken),
  
  // Operations endpoints
  getAuditLogs: (
    accessToken: string,
    filters?: { entityType?: string; entityId?: string; startDate?: string; endDate?: string }
  ) => {
    const params = new URLSearchParams();
    if (filters?.entityType) params.append("entityType", filters.entityType);
    if (filters?.entityId) params.append("entityId", filters.entityId);
    if (filters?.startDate) params.append("from", filters.startDate);
    if (filters?.endDate) params.append("to", filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<AuditLogEntry[]>(`/operations/audit-logs${query}`, accessToken);
  },

  getNotifications: (accessToken: string, read?: boolean) => {
    const query = read !== undefined ? `?isRead=${read}` : "";
    return request<NotificationItem[]>(`/operations/notifications${query}`, accessToken);
  },

  importActivityLogsFromCsv: async (file: File, accessToken: string) => {
    const csvText = await file.text();
    return request<CsvImportResult>("/operations/imports/logs", accessToken, {
      method: "POST",
      body: JSON.stringify({ csvText }),
    });
  },

  exportActivityCsv: (accessToken: string, format: "activity" | "audit" | "analytics" = "activity") =>
    fetch(`${API_BASE_URL}/operations/exports/${format}?format=csv`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res) => {
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      return res.blob();
    }),

  exportActivityPdf: (accessToken: string) =>
    fetch(`${API_BASE_URL}/operations/exports/compliance?format=pdf`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res) => {
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      return res.blob();
    }),

  markNotificationRead: (accessToken: string, id: number) =>
    request<{ ok: boolean }>(`/operations/notifications/${id}/read`, accessToken, { method: "PATCH" }),
  dismissNotification: (accessToken: string, id: number) =>
    request<{ ok: boolean }>(`/operations/notifications/${id}`, accessToken, { method: "DELETE" }),
  dismissAllNotifications: (accessToken: string) =>
    request<{ count: number }>("/operations/notifications", accessToken, { method: "DELETE" }),
};