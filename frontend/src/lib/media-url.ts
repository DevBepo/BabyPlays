/**
 * Resolve media URLs to absolute URLs.
 * If the URL is already absolute, returns it as-is.
 * If relative, prefixes with NEXT_PUBLIC_API_BASE_URL.
 * Returns null for null/undefined URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  if (URL.canParse(url)) {
    return url;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    return url;
  }

  return new URL(url, apiBase).toString();
}
