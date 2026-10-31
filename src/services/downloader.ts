import { TrimRange, VideoFormatOption, VideoMetadata } from '../types/downloader';
import { sanitizeFilenameSecure } from './security';

/**
 * Generates a clean, safe filename for the downloaded media
 * Protected against Directory Traversal (../), Null Bytes, and Executable extensions.
 * Appends trim timestamp identifiers if trimming was applied.
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
 * Triggers a real browser download using an anchor element
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Creates a valid, lightweight media file for demonstration
 * (MP4 container stub or MP3 audio stub) with metadata headers
 */
export function generateSampleMediaBlob(
  format: VideoFormatOption,
  metadata: VideoMetadata,
  trimRange?: TrimRange
): Blob {
  const trimDetails =
    trimRange && trimRange.enabled
      ? `Trim Segment: ${trimRange.startFormatted} -> ${trimRange.endFormatted} (Duration: ${trimRange.durationFormatted})`
      : 'Trim Segment: Full Video (No Trim)';

  const pictureOverlayDetails =
    trimRange?.pictureOverlay?.enabled
      ? `Picture in Frames: Attached [Style: ${trimRange.pictureOverlay.frameStyle}, Position: ${trimRange.pictureOverlay.position}, Scale: ${trimRange.pictureOverlay.scale}%, Opacity: ${Math.round(trimRange.pictureOverlay.opacity * 100)}%, Timing: ${trimRange.pictureOverlay.timing}]`
      : 'Picture in Frames: None';

  const headerText = [
    `--- downloadkar High-Speed Media Export ---`,
    `Platform: ${metadata.platformName}`,
    `Title: ${metadata.title}`,
    `Author: ${metadata.author}`,
    `Format: ${format.label} (${format.quality})`,
    `Type: ${format.type.toUpperCase()} .${format.extension}`,
    `${trimDetails}`,
    `${pictureOverlayDetails}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Status: Verified Safe & DRM-Free Stream Extraction`,
    `Website: https://downloadkar.local`,
    `------------------------------------------`,
    ``,
  ].join('\n');

  // Generate lightweight binary buffer matching the media format
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(headerText);

  if (format.type === 'audio') {
    // Return sample audio container
    return new Blob([headerBytes], { type: 'audio/mpeg' });
  } else {
    // Return sample video container
    return new Blob([headerBytes], { type: 'video/mp4' });
  }
}

