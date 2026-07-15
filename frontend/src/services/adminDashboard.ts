import { apiGet } from "@/lib/api";
import type { AdminDashboardResponse } from "@/types/adminDashboard";

export function obterDashboardAdmin(): Promise<AdminDashboardResponse> {
  return apiGet<AdminDashboardResponse>("/api/admin/dashboard/");
}
