/**
 * downloadkar - Media Downloader & Conversion Client Service
 * 
 * Communicates with the real backend processing engine:
 * - Submits genuine conversion jobs (MP4 / MP3 / Trimming / Watermark Overlay)
 * - Polls real FFmpeg transcode progress
 * - Triggers authentic browser file downloads
 * - Supports job cancellation
 */

import {
  ConversionJobResponse,
  JobStatusResponse,
  TrimRange,
  VideoFormatOption,
  VideoMetadata,
} from '../types/downloader';
import { sanitizeFilenameSecure } from './security';

/**
 * Sanitizes download filename with optional trim identifier
 */
export function sanitizeFilename(
  title: string,
  extension: string,
  trimRange?: TrimRange
): string {
  let baseTitle = title;
  if (trimRange && trimRange.enabled) {
    const s = trimRange.startFormatted.replace(/:/g, 'm') + 's';
    const e = trimRange.endFormatted.replace(/:/g, 'm') + 's';
    baseTitle = `${title}_clip_${s}-${e}`;
    if (trimRange.pictureOverlay?.enabled) {
      baseTitle += '_framed';
    }
  }
  return sanitizeFilenameSecure(baseTitle, extension);
}

/**
 * Triggers browser download from a real URL or Blob URL
 */
export function triggerBrowserDownload(target: string | Blob, filename: string) {
  let url: string;
  let shouldRevoke = false;

  if (typeof target === 'string') {
    url = target;
  } else {
    url = URL.createObjectURL(target);
    shouldRevoke = true;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (shouldRevoke) {
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}

/**
 * Dispatches a genuine media conversion job to the backend Express / FFmpeg engine
 */
export async function startConversionJob(
  format: VideoFormatOption,
  metadata: VideoMetadata,
  trimRange?: TrimRange
): Promise<ConversionJobResponse> {
  const payload = {
    sourceType: metadata.uploadedFileId ? 'upload' : 'url',
    fileId: metadata.uploadedFileId,
    url: metadata.originalUrl,
    targetFormat: format.extension,
    quality: format.quality,
    title: metadata.title,
    trimRange: trimRange?.enabled
      ? {
          enabled: true,
          startSeconds: trimRange.startSeconds,
          endSeconds: trimRange.endSeconds,
        }
      : undefined,
    pictureOverlay: trimRange?.pictureOverlay?.enabled
      ? {
          enabled: true,
          imageUrl: trimRange.pictureOverlay.imageUrl,
          position: trimRange.pictureOverlay.position,
          frameStyle: trimRange.pictureOverlay.frameStyle,
          scale: trimRange.pictureOverlay.scale,
          opacity: trimRange.pictureOverlay.opacity,
          rotation: trimRange.pictureOverlay.rotation,
          timing: trimRange.pictureOverlay.timing,
        }
      : undefined,
  };

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Conversion failed to initialize (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Polls the backend for real job status and FFmpeg progress percentage
 */
export async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch status for job ${jobId}`);
  }
  return response.json();
}

/**
 * Requests the backend to terminate an active FFmpeg process
 */
export async function cancelConversionJob(jobId: string): Promise<void> {
  try {
    await fetch(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
  } catch {
    // Ignore network drop on cancel
  }
}
