# DownloadKar — All-in-One Video Downloader & Media Converter

DownloadKar is a fast, full-stack media downloader and processing web app powered by **React 19**, **TypeScript**, **Express**, **yt-dlp**, and **native FFmpeg/ffprobe**.

Paste a link from YouTube, Facebook, Instagram, TikTok, Vimeo, X, and 1000+ other sites — or upload your own file — then pick a resolution (up to 1080p), trim clips, extract MP3 audio, or overlay picture frames.

---

## 🚀 Key Features

- **Platform Downloads via yt-dlp**: Resolves YouTube, Facebook Reels, Instagram Reels, TikTok, X, Vimeo, and thousands of other sites into local media automatically.
- **Real Quality Picker**: Resolution options are built from the actual formats each video offers (capped at 1080p), plus MP3 audio at 320/256/192/128 kbps — with estimated file sizes.
- **Smart Speed Pipeline**:
  - Downloads are capped at your selected resolution (no more pulling 4K for a 480p request).
  - H.264 (avc1) formats are preferred so FFmpeg can **remux instead of re-encode**.
  - Plain MP4/MP3 downloads **skip FFmpeg entirely** — yt-dlp's output is delivered directly.
  - Parallel fragment downloads (`-N 8`) for DASH/HLS sources.
- **Browser-Cookie Fallback**: Platforms that require login (Facebook, Instagram, Vimeo) automatically retry using cookies from your locally installed browsers.
- **Vimeo Fast Path**: Public Vimeo metadata (title, duration, resolution ladder) resolved via the legacy v2 API — no login needed for inspect/trim/quality selection.
- **Video Trimmer**: Real duration metadata powers accurate start/end trim controls before any download happens.
- **Picture-in-Frame Overlay**: Custom image frames composited onto video via FFmpeg filtergraphs.
- **Genuine FFmpeg Engine**: Real transcoding, trimming, audio extraction, and progress parsed from FFmpeg stderr.
- **Direct Media Uploads**: Process your own video/audio files with automatic cleanup.
- **4 Design Themes** · **20 Languages** · **SEO Ready** (OG cards, JSON-LD, sitemap, robots.txt).

---

## 🛠 Architecture & Tech Stack

```
DownloadKar/
├── server.ts                  # Express server + Vite middlewares (Port 3000)
├── src/
│   ├── server/               # Full-stack backend engine
│   │   ├── ffmpeg.ts         # FFmpeg/ffprobe runner, arg builder, stream-copy fast path
│   │   ├── ytdlp.ts          # yt-dlp downloader: progress, cancel, cookie fallback,
│   │   │                     #   transient retry, resolution-capped format selection
│   │   ├── jobs.ts           # Async job manager: yt-dlp → probe → FFmpeg/passthrough
│   │   ├── cleanup.ts        # TTL-based temp file purger (15 min uploads / outputs)
│   │   └── security.ts       # SSRF protection, IP rate limiting, path sanitization
│   ├── components/           # React 19 UI components
│   │   ├── Header.tsx        # Navigation, theme picker, language selector
│   │   ├── HeroSearch.tsx    # Media URL input + direct file upload trigger
│   │   ├── ResultCard.tsx    # Video info, quick resolution picker, trim tool, formats
│   │   ├── DownloadModal.tsx # Animated progress modal & delivery
│   │   ├── ContactModal.tsx  # Functional contact support form
│   │   ├── LegalModals.tsx   # Terms of Service & Privacy Policy
│   │   ├── Features.tsx      # Platform capabilities showcase
│   │   └── FAQ.tsx           # Common user questions & answers
│   ├── services/
│   │   ├── api.ts            # Frontend API client (inspect, upload, contact)
│   │   ├── downloader.ts     # Job polling & browser download trigger
│   │   └── i18n.ts           # 20-language translation dictionary
│   └── App.tsx               # Main state management & modal routing
├── public/
│   ├── robots.txt            # Search engine crawl rules
│   └── sitemap.xml           # XML sitemap for indexing
└── AUDIT_REPORT.md           # Full technical audit report
```

### Processing Pipeline

```
URL ──► validateOutboundUrl (SSRF shield)
     ──► direct media file? ──► FFmpeg directly
     ──► platform page?     ──► yt-dlp download (resolution-capped, H.264 preferred,
                              cookie fallback for login-walled sites)
                          ──► ffprobe duration/codec inspection
                          ──► passthrough? ──► deliver file instantly
                          ──► else FFmpeg transcode/trim/overlay ──► deliver
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check: uptime, engine info, environment. |
| `POST` | `/api/media/inspect` | Resolves metadata via yt-dlp / Vimeo v2 API / oEmbed / ffprobe. Returns title, author, thumbnail, duration, and available resolutions. |
| `POST` | `/api/upload` | Uploads a media file (max 100 MB) for processing. |
| `POST` | `/api/convert` | Starts an async download/convert job (`sourceType`, `url`/`fileId`, `targetFormat`, `quality`, `trimRange`, `pictureOverlay`). |
| `GET` | `/api/jobs/:id` | Polls job status, progress %, current step, and download URL. |
| `POST` | `/api/jobs/:id/cancel` | Cancels a running job. |
| `GET` | `/api/jobs/:id/download` | Streams the finished media file as an attachment. |
| `POST` | `/api/contact` | Receives support inquiries, returns a reference ID. |

---

## 🔒 Security Hardening

1. **SSRF Prevention**: Outbound URLs are DNS-resolved and rejected if they point to loopback, private, link-local, or cloud metadata ranges.
2. **Command Injection Prevention**: FFmpeg and yt-dlp are invoked via `child_process.spawn()` with argument arrays — no shell execution.
3. **Path Traversal Protection**: Filenames and job IDs are sanitized; all file operations are confined to the temp jobs directory.
4. **Rate Limiting**: 60 requests/minute per IP on `/api/*`.
5. **Data Privacy**: Uploaded files, downloaded sources, and outputs are auto-deleted after ~15 minutes.

---

## 📋 Requirements

- **Node.js 20+** and npm
- **FFmpeg + ffprobe** on `PATH` (e.g. `winget install Gyan.FFmpeg`)
- **yt-dlp** on `PATH` (e.g. `winget install yt-dlp.yt-dlp`) — required for platform downloads
- For login-walled platforms (Facebook, Instagram, Vimeo): the corresponding site session in a local browser; **close the browser** before downloading so yt-dlp can read its cookies

---

## 🏃 Running the Application

### Development
```bash
npm install
npm run dev
# Full-stack server on http://localhost:3000 (Vite middleware)
```

### Production
```bash
npm run build
npm start
```

### Lint / Type Check
```bash
npm run lint   # tsc --noEmit
```

---

## ⚠️ Platform Notes

- **YouTube / TikTok / most sites**: work without login.
- **Facebook, Instagram, Vimeo**: require an authenticated session — the app auto-retries with your browser cookies. Fully closing the browser before downloading is required on Windows.
- Downloads are for personal use only; respect each platform's Terms of Service and copyright.
