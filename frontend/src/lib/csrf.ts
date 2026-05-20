const CSRF_ENDPOINT = "/api/auth/csrf/";

type CsrfResponse = {
  csrfToken?: unknown;
};

let cachedCsrfToken: string | null = null;

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

export async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const response = await fetch(buildApiUrl(CSRF_ENDPOINT), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel obter o token CSRF.");
  }

  const data = (await response.json().catch(() => null)) as CsrfResponse | null;
  const csrfToken = data?.csrfToken;

  if (typeof csrfToken !== "string" || !csrfToken) {
    throw new Error("Resposta invalida ao obter o token CSRF.");
  }

  cachedCsrfToken = csrfToken;
  return cachedCsrfToken;
}
