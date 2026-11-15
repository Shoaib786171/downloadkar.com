import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function tryRequireString(pkg: string): string | null {
  try {
    const mod = require(pkg);
    const p = typeof mod === 'string' ? mod : mod?.default ?? mod?.path;
    return typeof p === 'string' && fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

function tryRequireYtDlp(): string | null {
  try {
    const { constants } = require('youtube-dl-exec');
    const p = constants?.YOUTUBE_DL_PATH;
    return typeof p === 'string' && fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

export function ffmpegBin(): string {
  return (
    process.env.FFMPEG_PATH ||
    tryRequireString('ffmpeg-static') ||
    'ffmpeg'
  );
}

export function ffprobeBin(): string {
  return (
    process.env.FFPROBE_PATH ||
    tryRequireString('ffprobe-static') ||
    'ffprobe'
  );
}

export function ytDlpBin(): string {
  return (
    process.env.YTDLP_PATH ||
    tryRequireYtDlp() ||
    'yt-dlp'
  );
}
