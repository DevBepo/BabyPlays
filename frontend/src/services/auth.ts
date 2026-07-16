import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  AdminMeResponse,
  AuthMeResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  PasswordResetResponse,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
  UpdateMePayload,
} from "@/types/auth";

const AUTH_ENDPOINTS = {
  me: "/api/auth/me/",
  adminMe: "/api/admin/me/",
  login: "/api/auth/login/",
  logout: "/api/auth/logout/",
  password: "/api/auth/senha/",
  requestPasswordReset: "/api/auth/esqueci-senha/",
  resetPassword: "/api/auth/redefinir-senha/",
};

export function getMe(): Promise<AuthMeResponse> {
  return apiGet<AuthMeResponse>(AUTH_ENDPOINTS.me);
}

export function updateMe(payload: UpdateMePayload): Promise<AuthMeResponse> {
  return apiPatch<AuthMeResponse>(AUTH_ENDPOINTS.me, payload);
}

export function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> {
  return apiPost<ChangePasswordResponse>(AUTH_ENDPOINTS.password, payload);
}

export function requestPasswordReset(
  payload: RequestPasswordResetPayload,
): Promise<PasswordResetResponse> {
  return apiPost<PasswordResetResponse>(AUTH_ENDPOINTS.requestPasswordReset, payload);
}

export function resetPassword(
  payload: ResetPasswordPayload,
): Promise<PasswordResetResponse> {
  return apiPost<PasswordResetResponse>(AUTH_ENDPOINTS.resetPassword, payload);
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
