/**
 * downloadkar - FFmpeg & FFprobe Media Engine
 * 
 * Provides safe, genuine media processing:
 * - Media inspection via ffprobe (codecs, resolution, duration, bitrate)
 * - Video transcoding to MP4 (1080p, 720p, 480p)
 * - Audio extraction to MP3 (320kbps, 256kbps, 192kbps, 128kbps)
 * - Video trimming with frame precision
 * - Picture-in-frame overlay filter
 * - Real stderr progress parsing (0-100%)
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface MediaProbeInfo {
  formatName: string;
  durationSeconds: number;
  durationFormatted: string;
  sizeBytes: number;
  bitrate: number;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface ConvertOptions {
  inputPath: string;
  outputPath: string;
  targetFormat: 'mp4' | 'mp3' | 'webm';
  quality?: string; // '1080p' | '720p' | '480p' | '320kbps' | '192kbps' | '128kbps'
  trimRange?: {
    enabled: boolean;
    startSeconds: number;
    endSeconds: number;
  };
  pictureOverlay?: {
    enabled: boolean;
    imagePath?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    scale?: number; // 10 to 50 percent
    opacity?: number; // 0.1 to 1.0
    timing?: 'all' | 'intro' | 'outro';
  };
  /**
   * When true, skip re-encoding and remux streams directly (-c copy).
   * Only set when the source already satisfies the requested output
   * (compatible codec, resolution within the requested cap, no trim/overlay).
   */
  allowStreamCopy?: boolean;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
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

/**
 * Parses duration timestamp string "00:01:23.45" into seconds
 */
function parseTimeString(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}

/**
 * Inspects a local media file using ffprobe
 */
export async function probeMedia(filePath: string): Promise<MediaProbeInfo> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with exit code ${code}: ${stderr}`));
      }

      try {
        const json = JSON.parse(stdout);
        const format = json.format || {};
        const streams = json.streams || [];

        const vStream = streams.find((s: any) => s.codec_type === 'video');
        const aStream = streams.find((s: any) => s.codec_type === 'audio');

        const duration = parseFloat(format.duration || vStream?.duration || aStream?.duration || '0');

        resolve({
          formatName: format.format_name || 'unknown',
          durationSeconds: duration,
          durationFormatted: formatSeconds(duration),
          sizeBytes: parseInt(format.size || '0', 10),
          bitrate: parseInt(format.bit_rate || '0', 10),
          videoCodec: vStream?.codec_name,
          audioCodec: aStream?.codec_name,
          width: vStream?.width,
          height: vStream?.height,
          hasVideo: Boolean(vStream),
          hasAudio: Boolean(aStream),
        });
      } catch (err: any) {
        reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

/**
 * Builds safe FFmpeg argument array based on conversion options
 */
export function buildFFmpegArgs(options: ConvertOptions, totalInputDuration: number): {
  args: string[];
  expectedDuration: number;
} {
  const { inputPath, outputPath, targetFormat, quality, trimRange, pictureOverlay, allowStreamCopy } = options;
  const args: string[] = ['-y']; // Overwrite output

  let expectedDuration = totalInputDuration;

  // Fast path: remux without re-encoding when the source already fits.
  if (allowStreamCopy && targetFormat === 'mp4' && !(trimRange && trimRange.enabled)) {
    args.push('-i', inputPath, '-c', 'copy', '-movflags', '+faststart', outputPath);
    return { args, expectedDuration: expectedDuration || 60 };
  }

  // 1. Trimming input options
  if (trimRange && trimRange.enabled) {
    const start = Math.max(0, trimRange.startSeconds);
    const end = Math.min(totalInputDuration || 99999, Math.max(start + 1, trimRange.endSeconds));
    expectedDuration = Math.max(1, end - start);
    args.push('-ss', start.toString(), '-to', end.toString());
  }

  // Input file
  args.push('-i', inputPath);

  // 2. Picture overlay (if enabled and image file exists)
  let hasOverlay = false;
  if (
    pictureOverlay &&
    pictureOverlay.enabled &&
    pictureOverlay.imagePath &&
    fs.existsSync(pictureOverlay.imagePath) &&
    targetFormat !== 'mp3'
  ) {
    hasOverlay = true;
    args.push('-i', pictureOverlay.imagePath);

    const scaleFraction = (pictureOverlay.scale || 25) / 100;
    const opacity = Math.max(0.1, Math.min(1.0, pictureOverlay.opacity ?? 0.95));

    // Construct overlay coordinates
    let coord = 'main_w-overlay_w-15:15'; // top-right default
    if (pictureOverlay.position === 'top-left') {
      coord = '15:15';
    } else if (pictureOverlay.position === 'bottom-left') {
      coord = '15:main_h-overlay_h-15';
    } else if (pictureOverlay.position === 'bottom-right') {
      coord = 'main_w-overlay_w-15:main_h-overlay_h-15';
    } else if (pictureOverlay.position === 'center') {
      coord = '(main_w-overlay_w)/2:(main_h-overlay_h)/2';
    }

    // Filter graph for scaling and applying opacity
    // [1:v]scale=main_w*X:-1,format=rgba,colorchannelmixer=aa=opacity[logo];[0:v][logo]overlay=X:Y
    const filterComplex = [
      `[1:v]scale=main_w*${scaleFraction.toFixed(2)}:-1,format=rgba,colorchannelmixer=aa=${opacity.toFixed(2)}[pic]`,
      `[0:v][pic]overlay=${coord}`,
    ].join(';');

    args.push('-filter_complex', filterComplex);
  }

  // 3. Target codec and quality settings
  if (targetFormat === 'mp3') {
    args.push('-vn'); // Disable video
    args.push('-c:a', 'libmp3lame');

    let bitrate = '192k';
    if (quality?.includes('320')) bitrate = '320k';
    else if (quality?.includes('256')) bitrate = '256k';
    else if (quality?.includes('128')) bitrate = '128k';

    args.push('-b:a', bitrate);
  } else if (targetFormat === 'webm') {
    args.push('-c:v', 'libvpx-vp9', '-b:v', '1M', '-c:a', 'libopus');
  } else {
    // Default MP4
    args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-b:a', '160k');
    args.push('-pix_fmt', 'yuv420p');
    args.push('-movflags', '+faststart');

    // Scale resolution if requested and no complex overlay was set
    if (!hasOverlay) {
      if (quality === '720p') {
        args.push('-vf', 'scale=-2:720');
      } else if (quality === '480p') {
        args.push('-vf', 'scale=-2:480');
      } else if (quality === '360p') {
        args.push('-vf', 'scale=-2:360');
      }
    }
  }

  // Output file
  args.push(outputPath);

  return { args, expectedDuration: expectedDuration || 60 };
}

/**
 * Executes an FFmpeg job with real-time stderr progress parsing and timeout
 */
export function runFFmpegJob(
  options: ConvertOptions,
  totalDuration: number,
  onProgress: (percent: number, rawTime: string) => void
): {
  promise: Promise<void>;
  cancel: () => void;
} {
  const { args, expectedDuration } = buildFFmpegArgs(options, totalDuration);
  let proc: ChildProcessWithoutNullStreams | null = spawn('ffmpeg', args);
  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    if (proc && !proc.killed) {
      proc.kill('SIGKILL');
    }
  };

  const promise = new Promise<void>((resolve, reject) => {
    let stderrData = '';

    // Safety timeout: 5 minutes max
    const timeout = setTimeout(() => {
      cancel();
      reject(new Error('Conversion timed out after 5 minutes.'));
    }, 5 * 60 * 1000);

    proc!.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrData += text;

      // Match time=00:00:00.00
      const match = text.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
      if (match && match[1]) {
        const currentTime = parseTimeString(match[1]);
        const percent = Math.min(99, Math.max(1, Math.round((currentTime / expectedDuration) * 100)));
        onProgress(percent, match[1]);
      }
    });

    proc!.on('close', (code) => {
      clearTimeout(timeout);
      if (isCancelled) {
        return reject(new Error('Conversion was cancelled by user.'));
      }
      if (code !== 0) {
        return reject(new Error(`FFmpeg failed with exit code ${code}: ${stderrData.slice(-500)}`));
      }
      onProgress(100, formatSeconds(expectedDuration));
      resolve();
    });

    proc!.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return { promise, cancel };
}
