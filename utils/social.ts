/**
 * Extract Instagram username/ID from various Instagram URL formats.
 * Handles profile links (e.g. from iframe embed src or share links).
 * @param input - Full URL (e.g. https://www.instagram.com/the_window_seat/) or handle (e.g. the_window_seat or @the_window_seat)
 * @returns The Instagram username without @ or null if not parseable
 */
export function extractInstagramIdFromUrl(input: string | null | undefined): string | null {
  if (input == null || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Already a handle (with or without @)
  if (!trimmed.includes('instagram.com') && !trimmed.includes('instagr.am')) {
    return trimmed.replace(/^@/, '');
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (!host.includes('instagram.com') && !host.includes('instagr.am')) return null;

    // Pathname: /username or /username/ or /username/reel/...
    const pathSegments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    const first = pathSegments[0];
    if (!first) return null;

    // Known non-username paths
    const reserved = new Set([
      'p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct',
      'developer', 'about', 'legal', 'embed', 'static',
    ]);
    if (reserved.has(first.toLowerCase())) return null;

    // Instagram usernames: alphanumeric, dots, underscores (1–30 chars)
    if (/^[a-zA-Z0-9._]{1,30}$/.test(first)) return first;
    return null;
  } catch {
    return null;
  }
}

/**
 * Build Instagram profile URL from a handle or URL.
 */
export function getInstagramProfileUrl(handleOrUrl: string | null | undefined): string | null {
  const id = extractInstagramIdFromUrl(handleOrUrl);
  return id ? `https://www.instagram.com/${id}/` : null;
}
