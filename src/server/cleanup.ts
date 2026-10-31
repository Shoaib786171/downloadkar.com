/**
 * downloadkar - Temporary File Cleanup Service
 * Automatically purges temporary files older than TTL (15 minutes).
 */

import fs from 'fs';
import path from 'path';

export const TEMP_BASE_DIR = path.resolve('/tmp/downloadkar_jobs');
export const UPLOAD_DIR = path.join(TEMP_BASE_DIR, 'uploads');
export const OUTPUT_DIR = path.join(TEMP_BASE_DIR, 'outputs');

export function initTempDirectories(): void {
  try {
    if (!fs.existsSync(TEMP_BASE_DIR)) fs.mkdirSync(TEMP_BASE_DIR, { recursive: true });
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to initialize temporary directories:', err);
  }
}

/**
 * Scans directory and deletes files older than maxAgeMs (default 15 minutes).
 */
export function cleanupOldFiles(dirPath: string, maxAgeMs: number = 15 * 60 * 1000): void {
  if (!fs.existsSync(dirPath)) return;

  const now = Date.now();
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
        }
      } catch {
        // Ignore single file error
      }
    }
  } catch {
    // Ignore directory scan error
  }
}

/**
 * Starts background cleaner timer.
 */
export function startCleanupTimer(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  initTempDirectories();
  const timer = setInterval(() => {
    cleanupOldFiles(UPLOAD_DIR);
    cleanupOldFiles(OUTPUT_DIR);
  }, intervalMs);
  timer.unref();
  return timer;
}
