/**
 * downloadkar - Multi-Platform Video Data Extraction & API Service
 * 
 * ============================================================================
 * BACKEND INTEGRATION INSTRUCTIONS FOR DEVELOPERS:
 * ============================================================================
 * 
 * Browsers cannot directly scrape and bypass CORS/DRM restrictions of media platforms
 * (YouTube, TikTok, Instagram, Facebook). To deploy this into a real production app,
 * connect this frontend to one of the two backends below:
 * 
 * ----------------------------------------------------------------------------
 * OPTION 1: Self-Hosted Node.js / Express Backend with `yt-dlp-exec`
 * ----------------------------------------------------------------------------
 * 1. Initialize a Node.js server:
 *    npm init -y
 *    npm install express cors yt-dlp-exec
 * 
 * 2. Create `server.js`:
 *    const express = require('express');
 *    const cors = require('cors');
 *    const youtubedl = require('yt-dlp-exec');
 * 
 *    const app = express();
 *    app.use(cors());
 *    app.use(express.json());
 * 
 *    app.post('/api/fetch', async (req, res) => {
 *      try {
 *        const { url } = req.body;
 *        const output = await youtubedl(url, {
 *          dumpSingleJson: true,
 *          noWarnings: true,
 *          noCallHome: true,
 *          preferFreeFormats: true,
 *          youtubeSkipDashManifest: true
 *        });
 *        
 *        // Format the raw yt-dlp payload to match the VideoMetadata schema
 *        return res.json({
 *          id: output.id,
 *          title: output.title,
 *          author: output.uploader || output.channel,
 *          duration: formatDuration(output.duration),
 *          views: output.view_count ? output.view_count.toLocaleString() : undefined,
 *          thumbnailUrl: output.thumbnail,
 *          formats: output.formats.map(f => ({
 *            id: f.format_id,
 *            label: `${f.resolution || f.format_note || 'Standard'}`,
 *            quality: f.resolution || '720p',
 *            type: f.vcodec !== 'none' ? 'video' : 'audio',
 *            extension: f.ext,
 *            fileSize: f.filesize ? `${(f.filesize / (1024*1024)).toFixed(1)} MB` : 'Dynamic',
 *            downloadUrl: f.url
 *          }))
 *        });
 *      } catch (err) {
 *        res.status(500).json({ error: err.message });
 *      }
 *    });
 *    app.listen(5000, () => console.log('Downloader backend running on port 5000'));
 * 
 * ----------------------------------------------------------------------------
 * OPTION 2: RapidAPI (e.g. Cobalt API, All-In-One Downloader, Social Media API)
 * ----------------------------------------------------------------------------
 * 1. Subscribe to a video downloader API on https://rapidapi.com (e.g., Cobalt, All-In-One Video Downloader).
 * 2. Update the custom endpoint in settings to forward requests with your `X-RapidAPI-Key`.
 * ============================================================================
 */

import { BackendApiConfig, PlatformType, VideoFormatOption, VideoMetadata } from '../types/downloader';
import { validateAndSanitizeUrl, sanitizeText, MAX_URL_LENGTH } from './security';

// High-fidelity generated sample preview thumbnails
export const SAMPLE_THUMBNAILS = {
  youtube: '/src/assets/images/yt_sample_thumbnail_1792856543625.jpg',
  instagram: '/src/assets/images/ig_sample_thumbnail_1792856544865.jpg',
  tiktok: '/src/assets/images/tt_sample_thumbnail_1792856544724.jpg',
  facebook: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', // Fallback URL handled with styled container
  vimeo: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
};

/**
 * Platform Regex Detection Rules
 */
export const PLATFORM_DETECTORS: Record<
  Exclude<PlatformType, 'unknown'>,
  { name: string; regex: RegExp; placeholder: string; sampleUrl: string; brandColor: string }
> = {
  youtube: {
    name: 'YouTube',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    sampleUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    brandColor: '#FF0000',
  },
  instagram: {
    name: 'Instagram',
    regex: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv|reels)\/([a-zA-Z0-9_-]+)/i,
    placeholder: 'https://www.instagram.com/reel/C3b45a_xyz/',
    sampleUrl: 'https://www.instagram.com/reel/CxkM40hLElE/',
    brandColor: '#E1306C',
  },
  tiktok: {
    name: 'TikTok',
    regex: /(?:https?:\/\/)?(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|v\/\d+|t\/[a-zA-Z0-9]+|[\w-]+)/i,
    placeholder: 'https://www.tiktok.com/@creator/video/7123456789012345678',
    sampleUrl: 'https://www.tiktok.com/@aesthetic_vibes/video/7391823901283921029',
    brandColor: '#00F2FE',
  },
  facebook: {
    name: 'Facebook',
    regex: /(?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook\.com\/(?:watch\/?\?v=\d+|reel\/\d+|[a-zA-Z0-9.-]+\/videos\/\d+|share\/(?:v|r)\/[a-zA-Z0-9]+)|fb\.watch\/[a-zA-Z0-9_-]+)/i,
    placeholder: 'https://www.facebook.com/watch?v=101582918392',
    sampleUrl: 'https://www.facebook.com/watch?v=84920491820',
    brandColor: '#1877F2',
  },
  vimeo: {
    name: 'Vimeo',
    regex: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i,
    placeholder: 'https://vimeo.com/76979871',
    sampleUrl: 'https://vimeo.com/76979871',
    brandColor: '#1AB7EA',
  },
  twitter: {
    name: 'X (Twitter)',
    regex: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/(\d+)/i,
    placeholder: 'https://x.com/username/status/1234567890123456789',
    sampleUrl: 'https://x.com/discover_earth/status/1784918204918294012',
    brandColor: '#1DA1F2',
  },
};

/**
 * Automatically detects the platform of any URL using regular expressions
 * Protected against ReDoS and length-based denial of service.
 */
export function detectPlatform(url: string): PlatformType {
  if (!url || typeof url !== 'string') return 'unknown';
  const trimmed = url.trim().slice(0, MAX_URL_LENGTH);
  if (!trimmed) return 'unknown';

  for (const [key, detector] of Object.entries(PLATFORM_DETECTORS)) {
    if (detector.regex.test(trimmed)) {
      return key as PlatformType;
    }
  }

  // Generic fallback if domain matches
  if (/youtube\.com|youtu\.be/i.test(trimmed)) return 'youtube';
  if (/instagram\.com/i.test(trimmed)) return 'instagram';
  if (/tiktok\.com/i.test(trimmed)) return 'tiktok';
  if (/facebook\.com|fb\.watch/i.test(trimmed)) return 'facebook';
  if (/vimeo\.com/i.test(trimmed)) return 'vimeo';
  if (/twitter\.com|x\.com/i.test(trimmed)) return 'twitter';

  return 'unknown';
}

/**
 * Extracts video ID if possible (for YouTube, Instagram, Vimeo)
 */
export function extractVideoId(url: string, platform: PlatformType): string | null {
  const trimmed = url.trim().slice(0, MAX_URL_LENGTH);
  const detector = PLATFORM_DETECTORS[platform as keyof typeof PLATFORM_DETECTORS];
  if (!detector) return null;

  const match = trimmed.match(detector.regex);
  if (match && match[1]) {
    return sanitizeText(match[1], 64);
  }
  return null;
}

/**
 * Asynchronous function to fetch video data from a URL.
 * Hardened with zero-trust input validation, anti-XSS, and scheme blocking.
 */
/**
 * Uploads a local user video or audio file for genuine FFmpeg processing
 */
export async function uploadUserMediaFile(file: File): Promise<VideoMetadata> {
  const formData = new FormData();
  formData.append('mediaFile', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed (HTTP ${response.status})`);
  }

  const data = await response.json();
  const probe = data.probe || {};
  const isAudioOnly = !probe.hasVideo && probe.hasAudio;

  const videoFormats: VideoFormatOption[] = isAudioOnly
    ? []
    : [
        {
          id: 'mp4-1080p',
          label: '1080p Full HD (FFmpeg Transcode)',
          quality: '1080p',
          type: 'video',
          extension: 'mp4',
          fileSize: `${Math.max(1, Math.round(file.size / (1024 * 1024)))} MB`,
          hasAudio: true,
        },
        {
          id: 'mp4-720p',
          label: '720p HD (Balanced Compression)',
          quality: '720p',
          type: 'video',
          extension: 'mp4',
          fileSize: `${Math.max(1, Math.round((file.size * 0.6) / (1024 * 1024)))} MB`,
          hasAudio: true,
        },
        {
          id: 'mp4-480p',
          label: '480p Mobile (Compact MP4)',
          quality: '480p',
          type: 'video',
          extension: 'mp4',
          fileSize: `${Math.max(1, Math.round((file.size * 0.35) / (1024 * 1024)))} MB`,
          hasAudio: true,
        },
      ];

  const audioFormats: VideoFormatOption[] = [
    {
      id: 'mp3-320',
      label: '320 kbps (High Fidelity MP3)',
      quality: '320kbps',
      type: 'audio',
      extension: 'mp3',
      fileSize: `${Math.max(1, Math.round((probe.durationSeconds || 60) * 0.04))} MB`,
    },
    {
      id: 'mp3-192',
      label: '192 kbps (Standard MP3)',
      quality: '192kbps',
      type: 'audio',
      extension: 'mp3',
      fileSize: `${Math.max(1, Math.round((probe.durationSeconds || 60) * 0.024))} MB`,
    },
  ];

  return {
    id: `upload_${data.fileId}`,
    originalUrl: `local://${data.fileId}`,
    uploadedFileId: data.fileId,
    platform: 'unknown',
    platformName: 'Uploaded Media',
    title: data.originalName,
    author: 'Local File',
    duration: probe.durationFormatted || '01:00',
    views: 'Local File',
    publishDate: 'Uploaded just now',
    thumbnailUrl: SAMPLE_THUMBNAILS.youtube,
    formats: [...videoFormats, ...audioFormats],
    fetchedAt: Date.now(),
    probeInfo: probe,
  };
}

/**
 * Asynchronous function to inspect media data from a URL or backend inspector.
 */
export async function fetchVideoData(
  url: string,
  config: BackendApiConfig = { mode: 'mock', customEndpoint: '' }
): Promise<VideoMetadata> {
  // 1. Strict Security Validation
  const validation = validateAndSanitizeUrl(url);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid or insecure video URL provided.');
  }

  const sanitizedUrl = validation.sanitizedUrl;
  const platform = detectPlatform(sanitizedUrl);

  // 2. Query our real backend /api/media/inspect endpoint
  try {
    const inspectResponse = await fetch('/api/media/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sanitizedUrl }),
    });

    if (inspectResponse.ok) {
      const inspectData = await inspectResponse.json();

      // If backend probed a direct media stream
      if (inspectData.platform === 'direct' && inspectData.probe) {
        const probe = inspectData.probe;
        const videoFormats: VideoFormatOption[] = [
          {
            id: 'direct-mp4',
            label: 'Transcode to MP4 (1080p / 720p)',
            quality: '1080p',
            type: 'video',
            extension: 'mp4',
            fileSize: `${(probe.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
            hasAudio: probe.hasAudio,
          },
          {
            id: 'direct-mp3',
            label: 'Extract Audio (320kbps MP3)',
            quality: '320kbps',
            type: 'audio',
            extension: 'mp3',
            fileSize: `${Math.max(1, Math.round((probe.durationSeconds || 60) * 0.04))} MB`,
          },
        ];

        return {
          id: `media_${Date.now().toString(36)}`,
          originalUrl: sanitizedUrl,
          platform: 'unknown',
          platformName: 'Direct Media Stream',
          title: (sanitizedUrl.split('/').pop() || 'Media Stream').split('?')[0] || 'Media Stream',
          author: 'Web Media Source',
          duration: probe.durationFormatted || '00:00',
          thumbnailUrl: SAMPLE_THUMBNAILS.youtube,
          formats: videoFormats,
          fetchedAt: Date.now(),
          probeInfo: probe,
        };
      }

      // If backend resolved oEmbed data (e.g. YouTube, Vimeo)
      if (inspectData.title) {
        const id = extractVideoId(sanitizedUrl, platform) || `media_${Date.now().toString(36)}`;
        const base = buildMockVideoResponse(sanitizedUrl, platform, id);
        return {
          ...base,
          title: inspectData.title || base.title,
          author: inspectData.author || base.author,
          thumbnailUrl: inspectData.thumbnailUrl || base.thumbnailUrl,
          isPlatformRestricted: inspectData.isPlatformRestricted,
          complianceNotice: inspectData.complianceNotice,
        };
      }
    }
  } catch (err) {
    console.warn('Backend inspect query failed, falling back to client parser:', err);
  }

  if (platform === 'unknown') {
    throw new Error(
      'Unsupported URL or platform. Please paste a valid link from YouTube, Instagram, TikTok, Facebook, or Vimeo, or upload a media file.'
    );
  }

  const id = extractVideoId(sanitizedUrl, platform) || `media_${Date.now().toString(36)}`;
  return buildMockVideoResponse(sanitizedUrl, platform, id);
}

/**
 * Factory for creating rich, realistic mock video metadata per platform
 */
function buildMockVideoResponse(url: string, platform: PlatformType, id: string): VideoMetadata {
  const now = Date.now();

  switch (platform) {
    case 'youtube': {
      const isShort = url.includes('/shorts/');
      const videoFormats: VideoFormatOption[] = [
        {
          id: 'yt-1080p',
          label: '1080p Full HD',
          quality: '1080p',
          type: 'video',
          extension: 'mp4',
          fileSize: isShort ? '14.8 MB' : '92.4 MB',
          hasAudio: true,
        },
        {
          id: 'yt-720p',
          label: '720p HD',
          quality: '720p',
          type: 'video',
          extension: 'mp4',
          fileSize: isShort ? '8.2 MB' : '48.1 MB',
          hasAudio: true,
        },
        {
          id: 'yt-480p',
          label: '480p Standard',
          quality: '480p',
          type: 'video',
          extension: 'mp4',
          fileSize: isShort ? '5.1 MB' : '26.7 MB',
          hasAudio: true,
        },
        {
          id: 'yt-360p',
          label: '360p Mobile',
          quality: '360p',
          type: 'video',
          extension: 'mp4',
          fileSize: isShort ? '3.4 MB' : '15.9 MB',
          hasAudio: true,
        },
      ];

      const audioFormats: VideoFormatOption[] = [
        {
          id: 'yt-mp3-320',
          label: '320 kbps (Lossless MP3)',
          quality: '320kbps',
          type: 'audio',
          extension: 'mp3',
          fileSize: '8.4 MB',
        },
        {
          id: 'yt-mp3-256',
          label: '256 kbps (High Quality MP3)',
          quality: '256kbps',
          type: 'audio',
          extension: 'mp3',
          fileSize: '6.8 MB',
        },
        {
          id: 'yt-mp3-128',
          label: '128 kbps (Standard MP3)',
          quality: '128kbps',
          type: 'audio',
          extension: 'mp3',
          fileSize: '3.6 MB',
        },
      ];

      return {
        id,
        originalUrl: url,
        platform: 'youtube',
        platformName: 'YouTube',
        title: isShort
          ? 'Mind-Blowing Nature Moments Caught on 4K Camera #shorts'
          : 'Majestic Alpine Glacial Peaks & Turquoise Lake 4K Cinematic Documentary',
        author: 'Earth & Nature Expeditions',
        authorUrl: 'https://youtube.com/@earth_expeditions',
        duration: isShort ? '00:58' : '14:26',
        views: '2.4M views',
        publishDate: '2 weeks ago',
        thumbnailUrl: SAMPLE_THUMBNAILS.youtube,
        formats: [...videoFormats, ...audioFormats],
        fetchedAt: now,
      };
    }

    case 'instagram': {
      const isReel = url.includes('/reel') || url.includes('/reels');
      const formats: VideoFormatOption[] = [
        {
          id: 'ig-video-hd',
          label: 'HD Original (1080x1920 MP4)',
          quality: '1080p',
          type: 'video',
          extension: 'mp4',
          fileSize: '24.6 MB',
          hasAudio: true,
        },
        {
          id: 'ig-video-sd',
          label: 'SD Standard (720x1280 MP4)',
          quality: '720p',
          type: 'video',
          extension: 'mp4',
          fileSize: '12.1 MB',
          hasAudio: true,
        },
        {
          id: 'ig-audio-mp3',
          label: 'Reel Audio (MP3)',
          quality: '192kbps',
          type: 'audio',
          extension: 'mp3',
          fileSize: '2.1 MB',
        },
      ];

      return {
        id,
        originalUrl: url,
        platform: 'instagram',
        platformName: 'Instagram',
        title: isReel
          ? 'Urban Tokyo Street Style & Neon Night Walks in Shinjuku'
          : 'Cinematic creator moments in Tokyo downtown #travel #tokyo',
        author: '@tokyo_streetculture',
        authorUrl: 'https://instagram.com/tokyo_streetculture',
        duration: '00:45',
        views: '840K views',
        publishDate: '3 days ago',
        thumbnailUrl: SAMPLE_THUMBNAILS.instagram,
        formats,
        fetchedAt: now,
      };
    }

    case 'tiktok': {
      const formats: VideoFormatOption[] = [
        {
          id: 'tt-no-watermark',
          label: 'Download Video (No Watermark MP4)',
          quality: '1080p',
          type: 'video',
          extension: 'mp4',
          fileSize: '18.4 MB',
          noWatermark: true,
          hasAudio: true,
        },
        {
          id: 'tt-watermark',
          label: 'Download Video (With Watermark)',
          quality: '1080p',
          type: 'video',
          extension: 'mp4',
          fileSize: '18.5 MB',
          hasAudio: true,
        },
        {
          id: 'tt-audio',
          label: 'Original Audio Track (MP3)',
          quality: '192kbps',
          type: 'audio',
          extension: 'mp3',
          fileSize: '1.8 MB',
        },
      ];

      return {
        id,
        originalUrl: url,
        platform: 'tiktok',
        platformName: 'TikTok',
        title: 'Crispy Artisan Street Food Wok Stir-Fry with Fiery Herbs & Noodles',
        author: '@sizzling_streetchef',
        authorUrl: 'https://tiktok.com/@sizzling_streetchef',
        duration: '00:32',
        views: '4.8M views',
        publishDate: 'Yesterday',
        thumbnailUrl: SAMPLE_THUMBNAILS.tiktok,
        formats,
        fetchedAt: now,
      };
    }

    case 'facebook': {
      const formats: VideoFormatOption[] = [
        {
          id: 'fb-hd',
          label: 'HD Quality (720p / 1080p MP4)',
          quality: 'HD',
          type: 'video',
          extension: 'mp4',
          fileSize: '38.2 MB',
          hasAudio: true,
        },
        {
          id: 'fb-sd',
          label: 'SD Quality (Standard MP4)',
          quality: 'SD',
          type: 'video',
          extension: 'mp4',
          fileSize: '16.5 MB',
          hasAudio: true,
        },
        {
          id: 'fb-mp3',
          label: 'Extract Audio (MP3)',
          quality: '128kbps',
          type: 'audio',
          extension: 'mp3',
          fileSize: '3.1 MB',
        },
      ];

      return {
        id,
        originalUrl: url,
        platform: 'facebook',
        platformName: 'Facebook',
        title: 'Masterclass: Modern Acoustic Guitar Picking Techniques & Harmonics',
        author: 'Acoustic Guitar Sessions',
        authorUrl: 'https://facebook.com/acousticguitarsessions',
        duration: '05:12',
        views: '320K views',
        publishDate: '1 month ago',
        thumbnailUrl: SAMPLE_THUMBNAILS.youtube, // Reliable local asset fallback
        formats,
        fetchedAt: now,
      };
    }

    case 'vimeo': {
      const formats: VideoFormatOption[] = [
        {
          id: 'vm-1080p',
          label: '1080p Original Master (MP4)',
          quality: '1080p',
          type: 'video',
          extension: 'mp4',
          fileSize: '64.5 MB',
          hasAudio: true,
        },
        {
          id: 'vm-720p',
          label: '720p High Definition (MP4)',
          quality: '720p',
          type: 'video',
          extension: 'mp4',
          fileSize: '32.1 MB',
          hasAudio: true,
        },
        {
          id: 'vm-540p',
          label: '540p Mobile (MP4)',
          quality: '540p',
          type: 'video',
          extension: 'mp4',
          fileSize: '18.2 MB',
          hasAudio: true,
        },
      ];

      return {
        id,
        originalUrl: url,
        platform: 'vimeo',
        platformName: 'Vimeo',
        title: 'The Solitude of Nordic Archipelagos - Cinematic 4K Film',
        author: 'Nordic Visual Arts Studio',
        authorUrl: 'https://vimeo.com/nordicvisualarts',
        duration: '03:18',
        views: '94K plays',
        publishDate: 'Staff Pick',
        thumbnailUrl: SAMPLE_THUMBNAILS.youtube,
        formats,
        fetchedAt: now,
      };
    }

    case 'twitter': {
      const formats: VideoFormatOption[] = [
        {
          id: 'tw-hd',
          label: 'HD Video (720p MP4)',
          quality: '720p',
          type: 'video',
          extension: 'mp4',
          fileSize: '14.2 MB',
          hasAudio: true,
        },
        {
          id: 'tw-sd',
          label: 'SD Video (480p MP4)',
          quality: '480p',
          type: 'video',
          extension: 'mp4',
          fileSize: '7.8 MB',
          hasAudio: true,
        },
      ];

      return {
        id,
        originalUrl: url,
        platform: 'twitter',
        platformName: 'X (Twitter)',
        title: 'Remarkable auroral display filmed over the Arctic Circle tonight',
        author: '@aurorawatch',
        authorUrl: 'https://x.com/aurorawatch',
        duration: '00:24',
        views: '1.1M views',
        publishDate: '5h ago',
        thumbnailUrl: SAMPLE_THUMBNAILS.youtube,
        formats,
        fetchedAt: now,
      };
    }

    default:
      throw new Error('Unsupported platform format.');
  }
}
