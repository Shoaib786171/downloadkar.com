# DownloadKar — Professional Online Media Downloader & Video Converter

DownloadKar is a fast, secure, production-grade media processing web application powered by **React 19**, **TypeScript**, **Express**, and **native FFmpeg/ffprobe**.

Users can convert video and audio files, extract high-bitrate MP3s (up to 320kbps), trim specific segments, add customized picture frame overlays, and inspect media metadata.

---

## 🚀 Key Features

- **Genuine FFmpeg Media Pipeline**: Real audio extraction (MP3 up to 320kbps), video transcoding (H.264/AAC MP4), trimming, and picture frame overlays.
- **Accurate Real-Time Progress**: Conversion progress is computed dynamically from FFmpeg process stderr timestamps against total media duration.
- **Video Trimmer with Preview**: Built-in HTML5 player preview with dual range sliders for start/end timestamps.
- **Picture-in-Frame Overlay**: Select and overlay custom image frames onto video clips using FFmpeg filtergraphs.
- **Direct Media Uploads**: Process user-owned video and audio files safely with automatic 15-minute file lifecycle cleanup.
- **Platform Compliance**: Respects platform terms of service with official oEmbed metadata resolution and transparent compliance notices.
- **4 Design Themes**: Slate Dark, Midnight Violet, Sunset Orange, and Clean Light.
- **20 International Languages**: Instant locale switching with full i18n support.
- **Enterprise Security**: SSRF prevention (blocking private and cloud metadata IPs), strict path sanitization, and server-side rate limiting.
- **SEO Ready**: Canonical URL, OpenGraph cards, Twitter cards, Schema.org JSON-LD, `robots.txt`, and `sitemap.xml`.

---

## 🛠 Architecture & Tech Stack

```
DownloadKar/
├── server.ts                  # Express server + Vite middlewares (Port 3000)
├── src/
│   ├── server/               # Full-stack backend engine
│   │   ├── ffmpeg.ts         # Native FFmpeg & ffprobe spawn runner + progress parsing
│   │   ├── jobs.ts           # Asynchronous conversion job manager
│   │   ├── cleanup.ts        # 15-minute TTL temporary file purger
│   │   └── security.ts       # SSRF protection, IP rate limiting, path sanitization
│   ├── components/           # React 19 UI components
│   │   ├── Header.tsx        # Navigation, theme picker, language selector
│   │   ├── HeroSearch.tsx    # Media URL input + direct file upload trigger
│   │   ├── ResultCard.tsx    # Video player, trim sliders, frame overlay, formats
│   │   ├── DownloadModal.tsx # Real job progress modal & delivery
│   │   ├── ContactModal.tsx  # Functional contact support form
│   │   ├── LegalModals.tsx   # Terms of Service & Privacy Policy
│   │   ├── Features.tsx      # Platform capabilities showcase
│   │   └── FAQ.tsx           # Common user questions & answers
│   ├── services/
│   │   ├── api.ts            # Frontend API client (inspect, upload, contact)
│   │   ├── downloader.ts     # Asynchronous job polling & browser download trigger
│   │   └── i18n.ts           # 20-language translation dictionary
│   └── App.tsx               # Main state management & modal routing
├── public/
│   ├── robots.txt            # Search engine crawl rules
│   └── sitemap.xml           # XML sitemap for indexing
└── AUDIT_REPORT.md           # Full technical audit report
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check returning server uptime, FFmpeg status, and environment. |
| `POST` | `/api/media/inspect` | Safely inspects media URLs via oEmbed or ffprobe with SSRF protection. |
| `POST` | `/api/upload` | Uploads user media file (Max 150MB) for processing. |
| `POST` | `/api/convert` | Starts an asynchronous FFmpeg conversion/transcode job. |
| `GET` | `/api/jobs/:id` | Polls job processing progress (0-100%) and current step. |
| `DELETE` | `/api/jobs/:id` | Cancels an ongoing conversion job and cleans up temporary files. |
| `GET` | `/api/jobs/:id/download` | Delivers the generated media file as a secure attachment. |
| `POST` | `/api/contact` | Handles user contact messages and returns an inquiry receipt ID. |

---

## 🔒 Security Hardening

1. **SSRF Prevention**: All external URLs passed to `/api/media/inspect` or `/api/convert` are verified before fetching. Hostnames resolving to loopback (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or cloud metadata endpoints (`169.254.169.254`) are immediately rejected.
2. **Command Injection Prevention**: FFmpeg is invoked exclusively via `child_process.spawn()` with isolated string argument arrays. No shell execution (`exec` / `sh -c`) is permitted.
3. **Path Traversal Protection**: All user-provided filenames and job IDs are sanitized using regex validation, confining all operations to `/tmp/downloadkar_jobs/`.
4. **Rate Limiting**: In-memory rate limiting restricts each client IP to 60 requests per minute.
5. **Data Privacy**: All uploaded user files, frames, and transcoded outputs are deleted after 15 minutes.

---

## 🏃 Running the Application

### Development
```bash
npm run dev
# Starts full-stack server on http://localhost:3000 with Vite middleware
```

### Production Build
```bash
npm run build
npm start
```

### Linting & Type Checking
```bash
npm run lint
```
