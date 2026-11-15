/**
 * downloadkar - Media Conversion Job Manager
 * 
 * Manages active conversion jobs, real progress tracking, and secure delivery.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { runFFmpegJob, probeMedia, ConvertOptions, MediaProbeInfo } from './ffmpeg';
import { downloadWithYtDlp, isDirectMediaUrl } from './ytdlp';
import { OUTPUT_DIR, UPLOAD_DIR } from './cleanup';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface MediaJob {
  id: string;
  status: JobStatus;
  progress: number; // 0 to 100
  step: string;
  sourceType: 'upload' | 'url';
  targetFormat: 'mp4' | 'mp3' | 'webm';
  outputFilePath: string;
  outputFilename: string;
  fileSizeBytes: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
  cancelFn?: () => void;
}

class JobManager {
  private jobs = new Map<string, MediaJob>();

  constructor() {
    // Periodically remove stale jobs older than 30 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobs.entries()) {
        if (now - job.createdAt > 30 * 60 * 1000) {
          if (fs.existsSync(job.outputFilePath)) {
            try { fs.unlinkSync(job.outputFilePath); } catch {}
          }
          this.jobs.delete(id);
        }
      }
    }, 10 * 60 * 1000).unref();
  }

  public getJob(id: string): MediaJob | undefined {
    return this.jobs.get(id);
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'processing' || job.status === 'queued') {
      if (job.cancelFn) job.cancelFn();
      job.status = 'cancelled';
      job.step = 'Cancelled by user';
      job.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  public async createAndStartJob(params: {
    sourceType: 'upload' | 'url';
    inputPath: string;
    targetFormat: 'mp4' | 'mp3' | 'webm';
    quality?: string;
    outputFilename: string;
    trimRange?: { enabled: boolean; startSeconds: number; endSeconds: number };
    pictureOverlay?: {
      enabled: boolean;
      imagePath?: string;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
      scale?: number;
      opacity?: number;
      timing?: 'all' | 'intro' | 'outro';
    };
  }): Promise<MediaJob> {
    const id = crypto.randomUUID();
    const ext = params.targetFormat === 'mp3' ? 'mp3' : 'mp4';
    const outputFilePath = path.join(OUTPUT_DIR, `${id}.${ext}`);

    const job: MediaJob = {
      id,
      status: 'queued',
      progress: 0,
      step: 'Queued for processing',
      sourceType: params.sourceType,
      targetFormat: params.targetFormat,
      outputFilePath,
      outputFilename: params.outputFilename,
      fileSizeBytes: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.jobs.set(id, job);

    // Asynchronously begin processing
    this.processJob(job, params.inputPath, params).catch((err) => {
      console.error(`Job ${id} failed:`, err);
    });

    return job;
  }

  private async processJob(
    job: MediaJob,
    inputPath: string,
    params: {
      targetFormat: 'mp4' | 'mp3' | 'webm';
      quality?: string;
      trimRange?: { enabled: boolean; startSeconds: number; endSeconds: number };
      pictureOverlay?: any;
    }
  ): Promise<void> {
    let tempInputFile: string | null = null;
    let ffmpegProgressOffset = 0;

    try {
      job.status = 'processing';
      job.step = 'Inspecting media streams...';
      job.updatedAt = Date.now();

      let resolvedInput = inputPath;

      // Platform page URLs (YouTube, Facebook, Instagram, TikTok, etc.) must be
      // resolved to a local media file via yt-dlp before FFmpeg can process them.
      const isRemoteUrl = /^https?:\/\//i.test(inputPath);
      if (isRemoteUrl && !isDirectMediaUrl(inputPath)) {
        job.step = 'Resolving platform media with yt-dlp...';
        job.updatedAt = Date.now();

        const outTemplate = path.join(UPLOAD_DIR, `src_${job.id}.%(ext)s`);
        const downloader = downloadWithYtDlp(
          inputPath,
          outTemplate,
          {
            audioOnly: params.targetFormat === 'mp3',
            maxHeight: params.targetFormat === 'mp3' ? undefined : qualityMaxHeight(params.quality),
          },
          (percent) => {
            job.progress = Math.min(45, Math.max(1, Math.round(percent * 0.45)));
            job.step = `Downloading source media: ${percent}%`;
            job.updatedAt = Date.now();
          }
        );

        job.cancelFn = downloader.cancel;
        await downloader.promise;

        const downloaded = fs.readdirSync(UPLOAD_DIR)
          .filter((f) => f.startsWith(`src_${job.id}.`))
          .map((f) => path.join(UPLOAD_DIR, f))
          .find((p) => fs.existsSync(p) && fs.statSync(p).size > 0);

        if (!downloaded) {
          throw new Error('yt-dlp finished but no media file was produced.');
        }
        tempInputFile = downloaded;
        resolvedInput = downloaded;
        ffmpegProgressOffset = 45;
      }

      // Probe media to get duration for accurate progress calculation
      let totalDuration = 60;
      let probeInfo: MediaProbeInfo | null = null;
      try {
        probeInfo = await probeMedia(resolvedInput);
        totalDuration = probeInfo.durationSeconds || 60;
      } catch {
        // Fallback default
      }

      job.step = params.targetFormat === 'mp3'
        ? 'Extracting high-fidelity audio track...'
        : params.pictureOverlay?.enabled
        ? 'Compositing framed picture and transcoding video...'
        : 'Transcoding video with FFmpeg...';

      // Stream-copy fast path: when the source is already H.264 MP4-compatible,
      // within the requested resolution cap, and no trim/overlay is requested,
      // FFmpeg can remux (-c copy) instead of re-encoding — near-instant output.
      const maxHeight = qualityMaxHeight(params.quality);
      const trimOn = Boolean(params.trimRange?.enabled);
      const overlayOn = Boolean(params.pictureOverlay?.enabled);
      const allowStreamCopy =
        params.targetFormat === 'mp4' &&
        !trimOn &&
        !overlayOn &&
        probeInfo !== null &&
        (!probeInfo.hasVideo || probeInfo.videoCodec === 'h264') &&
        (maxHeight === undefined ||
          (probeInfo.height != null && probeInfo.height <= maxHeight));

      const convertOptions: ConvertOptions = {
        inputPath: resolvedInput,
        outputPath: job.outputFilePath,
        targetFormat: params.targetFormat,
        quality: params.quality,
        trimRange: params.trimRange,
        pictureOverlay: params.pictureOverlay,
        allowStreamCopy,
      };

      // Ultimate fast path: yt-dlp already produced a finished file that needs
      // no FFmpeg work at all (plain MP4 download or MP3 audio extraction with
      // no trim). Move it straight to the output — download speed is the only cost.
      const canPassthrough =
        tempInputFile !== null &&
        !trimOn &&
        (params.targetFormat === 'mp3' || allowStreamCopy);

      if (canPassthrough && tempInputFile) {
        job.step = 'Finalizing download...';
        job.progress = 98;
        job.updatedAt = Date.now();
        try {
          await fs.promises.rename(tempInputFile, job.outputFilePath);
        } catch {
          await fs.promises.copyFile(tempInputFile, job.outputFilePath);
        }
        tempInputFile = null;
        const stats = fs.statSync(job.outputFilePath);
        job.fileSizeBytes = stats.size;
        job.status = 'completed';
        job.progress = 100;
        job.step = 'Media processing completed successfully!';
        job.updatedAt = Date.now();
        return;
      }

      if (allowStreamCopy) {
        job.step = 'Remuxing streams (no re-encode, top speed)...';
        job.updatedAt = Date.now();
      }

      const { promise, cancel } = runFFmpegJob(convertOptions, totalDuration, (percent, rawTime) => {
        job.progress = ffmpegProgressOffset + Math.round(percent * (100 - ffmpegProgressOffset) / 100);
        job.step = `Processing media: ${job.progress}% (timestamp ${rawTime})`;
        job.updatedAt = Date.now();
      });

      job.cancelFn = cancel;
      await promise;

      if (fs.existsSync(job.outputFilePath)) {
        const stats = fs.statSync(job.outputFilePath);
        job.fileSizeBytes = stats.size;
      }

      job.status = 'completed';
      job.progress = 100;
      job.step = 'Media processing completed successfully!';
      job.updatedAt = Date.now();
    } catch (err: any) {
      if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.error = err.message || 'Media conversion failed.';
        job.step = 'Processing error';
        job.updatedAt = Date.now();
      }
    } finally {
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        try { fs.unlinkSync(tempInputFile); } catch {}
      }
    }
  }
}

export const jobManager = new JobManager();

/**
 * Maps a quality label ('1080p', '720p', 'HD', 'SD', ...) to a max pixel
 * height. Returns undefined when no cap applies (e.g. 'original').
 */
function qualityMaxHeight(quality?: string): number | undefined {
  if (!quality) return undefined;
  const m = quality.match(/(\d{3,4})\s*p/i);
  if (m) return parseInt(m[1], 10);
  if (/\bsd\b/i.test(quality)) return 480;
  if (/\bhd\b/i.test(quality)) return 1080;
  return undefined;
}
