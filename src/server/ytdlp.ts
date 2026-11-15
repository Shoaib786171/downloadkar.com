/**
 * downloadkar - yt-dlp Platform Downloader
 *
 * Resolves supported platform URLs (YouTube, Facebook, Instagram, TikTok,
 * Vimeo, X, and more) into local media files that the FFmpeg engine can
 * probe, trim, overlay, and transcode.
 *
 * Platforms like Facebook and Instagram increasingly require an authenticated
 * session. When a plain request fails, we automatically retry while importing
 * cookies from the user's locally installed browsers.
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { ytDlpBin } from './binaries';

export interface YtDlpMetadata {
  title?: string;
  author?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  platformName?: string;
  extractorKey?: string;
  /** Unique video heights available for this media, sorted descending. */
  resolutions?: number[];
}

// Browsers tried (in order) when a cookie-less request fails.
const COOKIE_BROWSERS = ['firefox', 'chrome', 'edge', 'brave', 'opera', 'vivaldi'];

// Failure signatures that suggest the platform wants an authenticated
// session — only then do we bother retrying with browser cookies.
const AUTH_ERROR_RE = /sign in|log ?in|logged|cookie|private|age.?restrict|cannot parse|not a bot|403|401/i;

// Failures that are usually transient CDN/rate-limit issues worth one retry.
const TRANSIENT_ERROR_RE = /403|429|50[023]|timed? ?out|timeout|connection reset|temporarily unavailable|unable to download video data/i;

function formatSeconds(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const DIRECT_MEDIA_REGEX = /\.(mp4|webm|mkv|mov|avi|mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i;

/**
 * Returns true when the URL points straight at a media file that FFmpeg
 * can read itself. Everything else is treated as a platform page URL
 * that must be resolved through yt-dlp first.
 */
export function isDirectMediaUrl(url: string): boolean {
  return DIRECT_MEDIA_REGEX.test(url);
}

function buildCommonArgs(): string[] {
  return [
    '--newline',
    '--no-warnings',
    '--socket-timeout', '30',
    // Fetch DASH/HLS fragments in parallel for faster downloads
    '-N', '8',
  ];
}

/**
 * Runs a single yt-dlp attempt. Returns null on spawn error.
 */
function runYtDlpOnce(
  args: string[],
  handlers: {
    onStdoutLine?: (line: string) => void;
    onStderrLine?: (line: string) => void;
    timeoutMs?: number;
  }
): { promise: Promise<{ code: number | null; stdout: string; stderrTail: string }>; cancel: () => void } {
  const proc: ChildProcessWithoutNullStreams = spawn(ytDlpBin(), args);
  let stdout = '';
  let stderrTail = '';
  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    if (proc && !proc.killed) {
      proc.kill('SIGKILL');
    }
  };

  const promise = new Promise<{ code: number | null; stdout: string; stderrTail: string }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cancel();
      reject(new Error('yt-dlp timed out.'));
    }, handlers.timeoutMs ?? 10 * 60 * 1000);

    const feed = (chunk: Buffer, isErr: boolean) => {
      const text = chunk.toString();
      if (isErr) {
        stderrTail = (stderrTail + text).slice(-2000);
        const lines = text.split(/\r?\n/);
        for (const line of lines) if (line.trim()) handlers.onStderrLine?.(line);
      } else {
        stdout += text;
        const lines = text.split(/\r?\n/);
        for (const line of lines) if (line.trim()) handlers.onStdoutLine?.(line);
      }
    };

    proc.stdout.on('data', (d) => feed(d, false));
    proc.stderr.on('data', (d) => feed(d, true));

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (isCancelled) {
        return reject(new Error('yt-dlp was cancelled.'));
      }
      resolve({ code, stdout, stderrTail });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return { promise, cancel };
}

/**
 * Fetches video metadata for a platform URL without downloading media.
 * Returns null when yt-dlp is unavailable or cannot resolve the URL.
 */
export async function fetchYtDlpMetadata(url: string): Promise<YtDlpMetadata | null> {
  const attempts: (string | null)[] = [null, ...COOKIE_BROWSERS];

  for (const browser of attempts) {
    const args = ['--dump-single-json', '--no-warnings', '--socket-timeout', '15'];
    if (browser) args.push('--cookies-from-browser', browser);
    args.push(url);

    try {
      const { promise } = runYtDlpOnce(args, { timeoutMs: 25000 });
      const { code, stdout, stderrTail } = await promise;
      if (code !== 0 || !stdout.trim()) {
        // Only keep trying browsers when the failure looks auth-related.
        if (!AUTH_ERROR_RE.test(stderrTail)) return null;
        continue;
      }

      const json = JSON.parse(stdout);
      const entries = Array.isArray(json.entries) ? json.entries : [json];
      const info = entries[0] || {};
      if (!info.title) continue;

      const duration = typeof info.duration === 'number' ? info.duration : undefined;

      const heights = new Set<number>();
      for (const f of (info.formats || [])) {
        if (f && typeof f.height === 'number' && f.height > 0 && f.vcodec && f.vcodec !== 'none') {
          heights.add(Math.round(f.height));
        }
      }
      const resolutions = [...heights].sort((a, b) => b - a);

      return {
        title: info.title || undefined,
        author: info.uploader || info.channel || info.creator || undefined,
        authorUrl: info.uploader_url || info.channel_url || info.creator_url || undefined,
        thumbnailUrl: info.thumbnail || undefined,
        durationSeconds: duration,
        durationFormatted: duration !== undefined ? formatSeconds(duration) : undefined,
        platformName: info.extractor_key || undefined,
        extractorKey: info.extractor_key || undefined,
        resolutions: resolutions.length ? resolutions : undefined,
      };
    } catch {
      // Try next browser / give up
    }
  }

  return null;
}

/**
 * Downloads a platform URL to a local media file using yt-dlp.
 * Automatically retries with browser cookies when the plain request fails
 * (required by Facebook, Instagram and other login-walled platforms).
 * Reports download percentage (0-100) through onProgress.
 */
export function downloadWithYtDlp(
  url: string,
  outputPath: string,
  options: { audioOnly?: boolean; maxHeight?: number } = {},
  onProgress: (percent: number, speed?: string) => void = () => {}
): {
  promise: Promise<void>;
  cancel: () => void;
} {
  const attempts: (string | null)[] = [null, ...COOKIE_BROWSERS];
  let activeCancel: () => void = () => {};
  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    activeCancel();
  };

  const baseArgs = buildCommonArgs();
  if (options.audioOnly) {
    baseArgs.push('-f', 'ba/best', '-x', '--audio-format', 'mp3');
  } else if (options.maxHeight && options.maxHeight > 0) {
    // Cap the download at the requested resolution so we never pull a
    // 4K master when the user only wants 720p. Prefer H.264 (avc1) so the
    // FFmpeg stage can remux (-c copy) instead of re-encoding.
    const h = Math.floor(options.maxHeight);
    baseArgs.push(
      '-f', `bv*[vcodec^=avc1][height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[vcodec^=avc1][height<=${h}]+ba[ext=m4a]/bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[height<=${h}]+ba/b[height<=${h}]/b`,
      '--merge-output-format', 'mp4'
    );
  } else {
    baseArgs.push(
      '-f', 'bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b',
      '--merge-output-format', 'mp4'
    );
  }
  baseArgs.push('-o', outputPath, url);

  const promise = (async () => {
    let firstError: Error | null = null;

    // Round 0 tries plain then browser-cookie fallbacks. Round 1 (only when the
    // failure looked transient, e.g. a 403/429 from the CDN) retries plain once.
    for (let round = 0; round < 2; round++) {
      if (isCancelled) throw new Error('Download was cancelled by user.');
      if (round > 0) await new Promise((r) => setTimeout(r, 2000));

      const roundAttempts: (string | null)[] = round === 0 ? attempts : [null];
      let sawTransient = false;
      let exhausted = false;

      for (const browser of roundAttempts) {
        if (isCancelled) throw new Error('Download was cancelled by user.');

        const args = [...baseArgs];
        if (browser) args.push('--cookies-from-browser', browser);

        const tailBox = { value: '' };
        const handleLine = (line: string, isErr: boolean) => {
          const trimmed = line.trim();

          const dlMatch = trimmed.match(/\[download\]\s+([\d.]+)%/);
          if (dlMatch) {
            const pct = Math.min(99, Math.max(1, Math.round(parseFloat(dlMatch[1]))));
            const speedMatch = trimmed.match(/at\s+([\d.]+\w+\/s)/);
            onProgress(pct, speedMatch ? speedMatch[1] : undefined);
            return;
          }

          if (/\[(Merger|VideoRemuxer|ExtractAudio|FixupM3u8|FFmpegFixup)\]/.test(trimmed)) {
            onProgress(99);
            return;
          }

          if (isErr && /ERROR:|Unable to download|Requested format|Sign in to confirm|Private video|Video unavailable|HTTP Error|Cannot parse/i.test(trimmed)) {
            tailBox.value = (tailBox.value + '\n' + trimmed).slice(-1000);
          }
        };

        const attempt = runYtDlpOnce(args, {
          onStdoutLine: (l) => handleLine(l, false),
          onStderrLine: (l) => handleLine(l, true),
          timeoutMs: 10 * 60 * 1000,
        });
        activeCancel = attempt.cancel;

        try {
          const { code } = await attempt.promise;
          if (code === 0) {
            onProgress(100);
            return;
          }
          const err = new Error(`yt-dlp exited with code ${code}${tailBox.value ? `: ${tailBox.value.slice(-400)}` : ''}`);
          if (!firstError) firstError = err;
        } catch (err: any) {
          if (isCancelled) throw new Error('Download was cancelled by user.');
          if (!firstError) firstError = err instanceof Error ? err : new Error(String(err));
        }

        if (isCancelled) throw new Error('Download was cancelled by user.');

        if (TRANSIENT_ERROR_RE.test(tailBox.value)) sawTransient = true;

        // Only keep trying browsers when the failure looks auth-related.
        // Otherwise fail fast and surface the real error.
        if (!AUTH_ERROR_RE.test(tailBox.value)) {
          exhausted = true;
          break;
        }
      }

      if (!sawTransient || exhausted) break;
    }

    throw firstError || new Error('yt-dlp failed to download the media.');
  })();

  return { promise, cancel };
}
