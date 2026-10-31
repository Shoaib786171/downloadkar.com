/**
 * downloadkar - Enterprise Application Security Shield
 * 
 * Provides multi-layer defense against:
 * 1. XSS (Cross-Site Scripting) & HTML Tag Injection
 * 2. ReDoS (Regular Expression Denial of Service)
 * 3. Malicious URL Schemes (javascript:, data:, vbscript:, file:, blob:)
 * 4. SSRF & Internal IP / Host Spoofing
 * 5. Path Traversal & Arbitrary File Overwrite
 * 6. Prototype Pollution via LocalStorage
 * 7. Client-Side Request Flooding / Brute Force (Rate Limiting)
 */

// Maximum allowed URL length to prevent buffer exhaustion and ReDoS
export const MAX_URL_LENGTH = 2048;

// Maximum allowed text length for user inputs (contact messages, search)
export const MAX_TEXT_LENGTH = 5000;

// Whitelisted video platform domain suffixes
const ALLOWED_DOMAIN_PATTERNS = [
  /(?:^|\.)youtube\.com$/,
  /(?:^|\.)youtu\.be$/,
  /(?:^|\.)instagram\.com$/,
  /(?:^|\.)tiktok\.com$/,
  /(?:^|\.)facebook\.com$/,
  /(?:^|\.)fb\.watch$/,
  /(?:^|\.)vimeo\.com$/,
  /(?:^|\.)twitter\.com$/,
  /(?:^|\.)x\.com$/,
];

// Dangerous URL schemes explicitly prohibited
const DANGEROUS_SCHEMES = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
  'chrome:',
  'ms-appx:',
  'intent:',
  'market:',
];

// Dangerous file extensions disallowed in media downloads
const FORBIDDEN_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'py', 'js', 'vbs', 'jar', 'apk',
  'msi', 'scr', 'dll', 'com', 'hta', 'ps1', 'reg', 'svg', 'html', 'htm'
];

/**
 * Validates and sanitizes incoming video URLs against malicious schemes,
 * ReDoS payloads, private IP address ranges, and credential injection.
 */
export function validateAndSanitizeUrl(rawUrl: string): {
  isValid: boolean;
  sanitizedUrl: string;
  error?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, sanitizedUrl: '', error: 'URL is required.' };
  }

  // 1. Length constraint check (anti-Buffer Overflow / anti-ReDoS)
  const trimmed = rawUrl.trim();
  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      sanitizedUrl: '',
      error: `Security Alert: URL exceeds maximum safe length of ${MAX_URL_LENGTH} characters.`,
    };
  }

  // 2. Check for dangerous URL schemes
  const lowerUrl = trimmed.toLowerCase();
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lowerUrl.startsWith(scheme)) {
      return {
        isValid: false,
        sanitizedUrl: '',
        error: `Security Alert: Dangerous URL protocol "${scheme}" blocked to prevent malicious script execution.`,
      };
    }
  }

  // 3. Check for HTML/Script injection in the URL string
  if (/[<>'"`;\(\)\{\}\[\]]/.test(trimmed)) {
    return {
      isValid: false,
      sanitizedUrl: '',
      error: 'Security Alert: Malicious characters detected in URL string (potential XSS injection).',
    };
  }

  // 4. Ensure URL starts with http:// or https:// (or prepend https://)
  let urlToParse = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    urlToParse = `https://${trimmed}`;
  }

  // 5. URL parser validation
  let parsed: URL;
  try {
    parsed = new URL(urlToParse);
  } catch {
    return {
      isValid: false,
      sanitizedUrl: '',
      error: 'Invalid URL format. Please provide a well-formed video link.',
    };
  }

  // 6. Enforce strict HTTPS/HTTP protocol
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      isValid: false,
      sanitizedUrl: '',
      error: 'Security Alert: Only secure HTTP/HTTPS protocols are permitted.',
    };
  }

  // 7. Prevent Embedded User Credentials (anti-SSRF / anti-spoofing)
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      sanitizedUrl: '',
      error: 'Security Alert: User credentials embedded in URLs are strictly prohibited.',
    };
  }

  // 8. Prevent Localhost / Private Loopback IP / SSRF attacks
  const hostname = parsed.hostname.toLowerCase();
  const isPrivateIp =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal');

  if (isPrivateIp) {
    return {
      isValid: false,
      sanitizedUrl: '',
      error: 'Security Alert: Internal private network addresses are blocked for security.',
    };
  }

  // 9. Domain whitelist validation against supported platforms
  const isDomainAllowed = ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname));
  if (!isDomainAllowed) {
    return {
      isValid: false,
      sanitizedUrl: parsed.toString(),
      error: 'Domain not supported. Only verified links from YouTube, Instagram, TikTok, Facebook, and Vimeo are allowed.',
    };
  }

  return {
    isValid: true,
    sanitizedUrl: parsed.toString(),
  };
}

/**
 * Strips HTML tags, script vectors, and control characters to prevent DOM XSS.
 */
export function sanitizeText(input: string, maxLength: number = MAX_TEXT_LENGTH): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Strip brackets
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '') // Strip inline event handlers like onclick=, onerror=
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control characters
    .trim();
}

/**
 * Sanitizes download filenames against Path Traversal (../) and executable extensions.
 */
export function sanitizeFilenameSecure(rawTitle: string, rawExtension: string): string {
  const safeExt = (rawExtension.toLowerCase() === 'mp3' ? 'mp3' : 'mp4');

  // Strip null bytes, path traversal sequences, and dangerous characters
  const cleanTitle = rawTitle
    .replace(/\0/g, '') // Null byte injection
    .replace(/\.\./g, '') // Directory traversal ..
    .replace(/[\\\/:\*\?"<>\|]/g, '') // Windows & Linux illegal filename characters
    .replace(/[^a-zA-Z0-9_\-\s]/g, '') // Keep strictly alphanumeric, hyphens, underscores
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 48);

  const finalName = cleanTitle || 'video_stream';

  // Ensure extension is not on forbidden list
  if (FORBIDDEN_EXTENSIONS.includes(safeExt)) {
    return `downloadkar_${finalName}.mp4`;
  }

  return `downloadkar_${finalName}.${safeExt}`;
}

/**
 * Sliding Window Client-Side Rate Limiter (Anti-Flood / Anti-DDoS Shield)
 * Limits requests to at most `maxRequests` in `windowMs`.
 */
class ClientRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 6, windowMs: number = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public check(): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    // Filter timestamps within current window
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const remainingMs = this.windowMs - (now - oldest);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(remainingMs / 1000),
      };
    }

    this.timestamps.push(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export const requestRateLimiter = new ClientRateLimiter(6, 10000); // Max 6 requests per 10s

/**
 * Safe JSON parser with Prototype Pollution Defense
 * Rejects JSON objects containing __proto__, constructor, or prototype keys.
 */
export function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) return fallback;

  // Prototype pollution filter
  if (
    jsonString.includes('__proto__') ||
    jsonString.includes('constructor') ||
    jsonString.includes('prototype')
  ) {
    console.warn('Security Alert: Malicious prototype pollution payload detected in storage. Purging.');
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}
