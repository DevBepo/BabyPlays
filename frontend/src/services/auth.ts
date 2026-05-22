import { apiGet, apiPost } from "@/lib/api";
import type {
  AdminMeResponse,
  AuthMeResponse,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
} from "@/types/auth";

const AUTH_ENDPOINTS = {
  me: "/api/auth/me/",
  adminMe: "/api/admin/me/",
  login: "/api/auth/login/",
  logout: "/api/auth/logout/",
};

export function getMe(): Promise<AuthMeResponse> {
  return apiGet<AuthMeResponse>(AUTH_ENDPOINTS.me);
}

export function getAdminMe(): Promise<AdminMeResponse> {
  return apiGet<AdminMeResponse>(AUTH_ENDPOINTS.adminMe);
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiPost<LoginResponse>(AUTH_ENDPOINTS.login, payload);
}

export function logout(): Promise<LogoutResponse> {
  return apiPost<LogoutResponse>(AUTH_ENDPOINTS.logout, {});
}
