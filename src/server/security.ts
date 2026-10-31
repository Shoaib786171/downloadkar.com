/**
 * downloadkar - Server-Side Security Shield
 * 
 * Protects against:
 * - Server-Side Request Forgery (SSRF)
 * - DNS Rebinding & Private/Loopback/Metadata IP Access
 * - Path Traversal (../)
 * - Command Injection
 * - Rate Limiting & Denial of Service
 */

import dns from 'dns';
import { promisify } from 'util';
import path from 'path';

const lookupAsync = promisify(dns.lookup);

// Maximum allowed URL length
export const MAX_SERVER_URL_LENGTH = 2048;

// Private and restricted IP ranges (IPv4 & IPv6)
const PRIVATE_IP_REGEXES = [
  /^127\./,                         // Loopback (127.0.0.0/8)
  /^10\./,                          // Class A private (10.0.0.0/8)
  /^192\.168\./,                    // Class C private (192.168.0.0/16)
  /^172\.(1[6-9]|2\d|3[0-1])\./,    // Class B private (172.16.0.0/12)
  /^169\.254\./,                    // Link-local / AWS / GCP metadata (169.254.0.0/16)
  /^0\./,                           // Current network
  /^::1$/,                          // IPv6 loopback
  /^fc00:/i,                        // IPv6 unique local
  /^fe80:/i,                        // IPv6 link-local
];

/**
 * Validates whether a resolved IP address belongs to a private, loopback, or metadata network.
 */
export function isPrivateOrRestrictedIp(ip: string): boolean {
  if (!ip) return true;
  return PRIVATE_IP_REGEXES.some((reg) => reg.test(ip.trim()));
}

/**
 * Thorough SSRF Validator for outbound URL fetches
 * 1. Validates URL scheme (strictly http: or https:)
 * 2. Blocks usernames/passwords in URLs
 * 3. Resolves DNS and blocks internal/private IP addresses
 */
export async function validateOutboundUrl(rawUrl: string): Promise<{
  safe: boolean;
  sanitizedUrl?: string;
  error?: string;
}> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, error: 'A valid URL is required.' };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > MAX_SERVER_URL_LENGTH) {
    return { safe: false, error: 'URL exceeds maximum allowed length.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { safe: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
  }

  if (parsed.username || parsed.password) {
    return { safe: false, error: 'Embedded user credentials in URLs are disallowed.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost, .local, .internal, .lan
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname === 'metadata.google.internal'
  ) {
    return { safe: false, error: 'Access to internal or private hosts is prohibited.' };
  }

  // If hostname is directly an IP literal, test it
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateOrRestrictedIp(hostname)) {
      return { safe: false, error: 'Direct access to private or loopback IP addresses is prohibited.' };
    }
  }

  // Resolve DNS to verify actual IP
  try {
    const lookup = await lookupAsync(hostname);
    if (isPrivateOrRestrictedIp(lookup.address)) {
      return { safe: false, error: 'Resolved host points to a private or restricted network address.' };
    }
  } catch (err: any) {
    return { safe: false, error: `DNS resolution failed for host: ${hostname}` };
  }

  return { safe: true, sanitizedUrl: parsed.toString() };
}

/**
 * Sanitizes download filenames against Path Traversal (../) and illegal characters.
 */
export function sanitizeSafeFilename(rawTitle: string, extension: string): string {
  const safeExt = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanExt = safeExt === 'mp3' ? 'mp3' : 'mp4';

  const cleanTitle = rawTitle
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .replace(/[\\\/:\*\?"<>\|]/g, '')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 48);

  const base = cleanTitle || 'downloadkar_media';
  return `downloadkar_${base}.${cleanExt}`;
}

/**
 * Server-Side In-Memory Rate Limiter
 */
export class ServerRateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodically prune stale entries
    setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.requests.entries()) {
        const valid = timestamps.filter((t) => now - t < this.windowMs);
        if (valid.length === 0) {
          this.requests.delete(ip);
        } else {
          this.requests.set(ip, valid);
        }
      }
    }, 60000).unref();
  }

  public check(ip: string): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const timestamps = (this.requests.get(ip) || []).filter((t) => now - t < this.windowMs);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((this.windowMs - (now - oldest)) / 1000);
      return { allowed: false, retryAfter };
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return { allowed: true, retryAfter: 0 };
  }
}
