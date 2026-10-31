/**
 * downloadkar - Media Conversion Job Manager
 * 
 * Manages active conversion jobs, real progress tracking, and secure delivery.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { runFFmpegJob, probeMedia, ConvertOptions } from './ffmpeg';
import { OUTPUT_DIR } from './cleanup';

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
    try {
      job.status = 'processing';
      job.step = 'Inspecting media streams...';
      job.updatedAt = Date.now();

      // Probe media to get duration for accurate progress calculation
      let totalDuration = 60;
      try {
        const probe = await probeMedia(inputPath);
        totalDuration = probe.durationSeconds || 60;
      } catch {
        // Fallback default
      }

      job.step = params.targetFormat === 'mp3'
        ? 'Extracting high-fidelity audio track...'
        : params.pictureOverlay?.enabled
        ? 'Compositing framed picture and transcoding video...'
        : 'Transcoding video with FFmpeg...';

      const convertOptions: ConvertOptions = {
        inputPath,
        outputPath: job.outputFilePath,
        targetFormat: params.targetFormat,
        quality: params.quality,
        trimRange: params.trimRange,
        pictureOverlay: params.pictureOverlay,
      };

      const { promise, cancel } = runFFmpegJob(convertOptions, totalDuration, (percent, rawTime) => {
        job.progress = percent;
        job.step = `Processing media: ${percent}% (timestamp ${rawTime})`;
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
    }
  }
}

export const jobManager = new JobManager();
