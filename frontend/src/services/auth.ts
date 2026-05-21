import { apiGet, apiPost } from "@/lib/api";
import type {
  AuthMeResponse,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
} from "@/types/auth";

const AUTH_ENDPOINTS = {
  me: "/api/auth/me/",
  login: "/api/auth/login/",
  logout: "/api/auth/logout/",
};

export function getMe(): Promise<AuthMeResponse> {
  return apiGet<AuthMeResponse>(AUTH_ENDPOINTS.me);
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiPost<LoginResponse>(AUTH_ENDPOINTS.login, payload);
}

export function logout(): Promise<LogoutResponse> {
  return apiPost<LogoutResponse>(AUTH_ENDPOINTS.logout, {});
}
