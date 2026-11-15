// server.ts
import express from "express";
import path4 from "path";
import fs5 from "fs";
import crypto2 from "crypto";
import multer from "multer";
import dotenv from "dotenv";
import { fileURLToPath as fileURLToPath2 } from "url";

// src/server/cleanup.ts
import fs from "fs";
import path from "path";
var TEMP_BASE_DIR = path.resolve("/tmp/downloadkar_jobs");
var UPLOAD_DIR = path.join(TEMP_BASE_DIR, "uploads");
var OUTPUT_DIR = path.join(TEMP_BASE_DIR, "outputs");
function initTempDirectories() {
  try {
    if (!fs.existsSync(TEMP_BASE_DIR)) fs.mkdirSync(TEMP_BASE_DIR, { recursive: true });
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to initialize temporary directories:", err);
  }
}
function cleanupOldFiles(dirPath, maxAgeMs = 15 * 60 * 1e3) {
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
      }
    }
  } catch {
  }
}
function startCleanupTimer(intervalMs = 5 * 60 * 1e3) {
  initTempDirectories();
  const timer = setInterval(() => {
    cleanupOldFiles(UPLOAD_DIR);
    cleanupOldFiles(OUTPUT_DIR);
  }, intervalMs);
  timer.unref();
  return timer;
}

// src/server/security.ts
import dns from "dns";
import { promisify } from "util";
var lookupAsync = promisify(dns.lookup);
var MAX_SERVER_URL_LENGTH = 2048;
var PRIVATE_IP_REGEXES = [
  /^127\./,
  // Loopback (127.0.0.0/8)
  /^10\./,
  // Class A private (10.0.0.0/8)
  /^192\.168\./,
  // Class C private (192.168.0.0/16)
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  // Class B private (172.16.0.0/12)
  /^169\.254\./,
  // Link-local / AWS / GCP metadata (169.254.0.0/16)
  /^0\./,
  // Current network
  /^::1$/,
  // IPv6 loopback
  /^fc00:/i,
  // IPv6 unique local
  /^fe80:/i
  // IPv6 link-local
];
function isPrivateOrRestrictedIp(ip) {
  if (!ip) return true;
  return PRIVATE_IP_REGEXES.some((reg) => reg.test(ip.trim()));
}
async function validateOutboundUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { safe: false, error: "A valid URL is required." };
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length > MAX_SERVER_URL_LENGTH) {
    return { safe: false, error: "URL exceeds maximum allowed length." };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { safe: false, error: "Invalid URL format." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: "Only HTTP and HTTPS protocols are permitted." };
  }
  if (parsed.username || parsed.password) {
    return { safe: false, error: "Embedded user credentials in URLs are disallowed." };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname === "metadata.google.internal") {
    return { safe: false, error: "Access to internal or private hosts is prohibited." };
  }
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
    if (isPrivateOrRestrictedIp(hostname)) {
      return { safe: false, error: "Direct access to private or loopback IP addresses is prohibited." };
    }
  }
  try {
    const lookup = await lookupAsync(hostname);
    if (isPrivateOrRestrictedIp(lookup.address)) {
      return { safe: false, error: "Resolved host points to a private or restricted network address." };
    }
  } catch (err) {
    return { safe: false, error: `DNS resolution failed for host: ${hostname}` };
  }
  return { safe: true, sanitizedUrl: parsed.toString() };
}
function sanitizeSafeFilename(rawTitle, extension) {
  const safeExt = extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanExt = safeExt === "mp3" ? "mp3" : "mp4";
  const cleanTitle = rawTitle.replace(/\0/g, "").replace(/\.\./g, "").replace(/[\\\/:\*\?"<>\|]/g, "").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_").slice(0, 48);
  const base = cleanTitle || "downloadkar_media";
  return `downloadkar_${base}.${cleanExt}`;
}
var ServerRateLimiter = class {
  constructor(maxRequests = 30, windowMs = 6e4) {
    this.requests = /* @__PURE__ */ new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
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
    }, 6e4).unref();
  }
  check(ip) {
    const now = Date.now();
    const timestamps = (this.requests.get(ip) || []).filter((t) => now - t < this.windowMs);
    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const retryAfter = Math.ceil((this.windowMs - (now - oldest)) / 1e3);
      return { allowed: false, retryAfter };
    }
    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return { allowed: true, retryAfter: 0 };
  }
};

// src/server/ffmpeg.ts
import { spawn } from "child_process";
import fs3 from "fs";

// src/server/binaries.ts
import fs2 from "fs";
import path2 from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
var require2 = createRequire(import.meta.url);
var projectRoot = path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "..", "..");
var localBin = path2.join(projectRoot, "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
function tryRequireString(pkg) {
  try {
    const mod = require2(pkg);
    const p = typeof mod === "string" ? mod : mod?.default ?? mod?.path;
    return typeof p === "string" && fs2.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}
function tryRequireYtDlp() {
  try {
    const { constants } = require2("youtube-dl-exec");
    const p = constants?.YOUTUBE_DL_PATH;
    return typeof p === "string" && fs2.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}
function localYtDlp() {
  return fs2.existsSync(localBin) ? localBin : null;
}
function ffmpegBin() {
  return process.env.FFMPEG_PATH || tryRequireString("ffmpeg-static") || "ffmpeg";
}
function ffprobeBin() {
  return process.env.FFPROBE_PATH || tryRequireString("ffprobe-static") || "ffprobe";
}
function ytDlpBin() {
  return process.env.YTDLP_PATH || localYtDlp() || tryRequireYtDlp() || "yt-dlp";
}

// src/server/ffmpeg.ts
function formatSeconds(secs) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const rem = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}
function parseTimeString(timeStr) {
  const parts = timeStr.trim().split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}
async function probeMedia(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
    ];
    const proc = spawn(ffprobeBin(), args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed with exit code ${code}: ${stderr}`));
      }
      try {
        const json = JSON.parse(stdout);
        const format = json.format || {};
        const streams = json.streams || [];
        const vStream = streams.find((s) => s.codec_type === "video");
        const aStream = streams.find((s) => s.codec_type === "audio");
        const duration = parseFloat(format.duration || vStream?.duration || aStream?.duration || "0");
        resolve({
          formatName: format.format_name || "unknown",
          durationSeconds: duration,
          durationFormatted: formatSeconds(duration),
          sizeBytes: parseInt(format.size || "0", 10),
          bitrate: parseInt(format.bit_rate || "0", 10),
          videoCodec: vStream?.codec_name,
          audioCodec: aStream?.codec_name,
          width: vStream?.width,
          height: vStream?.height,
          hasVideo: Boolean(vStream),
          hasAudio: Boolean(aStream)
        });
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}
function buildFFmpegArgs(options, totalInputDuration) {
  const { inputPath, outputPath, targetFormat, quality, trimRange, pictureOverlay, allowStreamCopy } = options;
  const args = ["-y"];
  let expectedDuration = totalInputDuration;
  if (allowStreamCopy && targetFormat === "mp4" && !(trimRange && trimRange.enabled)) {
    args.push("-i", inputPath, "-c", "copy", "-movflags", "+faststart", outputPath);
    return { args, expectedDuration: expectedDuration || 60 };
  }
  if (trimRange && trimRange.enabled) {
    const start = Math.max(0, trimRange.startSeconds);
    const end = Math.min(totalInputDuration || 99999, Math.max(start + 1, trimRange.endSeconds));
    expectedDuration = Math.max(1, end - start);
    args.push("-ss", start.toString(), "-to", end.toString());
  }
  args.push("-i", inputPath);
  let hasOverlay = false;
  if (pictureOverlay && pictureOverlay.enabled && pictureOverlay.imagePath && fs3.existsSync(pictureOverlay.imagePath) && targetFormat !== "mp3") {
    hasOverlay = true;
    args.push("-i", pictureOverlay.imagePath);
    const scaleFraction = (pictureOverlay.scale || 25) / 100;
    const opacity = Math.max(0.1, Math.min(1, pictureOverlay.opacity ?? 0.95));
    let coord = "main_w-overlay_w-15:15";
    if (pictureOverlay.position === "top-left") {
      coord = "15:15";
    } else if (pictureOverlay.position === "bottom-left") {
      coord = "15:main_h-overlay_h-15";
    } else if (pictureOverlay.position === "bottom-right") {
      coord = "main_w-overlay_w-15:main_h-overlay_h-15";
    } else if (pictureOverlay.position === "center") {
      coord = "(main_w-overlay_w)/2:(main_h-overlay_h)/2";
    }
    const filterComplex = [
      `[1:v]scale=main_w*${scaleFraction.toFixed(2)}:-1,format=rgba,colorchannelmixer=aa=${opacity.toFixed(2)}[pic]`,
      `[0:v][pic]overlay=${coord}`
    ].join(";");
    args.push("-filter_complex", filterComplex);
  }
  if (targetFormat === "mp3") {
    args.push("-vn");
    args.push("-c:a", "libmp3lame");
    let bitrate = "192k";
    if (quality?.includes("320")) bitrate = "320k";
    else if (quality?.includes("256")) bitrate = "256k";
    else if (quality?.includes("128")) bitrate = "128k";
    args.push("-b:a", bitrate);
  } else if (targetFormat === "webm") {
    args.push("-c:v", "libvpx-vp9", "-b:v", "1M", "-c:a", "libopus");
  } else {
    args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "160k");
    args.push("-pix_fmt", "yuv420p");
    args.push("-movflags", "+faststart");
    if (!hasOverlay) {
      if (quality === "720p") {
        args.push("-vf", "scale=-2:720");
      } else if (quality === "480p") {
        args.push("-vf", "scale=-2:480");
      } else if (quality === "360p") {
        args.push("-vf", "scale=-2:360");
      }
    }
  }
  args.push(outputPath);
  return { args, expectedDuration: expectedDuration || 60 };
}
function runFFmpegJob(options, totalDuration, onProgress) {
  const { args, expectedDuration } = buildFFmpegArgs(options, totalDuration);
  let proc = spawn(ffmpegBin(), args);
  let isCancelled = false;
  const cancel = () => {
    isCancelled = true;
    if (proc && !proc.killed) {
      proc.kill("SIGKILL");
    }
  };
  const promise = new Promise((resolve, reject) => {
    let stderrData = "";
    const timeout = setTimeout(() => {
      cancel();
      reject(new Error("Conversion timed out after 5 minutes."));
    }, 5 * 60 * 1e3);
    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrData += text;
      const match = text.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
      if (match && match[1]) {
        const currentTime = parseTimeString(match[1]);
        const percent = Math.min(99, Math.max(1, Math.round(currentTime / expectedDuration * 100)));
        onProgress(percent, match[1]);
      }
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (isCancelled) {
        return reject(new Error("Conversion was cancelled by user."));
      }
      if (code !== 0) {
        return reject(new Error(`FFmpeg failed with exit code ${code}: ${stderrData.slice(-500)}`));
      }
      onProgress(100, formatSeconds(expectedDuration));
      resolve();
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  return { promise, cancel };
}

// src/server/ytdlp.ts
import { spawn as spawn2 } from "child_process";
var COOKIE_BROWSERS = ["firefox", "chrome", "edge", "brave", "opera", "vivaldi"];
var AUTH_ERROR_RE = /sign in|log ?in|logged|cookie|private|age.?restrict|cannot parse|not a bot|403|401/i;
var TRANSIENT_ERROR_RE = /403|429|50[023]|timed? ?out|timeout|connection reset|temporarily unavailable|unable to download video data/i;
function formatSeconds2(secs) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const rem = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}
var DIRECT_MEDIA_REGEX = /\.(mp4|webm|mkv|mov|avi|mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i;
function isDirectMediaUrl(url) {
  return DIRECT_MEDIA_REGEX.test(url);
}
function buildCommonArgs() {
  return [
    "--newline",
    "--no-warnings",
    "--socket-timeout",
    "30",
    // Fetch DASH/HLS fragments in parallel for faster downloads
    "-N",
    "8"
  ];
}
function runYtDlpOnce(args, handlers) {
  const proc = spawn2(ytDlpBin(), args);
  let stdout = "";
  let stderrTail = "";
  let isCancelled = false;
  const cancel = () => {
    isCancelled = true;
    if (proc && !proc.killed) {
      proc.kill("SIGKILL");
    }
  };
  const promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cancel();
      reject(new Error("yt-dlp timed out."));
    }, handlers.timeoutMs ?? 10 * 60 * 1e3);
    const feed = (chunk, isErr) => {
      const text = chunk.toString();
      if (isErr) {
        stderrTail = (stderrTail + text).slice(-2e3);
        const lines = text.split(/\r?\n/);
        for (const line of lines) if (line.trim()) handlers.onStderrLine?.(line);
      } else {
        stdout += text;
        const lines = text.split(/\r?\n/);
        for (const line of lines) if (line.trim()) handlers.onStdoutLine?.(line);
      }
    };
    proc.stdout.on("data", (d) => feed(d, false));
    proc.stderr.on("data", (d) => feed(d, true));
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (isCancelled) {
        return reject(new Error("yt-dlp was cancelled."));
      }
      resolve({ code, stdout, stderrTail });
    });
    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  return { promise, cancel };
}
async function fetchYtDlpMetadata(url) {
  const attempts = [null, ...COOKIE_BROWSERS];
  for (const browser of attempts) {
    const args = ["--dump-single-json", "--no-warnings", "--socket-timeout", "15"];
    if (browser) args.push("--cookies-from-browser", browser);
    args.push(url);
    try {
      const { promise } = runYtDlpOnce(args, { timeoutMs: 25e3 });
      const { code, stdout, stderrTail } = await promise;
      if (code !== 0 || !stdout.trim()) {
        if (!AUTH_ERROR_RE.test(stderrTail)) return null;
        continue;
      }
      const json = JSON.parse(stdout);
      const entries = Array.isArray(json.entries) ? json.entries : [json];
      const info = entries[0] || {};
      if (!info.title) continue;
      const duration = typeof info.duration === "number" ? info.duration : void 0;
      const heights = /* @__PURE__ */ new Set();
      for (const f of info.formats || []) {
        if (f && typeof f.height === "number" && f.height > 0 && f.vcodec && f.vcodec !== "none") {
          heights.add(Math.round(f.height));
        }
      }
      const resolutions = [...heights].sort((a, b) => b - a);
      return {
        title: info.title || void 0,
        author: info.uploader || info.channel || info.creator || void 0,
        authorUrl: info.uploader_url || info.channel_url || info.creator_url || void 0,
        thumbnailUrl: info.thumbnail || void 0,
        durationSeconds: duration,
        durationFormatted: duration !== void 0 ? formatSeconds2(duration) : void 0,
        platformName: info.extractor_key || void 0,
        extractorKey: info.extractor_key || void 0,
        resolutions: resolutions.length ? resolutions : void 0
      };
    } catch {
    }
  }
  return null;
}
function downloadWithYtDlp(url, outputPath, options = {}, onProgress = () => {
}) {
  const attempts = [null, ...COOKIE_BROWSERS];
  let activeCancel = () => {
  };
  let isCancelled = false;
  const cancel = () => {
    isCancelled = true;
    activeCancel();
  };
  const baseArgs = buildCommonArgs();
  if (options.audioOnly) {
    baseArgs.push("-f", "ba/best", "-x", "--audio-format", "mp3");
  } else if (options.maxHeight && options.maxHeight > 0) {
    const h = Math.floor(options.maxHeight);
    baseArgs.push(
      "-f",
      `bv*[vcodec^=avc1][height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[vcodec^=avc1][height<=${h}]+ba[ext=m4a]/bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[height<=${h}]+ba/b[height<=${h}]/b`,
      "--merge-output-format",
      "mp4"
    );
  } else {
    baseArgs.push(
      "-f",
      "bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b",
      "--merge-output-format",
      "mp4"
    );
  }
  baseArgs.push("-o", outputPath, url);
  const promise = (async () => {
    let firstError = null;
    for (let round = 0; round < 2; round++) {
      if (isCancelled) throw new Error("Download was cancelled by user.");
      if (round > 0) await new Promise((r) => setTimeout(r, 2e3));
      const roundAttempts = round === 0 ? attempts : [null];
      let sawTransient = false;
      let exhausted = false;
      for (const browser of roundAttempts) {
        if (isCancelled) throw new Error("Download was cancelled by user.");
        const args = [...baseArgs];
        if (browser) args.push("--cookies-from-browser", browser);
        const tailBox = { value: "" };
        const handleLine = (line, isErr) => {
          const trimmed = line.trim();
          const dlMatch = trimmed.match(/\[download\]\s+([\d.]+)%/);
          if (dlMatch) {
            const pct = Math.min(99, Math.max(1, Math.round(parseFloat(dlMatch[1]))));
            const speedMatch = trimmed.match(/at\s+([\d.]+\w+\/s)/);
            onProgress(pct, speedMatch ? speedMatch[1] : void 0);
            return;
          }
          if (/\[(Merger|VideoRemuxer|ExtractAudio|FixupM3u8|FFmpegFixup)\]/.test(trimmed)) {
            onProgress(99);
            return;
          }
          if (isErr && /ERROR:|Unable to download|Requested format|Sign in to confirm|Private video|Video unavailable|HTTP Error|Cannot parse/i.test(trimmed)) {
            tailBox.value = (tailBox.value + "\n" + trimmed).slice(-1e3);
          }
        };
        const attempt = runYtDlpOnce(args, {
          onStdoutLine: (l) => handleLine(l, false),
          onStderrLine: (l) => handleLine(l, true),
          timeoutMs: 10 * 60 * 1e3
        });
        activeCancel = attempt.cancel;
        try {
          const { code } = await attempt.promise;
          if (code === 0) {
            onProgress(100);
            return;
          }
          const err = new Error(`yt-dlp exited with code ${code}${tailBox.value ? `: ${tailBox.value.slice(-400)}` : ""}`);
          if (!firstError) firstError = err;
        } catch (err) {
          if (isCancelled) throw new Error("Download was cancelled by user.");
          if (!firstError) firstError = err instanceof Error ? err : new Error(String(err));
        }
        if (isCancelled) throw new Error("Download was cancelled by user.");
        if (TRANSIENT_ERROR_RE.test(tailBox.value)) sawTransient = true;
        if (!AUTH_ERROR_RE.test(tailBox.value)) {
          exhausted = true;
          break;
        }
      }
      if (!sawTransient || exhausted) break;
    }
    throw firstError || new Error("yt-dlp failed to download the media.");
  })();
  return { promise, cancel };
}

// src/server/jobs.ts
import crypto from "crypto";
import fs4 from "fs";
import path3 from "path";
var JobManager = class {
  constructor() {
    this.jobs = /* @__PURE__ */ new Map();
    setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobs.entries()) {
        if (now - job.createdAt > 30 * 60 * 1e3) {
          if (fs4.existsSync(job.outputFilePath)) {
            try {
              fs4.unlinkSync(job.outputFilePath);
            } catch {
            }
          }
          this.jobs.delete(id);
        }
      }
    }, 10 * 60 * 1e3).unref();
  }
  getJob(id) {
    return this.jobs.get(id);
  }
  cancelJob(id) {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.status === "processing" || job.status === "queued") {
      if (job.cancelFn) job.cancelFn();
      job.status = "cancelled";
      job.step = "Cancelled by user";
      job.updatedAt = Date.now();
      return true;
    }
    return false;
  }
  async createAndStartJob(params) {
    const id = crypto.randomUUID();
    const ext = params.targetFormat === "mp3" ? "mp3" : "mp4";
    const outputFilePath = path3.join(OUTPUT_DIR, `${id}.${ext}`);
    const job = {
      id,
      status: "queued",
      progress: 0,
      step: "Queued for processing",
      sourceType: params.sourceType,
      targetFormat: params.targetFormat,
      outputFilePath,
      outputFilename: params.outputFilename,
      fileSizeBytes: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.jobs.set(id, job);
    this.processJob(job, params.inputPath, params).catch((err) => {
      console.error(`Job ${id} failed:`, err);
    });
    return job;
  }
  async processJob(job, inputPath, params) {
    let tempInputFile = null;
    let ffmpegProgressOffset = 0;
    try {
      job.status = "processing";
      job.step = "Inspecting media streams...";
      job.updatedAt = Date.now();
      let resolvedInput = inputPath;
      const isRemoteUrl = /^https?:\/\//i.test(inputPath);
      if (isRemoteUrl && !isDirectMediaUrl(inputPath)) {
        job.step = "Resolving platform media with yt-dlp...";
        job.updatedAt = Date.now();
        const outTemplate = path3.join(UPLOAD_DIR, `src_${job.id}.%(ext)s`);
        const downloader = downloadWithYtDlp(
          inputPath,
          outTemplate,
          {
            audioOnly: params.targetFormat === "mp3",
            maxHeight: params.targetFormat === "mp3" ? void 0 : qualityMaxHeight(params.quality)
          },
          (percent) => {
            job.progress = Math.min(45, Math.max(1, Math.round(percent * 0.45)));
            job.step = `Downloading source media: ${percent}%`;
            job.updatedAt = Date.now();
          }
        );
        job.cancelFn = downloader.cancel;
        await downloader.promise;
        const downloaded = fs4.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith(`src_${job.id}.`)).map((f) => path3.join(UPLOAD_DIR, f)).find((p) => fs4.existsSync(p) && fs4.statSync(p).size > 0);
        if (!downloaded) {
          throw new Error("yt-dlp finished but no media file was produced.");
        }
        tempInputFile = downloaded;
        resolvedInput = downloaded;
        ffmpegProgressOffset = 45;
      }
      let totalDuration = 60;
      let probeInfo = null;
      try {
        probeInfo = await probeMedia(resolvedInput);
        totalDuration = probeInfo.durationSeconds || 60;
      } catch {
      }
      job.step = params.targetFormat === "mp3" ? "Extracting high-fidelity audio track..." : params.pictureOverlay?.enabled ? "Compositing framed picture and transcoding video..." : "Transcoding video with FFmpeg...";
      const maxHeight = qualityMaxHeight(params.quality);
      const trimOn = Boolean(params.trimRange?.enabled);
      const overlayOn = Boolean(params.pictureOverlay?.enabled);
      const allowStreamCopy = params.targetFormat === "mp4" && !trimOn && !overlayOn && probeInfo !== null && (!probeInfo.hasVideo || probeInfo.videoCodec === "h264") && (maxHeight === void 0 || probeInfo.height != null && probeInfo.height <= maxHeight);
      const convertOptions = {
        inputPath: resolvedInput,
        outputPath: job.outputFilePath,
        targetFormat: params.targetFormat,
        quality: params.quality,
        trimRange: params.trimRange,
        pictureOverlay: params.pictureOverlay,
        allowStreamCopy
      };
      const canPassthrough = tempInputFile !== null && !trimOn && (params.targetFormat === "mp3" || allowStreamCopy);
      if (canPassthrough && tempInputFile) {
        job.step = "Finalizing download...";
        job.progress = 98;
        job.updatedAt = Date.now();
        try {
          await fs4.promises.rename(tempInputFile, job.outputFilePath);
        } catch {
          await fs4.promises.copyFile(tempInputFile, job.outputFilePath);
        }
        tempInputFile = null;
        const stats = fs4.statSync(job.outputFilePath);
        job.fileSizeBytes = stats.size;
        job.status = "completed";
        job.progress = 100;
        job.step = "Media processing completed successfully!";
        job.updatedAt = Date.now();
        return;
      }
      if (allowStreamCopy) {
        job.step = "Remuxing streams (no re-encode, top speed)...";
        job.updatedAt = Date.now();
      }
      const { promise, cancel } = runFFmpegJob(convertOptions, totalDuration, (percent, rawTime) => {
        job.progress = ffmpegProgressOffset + Math.round(percent * (100 - ffmpegProgressOffset) / 100);
        job.step = `Processing media: ${job.progress}% (timestamp ${rawTime})`;
        job.updatedAt = Date.now();
      });
      job.cancelFn = cancel;
      await promise;
      if (fs4.existsSync(job.outputFilePath)) {
        const stats = fs4.statSync(job.outputFilePath);
        job.fileSizeBytes = stats.size;
      }
      job.status = "completed";
      job.progress = 100;
      job.step = "Media processing completed successfully!";
      job.updatedAt = Date.now();
    } catch (err) {
      if (job.status !== "cancelled") {
        job.status = "failed";
        job.error = err.message || "Media conversion failed.";
        job.step = "Processing error";
        job.updatedAt = Date.now();
      }
    } finally {
      if (tempInputFile && fs4.existsSync(tempInputFile)) {
        try {
          fs4.unlinkSync(tempInputFile);
        } catch {
        }
      }
    }
  }
};
var jobManager = new JobManager();
function qualityMaxHeight(quality) {
  if (!quality) return void 0;
  const m = quality.match(/(\d{3,4})\s*p/i);
  if (m) return parseInt(m[1], 10);
  if (/\bsd\b/i.test(quality)) return 480;
  if (/\bhd\b/i.test(quality)) return 1080;
  return void 0;
}

// server.ts
dotenv.config();
var __filename = fileURLToPath2(import.meta.url);
var __dirname = path4.dirname(__filename);
initTempDirectories();
startCleanupTimer();
var app = express();
var PORT = parseInt(process.env.PORT || "3000", 10);
var isProd = process.env.NODE_ENV === "production";
var rateLimiter = new ServerRateLimiter(60, 6e4);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path4.extname(file.originalname).toLowerCase().slice(0, 10);
    const unique = `${Date.now()}_${crypto2.randomBytes(6).toString("hex")}${ext}`;
    cb(null, unique);
  }
});
var upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-matroska",
      "video/avi",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/aac",
      "audio/ogg",
      "audio/m4a",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml"
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported media file format. Please upload standard video or audio."));
    }
  }
});
app.use("/api", (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const check = rateLimiter.check(ip);
  if (!check.allowed) {
    return res.status(429).json({
      error: `Too many requests. Anti-abuse rate limit active. Please retry in ${check.retryAfter}s.`
    });
  }
  next();
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    engine: "FFmpeg 4.4 / Node.js Express",
    environment: isProd ? "production" : "development",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/contact", (req, res) => {
  const { email, topic, message } = req.body;
  if (!email || !message || typeof email !== "string" || typeof message !== "string") {
    return res.status(400).json({ error: "Valid email and message are required." });
  }
  const cleanEmail = email.slice(0, 120).trim();
  const cleanTopic = String(topic || "General Inquiry").slice(0, 100).trim();
  const cleanMessage = message.slice(0, 3e3).trim();
  const refId = `DK-${Date.now().toString(36).toUpperCase()}-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
  const record = {
    refId,
    email: cleanEmail,
    topic: cleanTopic,
    message: cleanMessage,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const inquiriesFile = path4.join(TEMP_BASE_DIR, "contact_inquiries.json");
    let existing = [];
    if (fs5.existsSync(inquiriesFile)) {
      try {
        existing = JSON.parse(fs5.readFileSync(inquiriesFile, "utf8"));
      } catch {
      }
    }
    existing.unshift(record);
    fs5.writeFileSync(inquiriesFile, JSON.stringify(existing.slice(0, 200), null, 2));
  } catch (err) {
    console.error("Failed to log contact inquiry:", err);
  }
  res.json({
    success: true,
    message: "Your inquiry has been received by downloadkar support.",
    referenceId: refId
  });
});
app.post("/api/upload", upload.single("mediaFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No media file was uploaded." });
  }
  try {
    const probe = await probeMedia(req.file.path);
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      probe
    });
  } catch (err) {
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      probeError: err.message
    });
  }
});
app.post("/api/media/inspect", async (req, res) => {
  const { url, fileId } = req.body;
  if (fileId && typeof fileId === "string") {
    const cleanId = path4.basename(fileId);
    const filePath = path4.join(UPLOAD_DIR, cleanId);
    if (!fs5.existsSync(filePath)) {
      return res.status(404).json({ error: "Uploaded file not found or has expired." });
    }
    try {
      const probe = await probeMedia(filePath);
      return res.json({
        type: "local",
        fileId: cleanId,
        probe
      });
    } catch (err) {
      return res.status(500).json({ error: `Media inspection failed: ${err.message}` });
    }
  }
  if (url && typeof url === "string") {
    const validation = await validateOutboundUrl(url);
    if (!validation.safe || !validation.sanitizedUrl) {
      return res.status(400).json({ error: validation.error || "Invalid or insecure URL." });
    }
    const targetUrl = validation.sanitizedUrl;
    if (/vimeo\.com/i.test(targetUrl)) {
      const vimeoIdMatch = targetUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoIdMatch) {
        try {
          const resp = await fetch(`https://vimeo.com/api/v2/video/${vimeoIdMatch[1]}.json`, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (resp.ok) {
            const arr = await resp.json();
            const v = Array.isArray(arr) ? arr[0] : null;
            if (v && v.title) {
              const dur = typeof v.duration === "number" ? v.duration : void 0;
              const fmtDur = (s) => {
                const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = Math.floor(s % 60);
                return h > 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
              };
              const srcH = typeof v.height === "number" ? v.height : void 0;
              const ladder = [1080, 720, 540, 480, 360, 240].filter((h) => srcH !== void 0 && h <= srcH);
              return res.json({
                platform: "vimeo",
                platformName: "Vimeo",
                title: v.title,
                author: v.user_name,
                authorUrl: v.user_url,
                thumbnailUrl: v.thumbnail_large || v.thumbnail_medium || v.thumbnail_small,
                durationFormatted: dur !== void 0 ? fmtDur(dur) : void 0,
                durationSeconds: dur,
                availableResolutions: ladder.length ? ladder : void 0,
                isPlatformRestricted: false
              });
            }
          }
        } catch {
        }
      }
      try {
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const data = await resp.json();
          return res.json({
            platform: "vimeo",
            platformName: "Vimeo",
            title: data.title,
            author: data.author_name,
            authorUrl: data.author_url,
            thumbnailUrl: data.thumbnail_url,
            isPlatformRestricted: false
          });
        }
      } catch {
      }
    }
    if (!isDirectMediaUrl(targetUrl) && !/vimeo\.com/i.test(targetUrl)) {
      const meta = await fetchYtDlpMetadata(targetUrl);
      if (meta && meta.title) {
        const platformNames = {
          youtube: "YouTube",
          facebook: "Facebook",
          instagram: "Instagram",
          tiktok: "TikTok",
          vimeo: "Vimeo",
          twitter: "X (Twitter)"
        };
        const key = (meta.extractorKey || "").toLowerCase();
        return res.json({
          platform: "yt-dlp",
          platformName: platformNames[key] || meta.platformName || "Online Media",
          title: meta.title,
          author: meta.author,
          authorUrl: meta.authorUrl,
          thumbnailUrl: meta.thumbnailUrl,
          durationFormatted: meta.durationFormatted,
          durationSeconds: meta.durationSeconds,
          availableResolutions: meta.resolutions,
          isPlatformRestricted: false
        });
      }
    }
    if (/youtube\.com|youtu\.be/i.test(targetUrl)) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const data = await resp.json();
          return res.json({
            platform: "youtube",
            platformName: "YouTube",
            title: data.title,
            author: data.author_name,
            authorUrl: data.author_url,
            thumbnailUrl: data.thumbnail_url,
            isPlatformRestricted: true,
            complianceNotice: "YouTube Terms of Service prohibit unauthorized stream extraction without creator permission. You can convert your own files or authorized Creative Commons media via our Media Tool."
          });
        }
      } catch {
      }
    }
    if (/\.(mp4|webm|mp3|wav|ogg|mov)(\?.*)?$/i.test(targetUrl)) {
      try {
        const probe = await probeMedia(targetUrl);
        return res.json({
          platform: "direct",
          platformName: "Direct Media Stream",
          url: targetUrl,
          probe
        });
      } catch (err) {
        return res.status(400).json({
          error: `Could not inspect direct media stream: ${err.message}`
        });
      }
    }
    return res.json({
      platform: "generic",
      platformName: "Online Media",
      url: targetUrl,
      isPlatformRestricted: true,
      complianceNotice: "To comply with copyright and platform terms of service, protected streams cannot be scraped without permission. Please use our converter for media you are authorized to process."
    });
  }
  return res.status(400).json({ error: "Either a valid URL or uploaded fileId must be provided." });
});
app.post("/api/convert", async (req, res) => {
  const {
    sourceType,
    fileId,
    url,
    targetFormat = "mp4",
    quality = "1080p",
    trimRange,
    pictureOverlay,
    title = "media_export"
  } = req.body;
  let inputPath = "";
  if (sourceType === "upload" && fileId) {
    const cleanId = path4.basename(fileId);
    inputPath = path4.join(UPLOAD_DIR, cleanId);
    if (!fs5.existsSync(inputPath)) {
      return res.status(404).json({ error: "Source media file not found or has expired." });
    }
  } else if (url && typeof url === "string") {
    const validation = await validateOutboundUrl(url);
    if (!validation.safe || !validation.sanitizedUrl) {
      return res.status(400).json({ error: validation.error || "Invalid or insecure URL." });
    }
    inputPath = validation.sanitizedUrl;
  } else {
    const sampleVideo = path4.join(__dirname, "src/assets/sample_clip.mp4");
    if (fs5.existsSync(sampleVideo)) {
      inputPath = sampleVideo;
    } else {
      return res.status(400).json({
        error: "Please upload a video/audio file or provide a direct media URL to convert."
      });
    }
  }
  let resolvedOverlay = void 0;
  if (pictureOverlay && pictureOverlay.enabled) {
    resolvedOverlay = { ...pictureOverlay };
    if (pictureOverlay.imageUrl && pictureOverlay.imageUrl.startsWith("data:image")) {
      try {
        const matches = pictureOverlay.imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].replace("+", "");
          const buffer = Buffer.from(matches[2], "base64");
          const overlayFilename = `overlay_${Date.now()}.${ext === "svgxml" ? "svg" : ext}`;
          const overlayPath = path4.join(UPLOAD_DIR, overlayFilename);
          fs5.writeFileSync(overlayPath, buffer);
          resolvedOverlay.imagePath = overlayPath;
        }
      } catch (err) {
        console.warn("Failed to decode data URL overlay:", err);
      }
    }
  }
  const safeFilename = sanitizeSafeFilename(title, targetFormat);
  try {
    const job = await jobManager.createAndStartJob({
      sourceType: sourceType === "upload" ? "upload" : "url",
      inputPath,
      targetFormat: targetFormat === "mp3" ? "mp3" : "mp4",
      quality,
      outputFilename: safeFilename,
      trimRange,
      pictureOverlay: resolvedOverlay
    });
    res.json({
      jobId: job.id,
      status: job.status,
      filename: safeFilename
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to initiate conversion job: ${err.message}` });
  }
});
app.get("/api/jobs/:id", (req, res) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found or has expired." });
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    step: job.step,
    error: job.error,
    fileSizeBytes: job.fileSizeBytes,
    outputFilename: job.outputFilename,
    downloadUrl: job.status === "completed" ? `/api/jobs/${job.id}/download` : void 0
  });
});
app.post("/api/jobs/:id/cancel", (req, res) => {
  const success = jobManager.cancelJob(req.params.id);
  if (!success) {
    return res.status(400).json({ error: "Job could not be cancelled or does not exist." });
  }
  res.json({ success: true, message: "Job successfully cancelled." });
});
app.get("/api/jobs/:id/download", (req, res) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Job not found or has expired." });
  }
  if (job.status !== "completed" || !fs5.existsSync(job.outputFilePath)) {
    return res.status(400).json({ error: "Media file is not ready for download." });
  }
  const stat = fs5.statSync(job.outputFilePath);
  const contentType = job.targetFormat === "mp3" ? "audio/mpeg" : "video/mp4";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Content-Disposition", `attachment; filename="${job.outputFilename}"`);
  const stream = fs5.createReadStream(job.outputFilePath);
  stream.pipe(res);
});
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path4.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path4.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[downloadkar] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
