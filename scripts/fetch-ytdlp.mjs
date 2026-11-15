// Downloads the standalone yt-dlp binary (no Python required) into ./bin
// so the app works on hosts without yt-dlp or Python installed.
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binDir = path.join(root, 'bin');

const platform = process.platform;
const arch = process.arch;

let asset;
if (platform === 'win32') {
  asset = 'yt-dlp.exe';
} else if (platform === 'linux') {
  asset = arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
} else if (platform === 'darwin') {
  asset = 'yt-dlp_macos';
} else {
  console.log(`[fetch-ytdlp] unsupported platform ${platform}, skipping`);
  process.exit(0);
}

const outName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const outPath = path.join(binDir, outName);
if (existsSync(outPath)) {
  console.log(`[fetch-ytdlp] ${outPath} already exists, skipping`);
  process.exit(0);
}

const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
console.log(`[fetch-ytdlp] downloading ${url}`);

const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) {
  console.error(`[fetch-ytdlp] download failed: HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());

mkdirSync(binDir, { recursive: true });
writeFileSync(outPath, buf);
if (platform !== 'win32') chmodSync(outPath, 0o755);
console.log(`[fetch-ytdlp] saved ${outPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
