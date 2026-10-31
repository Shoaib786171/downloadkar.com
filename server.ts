/**
 * downloadkar - Full-Stack Express Server
 * 
 * Combines:
 * 1. Secure Media Processing Engine (FFmpeg, FFprobe, Trimmer, Watermarking)
 * 2. Asynchronous Job Manager with Real-Time Progress
 * 3. Anti-SSRF and Input Validation Security Shield
 * 4. Vite Dev Server Middleware / Production Static Asset Server
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { initTempDirectories, startCleanupTimer, UPLOAD_DIR, OUTPUT_DIR, TEMP_BASE_DIR } from './src/server/cleanup';
import { validateOutboundUrl, sanitizeSafeFilename, ServerRateLimiter } from './src/server/security';
import { probeMedia } from './src/server/ffmpeg';
import { jobManager } from './src/server/jobs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Directories & Background Cleaner
initTempDirectories();
startCleanupTimer();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Rate Limiter
const rateLimiter = new ServerRateLimiter(60, 60000);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const unique = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/m4a',
      'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported media file format. Please upload standard video or audio.'));
    }
  },
});

// Rate limiting middleware for API routes
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const check = rateLimiter.check(ip);
  if (!check.allowed) {
    return res.status(429).json({
      error: `Too many requests. Anti-abuse rate limit active. Please retry in ${check.retryAfter}s.`,
    });
  }
  next();
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/health
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    engine: 'FFmpeg 4.4 / Node.js Express',
    environment: isProd ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/contact
 */
app.post('/api/contact', (req: Request, res: Response) => {
  const { email, topic, message } = req.body;
  if (!email || !message || typeof email !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ error: 'Valid email and message are required.' });
  }

  const cleanEmail = email.slice(0, 120).trim();
  const cleanTopic = String(topic || 'General Inquiry').slice(0, 100).trim();
  const cleanMessage = message.slice(0, 3000).trim();

  const refId = `DK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const record = {
    refId,
    email: cleanEmail,
    topic: cleanTopic,
    message: cleanMessage,
    receivedAt: new Date().toISOString(),
  };

  try {
    const inquiriesFile = path.join(TEMP_BASE_DIR, 'contact_inquiries.json');
    let existing: any[] = [];
    if (fs.existsSync(inquiriesFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(inquiriesFile, 'utf8'));
      } catch {}
    }
    existing.unshift(record);
    fs.writeFileSync(inquiriesFile, JSON.stringify(existing.slice(0, 200), null, 2));
  } catch (err) {
    console.error('Failed to log contact inquiry:', err);
  }

  res.json({
    success: true,
    message: 'Your inquiry has been received by downloadkar support.',
    referenceId: refId,
  });
});

/**
 * POST /api/upload
 * Handles local user media uploads for genuine FFmpeg processing
 */
app.post('/api/upload', upload.single('mediaFile'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No media file was uploaded.' });
  }

  try {
    const probe = await probeMedia(req.file.path);
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      probe,
    });
  } catch (err: any) {
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      probeError: err.message,
    });
  }
});

/**
 * POST /api/media/inspect
 * Inspects either an uploaded fileId or a validated public media URL
 */
app.post('/api/media/inspect', async (req: Request, res: Response) => {
  const { url, fileId } = req.body;

  if (fileId && typeof fileId === 'string') {
    const cleanId = path.basename(fileId);
    const filePath = path.join(UPLOAD_DIR, cleanId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Uploaded file not found or has expired.' });
    }

    try {
      const probe = await probeMedia(filePath);
      return res.json({
        type: 'local',
        fileId: cleanId,
        probe,
      });
    } catch (err: any) {
      return res.status(500).json({ error: `Media inspection failed: ${err.message}` });
    }
  }

  if (url && typeof url === 'string') {
    const validation = await validateOutboundUrl(url);
    if (!validation.safe || !validation.sanitizedUrl) {
      return res.status(400).json({ error: validation.error || 'Invalid or insecure URL.' });
    }

    const targetUrl = validation.sanitizedUrl;

    // 1. YouTube oEmbed
    if (/youtube\.com|youtu\.be/i.test(targetUrl)) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const data = await resp.json();
          return res.json({
            platform: 'youtube',
            platformName: 'YouTube',
            title: data.title,
            author: data.author_name,
            authorUrl: data.author_url,
            thumbnailUrl: data.thumbnail_url,
            isPlatformRestricted: true,
            complianceNotice:
              'YouTube Terms of Service prohibit unauthorized stream extraction without creator permission. You can convert your own files or authorized Creative Commons media via our Media Tool.',
          });
        }
      } catch {}
    }

    // 2. Vimeo oEmbed
    if (/vimeo\.com/i.test(targetUrl)) {
      try {
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`;
        const resp = await fetch(oembedUrl);
        if (resp.ok) {
          const data = await resp.json();
          return res.json({
            platform: 'vimeo',
            platformName: 'Vimeo',
            title: data.title,
            author: data.author_name,
            authorUrl: data.author_url,
            thumbnailUrl: data.thumbnail_url,
            isPlatformRestricted: true,
            complianceNotice: 'Vimeo media requires license or Creative Commons permission for offline export.',
          });
        }
      } catch {}
    }

    // 3. Direct Public Media URL Inspection
    if (/\.(mp4|webm|mp3|wav|ogg|mov)(\?.*)?$/i.test(targetUrl)) {
      try {
        const probe = await probeMedia(targetUrl);
        return res.json({
          platform: 'direct',
          platformName: 'Direct Media Stream',
          url: targetUrl,
          probe,
        });
      } catch (err: any) {
        return res.status(400).json({
          error: `Could not inspect direct media stream: ${err.message}`,
        });
      }
    }

    // Generic platform response
    return res.json({
      platform: 'generic',
      platformName: 'Online Media',
      url: targetUrl,
      isPlatformRestricted: true,
      complianceNotice:
        'To comply with copyright and platform terms of service, protected streams cannot be scraped without permission. Please use our converter for media you are authorized to process.',
    });
  }

  return res.status(400).json({ error: 'Either a valid URL or uploaded fileId must be provided.' });
});

/**
 * POST /api/convert
 * Starts a genuine FFmpeg transcoding, audio extraction, trimming, or watermarking job
 */
app.post('/api/convert', async (req: Request, res: Response) => {
  const {
    sourceType,
    fileId,
    url,
    targetFormat = 'mp4',
    quality = '1080p',
    trimRange,
    pictureOverlay,
    title = 'media_export',
  } = req.body;

  let inputPath = '';

  if (sourceType === 'upload' && fileId) {
    const cleanId = path.basename(fileId);
    inputPath = path.join(UPLOAD_DIR, cleanId);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Source media file not found or has expired.' });
    }
  } else if (url && typeof url === 'string') {
    const validation = await validateOutboundUrl(url);
    if (!validation.safe || !validation.sanitizedUrl) {
      return res.status(400).json({ error: validation.error || 'Invalid or insecure URL.' });
    }
    inputPath = validation.sanitizedUrl;
  } else {
    // If no direct input provided, check if a demo sample exists or return helpful error
    const sampleVideo = path.join(__dirname, 'src/assets/sample_clip.mp4');
    if (fs.existsSync(sampleVideo)) {
      inputPath = sampleVideo;
    } else {
      return res.status(400).json({
        error: 'Please upload a video/audio file or provide a direct media URL to convert.',
      });
    }
  }

  // Handle Picture Overlay Image
  let resolvedOverlay: any = undefined;
  if (pictureOverlay && pictureOverlay.enabled) {
    resolvedOverlay = { ...pictureOverlay };
    if (pictureOverlay.imageUrl && pictureOverlay.imageUrl.startsWith('data:image')) {
      try {
        const matches = pictureOverlay.imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].replace('+', '');
          const buffer = Buffer.from(matches[2], 'base64');
          const overlayFilename = `overlay_${Date.now()}.${ext === 'svgxml' ? 'svg' : ext}`;
          const overlayPath = path.join(UPLOAD_DIR, overlayFilename);
          fs.writeFileSync(overlayPath, buffer);
          resolvedOverlay.imagePath = overlayPath;
        }
      } catch (err) {
        console.warn('Failed to decode data URL overlay:', err);
      }
    }
  }

  const safeFilename = sanitizeSafeFilename(title, targetFormat);

  try {
    const job = await jobManager.createAndStartJob({
      sourceType: sourceType === 'upload' ? 'upload' : 'url',
      inputPath,
      targetFormat: targetFormat === 'mp3' ? 'mp3' : 'mp4',
      quality,
      outputFilename: safeFilename,
      trimRange,
      pictureOverlay: resolvedOverlay,
    });

    res.json({
      jobId: job.id,
      status: job.status,
      filename: safeFilename,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to initiate conversion job: ${err.message}` });
  }
});

/**
 * GET /api/jobs/:id
 * Polls real status & progress of a conversion job
 */
app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or has expired.' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    step: job.step,
    error: job.error,
    fileSizeBytes: job.fileSizeBytes,
    outputFilename: job.outputFilename,
    downloadUrl: job.status === 'completed' ? `/api/jobs/${job.id}/download` : undefined,
  });
});

/**
 * POST /api/jobs/:id/cancel
 */
app.post('/api/jobs/:id/cancel', (req: Request, res: Response) => {
  const success = jobManager.cancelJob(req.params.id);
  if (!success) {
    return res.status(400).json({ error: 'Job could not be cancelled or does not exist.' });
  }
  res.json({ success: true, message: 'Job successfully cancelled.' });
});

/**
 * GET /api/jobs/:id/download
 * Streams the genuinely converted media file to the user's browser
 */
app.get('/api/jobs/:id/download', (req: Request, res: Response) => {
  const job = jobManager.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or has expired.' });
  }

  if (job.status !== 'completed' || !fs.existsSync(job.outputFilePath)) {
    return res.status(400).json({ error: 'Media file is not ready for download.' });
  }

  const stat = fs.statSync(job.outputFilePath);
  const contentType = job.targetFormat === 'mp3' ? 'audio/mpeg' : 'video/mp4';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${job.outputFilename}"`);

  const stream = fs.createReadStream(job.outputFilePath);
  stream.pipe(res);
});

// ============================================================================
// FRONTEND SERVING (Vite in Dev / Static dist in Prod)
// ============================================================================
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[downloadkar] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
