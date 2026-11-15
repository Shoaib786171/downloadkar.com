const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
