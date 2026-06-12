import { clearCsrfToken, getCsrfToken } from "./csrf";
import type { ApiError, ApiErrorData, ApiFieldErrors } from "@/types/api";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiRequestOptions = Omit<RequestInit, "body" | "credentials" | "method"> & {
  body?: unknown;
  method?: ApiMethod;
};

const MUTABLE_METHODS = new Set<ApiMethod>(["POST", "PATCH", "PUT", "DELETE"]);

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL nao esta configurada.");
  }

  return baseUrl;
}

function buildApiUrl(path: string): string {
  return new URL(path, getApiBaseUrl()).toString();
}

async function parseResponseBody(response: Response): Promise<ApiErrorData> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as ApiErrorData;
  } catch {
    return text;
  }
}

function toStringList(value: unknown): string[] | null {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    const messages = value.filter((item): item is string => typeof item === "string");
    return messages.length > 0 ? messages : null;
  }

  return null;
}

function extractFieldErrors(data: ApiErrorData): ApiFieldErrors | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const fieldErrors = Object.entries(data).reduce<ApiFieldErrors>((errors, [key, value]) => {
    const messages = toStringList(value);

    if (messages) {
      errors[key] = messages;
    }

    return errors;
  }, {});

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function getMessageFromData(data: ApiErrorData): string | undefined {
  if (typeof data === "string") {
    return data;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const detail = data.detail;
  const message = data.message;

  if (typeof detail === "string") {
    return detail;
  }

  if (typeof message === "string") {
    return message;
  }

  return undefined;
}

function getDefaultErrorMessage(status: number): string {
  if (status === 400) {
    return "Verifique os dados enviados.";
  }

  if (status === 403) {
    return "Voce nao tem permissao para realizar esta acao.";
  }

  if (status === 404) {
    return "Recurso nao encontrado.";
  }

  if (status === 503) {
    return "Servico temporariamente indisponivel.";
  }

  return "Nao foi possivel concluir a requisicao.";
}

function normalizeApiError(status: number, data: ApiErrorData): ApiError {
  const fieldErrors = status === 400 ? extractFieldErrors(data) : undefined;
  const message = getMessageFromData(data) ?? getDefaultErrorMessage(status);

  return {
    status,
    message,
    data,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function isCsrfError(error: ApiError): boolean {
  const candidates = [error.message];

  if (typeof error.data === "string") {
    candidates.push(error.data);
  }

  if (error.data && typeof error.data === "object" && !Array.isArray(error.data)) {
    const detail = error.data.detail;

    if (typeof detail === "string") {
      candidates.push(detail);
    }
  }

  return error.status === 403 && candidates.some((text) => text.toLowerCase().includes("csrf"));
}

async function apiRequestOnce<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (MUTABLE_METHODS.has(method)) {
    headers.set("X-CSRFToken", await getCsrfToken());
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    method,
    credentials: "include",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw normalizeApiError(response.status, data);
  }

  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";

  try {
    return await apiRequestOnce<T>(path, options);
  } catch (error) {
    if (
      MUTABLE_METHODS.has(method) &&
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number" &&
      isCsrfError(error as ApiError)
    ) {
      clearCsrfToken();
      return apiRequestOnce<T>(path, options);
    }

    throw error;
  }
}

export function apiGet<T>(
  path: string,
  options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "POST", body });
}

export function apiPatch<T>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "PATCH", body });
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "PUT", body });
}

export function apiDelete<T>(
  path: string,
  options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "DELETE" });
}
