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

  // Already absolute (http:// or https://)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Relative URL (e.g., /media/...)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    // Fallback if env not set (dev mode might lack it)
    return url;
  }

  return `${apiBase}${url}`;
}
