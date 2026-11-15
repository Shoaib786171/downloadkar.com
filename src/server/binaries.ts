import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const localBin = path.join(projectRoot, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

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

function localYtDlp(): string | null {
  return fs.existsSync(localBin) ? localBin : null;
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
    localYtDlp() ||
    tryRequireYtDlp() ||
    'yt-dlp'
  );
}
