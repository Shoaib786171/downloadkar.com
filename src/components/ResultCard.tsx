import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Download,
  Music,
  Video,
  CheckCircle2,
  Clock,
  Eye,
  Copy,
  Sparkles,
  Play,
  Square,
  X,
  Scissors,
  RotateCcw,
  Sliders,
  Film,
  Info,
  Check,
} from 'lucide-react';
import { TrimRange, VideoFormatOption, VideoMetadata } from '../types/downloader';
import { useLanguage } from '../context/LanguageContext';

interface ResultCardProps {
  metadata: VideoMetadata;
  onDownloadFormat: (format: VideoFormatOption, metadata: VideoMetadata, trimRange?: TrimRange) => void;
  onReset: () => void;
}

/**
 * Parses duration strings like "03:45", "1:15:20", or seconds into total seconds
 */
function parseDurationToSeconds(duration: string): number {
  if (!duration) return 180;
  const parts = duration.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return 180;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 180;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS string
 */
function formatSecondsToTimestamp(totalSecs: number, forceHours = false): string {
  const secs = Math.max(0, Math.floor(totalSecs));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (hours > 0 || forceHours) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Human readable duration (e.g. "1m 30s", "45s")
 */
function formatHumanDuration(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remSec = s % 60;
  if (h > 0) {
    return `${h}h ${m}m ${remSec}s`;
  }
  if (m > 0) {
    return `${m}m ${remSec}s`;
  }
  return `${remSec}s`;
}

/**
 * Parses user typed timestamp (e.g. "01:30" or "90") into seconds
 */
function parseTimestampToSeconds(input: string, maxLimit: number): number | null {
  const clean = input.trim();
  if (!clean) return null;
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;

  let secs = 0;
  if (parts.length === 3) {
    secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    secs = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    secs = parts[0];
  } else {
    return null;
  }
  return Math.min(Math.max(0, secs), maxLimit);
}

export default function ResultCard({
  metadata,
  onDownloadFormat,
  onReset,
}: ResultCardProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Video Ref for HTML5 player frame syncing and preview
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Parse total duration in seconds (fallback to 180 seconds if unavailable)
  const totalSeconds = useMemo(() => {
    return Math.max(10, parseDurationToSeconds(metadata.duration));
  }, [metadata.duration]);

  // Video Trimming Tool States
  const [isTrimActive, setIsTrimActive] = useState(false);
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState(() => Math.min(totalSeconds, 60));
  const [startInputText, setStartInputText] = useState('00:00');
  const [endInputText, setEndInputText] = useState(() => formatSecondsToTimestamp(Math.min(totalSeconds, 60)));
  const [activePreset, setActivePreset] = useState<'custom' | 'first30' | 'first60' | 'middle50' | 'full'>('full');

  // Reset or initialize trim state on new video load
  useEffect(() => {
    const initialEnd = totalSeconds;
    setStartSeconds(0);
    setEndSeconds(initialEnd);
    setStartInputText('00:00');
    setEndInputText(formatSecondsToTimestamp(initialEnd));
    setIsTrimActive(false);
    setActivePreset('full');
  }, [metadata.id, totalSeconds]);

  const isYouTube = metadata.platform === 'youtube';

  // Extract YouTube ID if applicable
  const getYouTubeEmbedId = (url: string): string | null => {
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Extract Vimeo ID if applicable
  const getVimeoEmbedId = (url: string): string | null => {
    const match = url.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|))(\d+)/);
    return match ? match[3] || match[1] : null;
  };

  const ytVideoId = isYouTube ? getYouTubeEmbedId(metadata.originalUrl) || 'dQw4w9WgXcQ' : null;
  const vimeoVideoId = metadata.platform === 'vimeo' ? getVimeoEmbedId(metadata.originalUrl) : null;

  // Extract primary MP4 video format & MP3 audio format
  const primaryVideoFormat =
    metadata.formats.find(
      (f) => f.type === 'video' && (f.quality === '1080p' || f.quality === '720p' || f.quality === 'HD')
    ) || metadata.formats.find((f) => f.type === 'video') || metadata.formats[0];

  const primaryAudioFormat =
    metadata.formats.find((f) => f.type === 'audio') || {
      id: 'default-audio-mp3',
      label: '320 kbps (High Quality MP3)',
      quality: '320kbps',
      type: 'audio' as const,
      extension: 'mp3' as const,
      fileSize: '7.8 MB',
    };

  const videoFormats = metadata.formats.filter((f) => f.type === 'video');
  const audioFormats = metadata.formats.filter((f) => f.type === 'audio');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(metadata.originalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Trimming Helpers & Steppers
  const handleAdjustStart = (delta: number) => {
    setStartSeconds((prev) => {
      const next = Math.max(0, Math.min(prev + delta, endSeconds - 1));
      setStartInputText(formatSecondsToTimestamp(next));
      return next;
    });
    setActivePreset('custom');
  };

  const handleAdjustEnd = (delta: number) => {
    setEndSeconds((prev) => {
      const next = Math.min(totalSeconds, Math.max(prev + delta, startSeconds + 1));
      setEndInputText(formatSecondsToTimestamp(next));
      return next;
    });
    setActivePreset('custom');
  };

  const handleStartInputChange = (val: string) => {
    setStartInputText(val);
    const parsed = parseTimestampToSeconds(val, endSeconds - 1);
    if (parsed !== null && parsed < endSeconds) {
      setStartSeconds(parsed);
      setActivePreset('custom');
    }
  };

  const handleEndInputChange = (val: string) => {
    setEndInputText(val);
    const parsed = parseTimestampToSeconds(val, totalSeconds);
    if (parsed !== null && parsed > startSeconds) {
      setEndSeconds(parsed);
      setActivePreset('custom');
    }
  };

  const handleStartInputBlur = () => {
    setStartInputText(formatSecondsToTimestamp(startSeconds));
  };

  const handleEndInputBlur = () => {
    setEndInputText(formatSecondsToTimestamp(endSeconds));
  };

  // Preset Selection
  const applyPreset = (preset: 'first30' | 'first60' | 'middle50' | 'full') => {
    setActivePreset(preset);
    setIsTrimActive(true);

    if (preset === 'first30') {
      const end = Math.min(30, totalSeconds);
      setStartSeconds(0);
      setEndSeconds(end);
      setStartInputText('00:00');
      setEndInputText(formatSecondsToTimestamp(end));
    } else if (preset === 'first60') {
      const end = Math.min(60, totalSeconds);
      setStartSeconds(0);
      setEndSeconds(end);
      setStartInputText('00:00');
      setEndInputText(formatSecondsToTimestamp(end));
    } else if (preset === 'middle50') {
      const s = Math.floor(totalSeconds * 0.25);
      const e = Math.floor(totalSeconds * 0.75);
      setStartSeconds(s);
      setEndSeconds(e);
      setStartInputText(formatSecondsToTimestamp(s));
      setEndInputText(formatSecondsToTimestamp(e));
    } else if (preset === 'full') {
      setStartSeconds(0);
      setEndSeconds(totalSeconds);
      setStartInputText('00:00');
      setEndInputText(formatSecondsToTimestamp(totalSeconds));
      setIsTrimActive(false);
    }
  };

  // Reset Trim to full length
  const handleResetTrim = () => {
    applyPreset('full');
    setIsTrimActive(false);
  };

  // Calculate Trim Range Object
  const getTrimRange = (): TrimRange | undefined => {
    if (!isTrimActive) return undefined;
    return {
      enabled: true,
      startSeconds,
      endSeconds,
      startFormatted: formatSecondsToTimestamp(startSeconds),
      endFormatted: formatSecondsToTimestamp(endSeconds),
      durationSeconds: endSeconds - startSeconds,
      durationFormatted: formatHumanDuration(endSeconds - startSeconds),
    };
  };

  // Download Action Dispatcher
  const handleTriggerDownload = (format: VideoFormatOption) => {
    const trim = getTrimRange();
    onDownloadFormat(format, metadata, trim);
  };

  // Preview Trimmed Clip in Video Player
  const handlePreviewClip = () => {
    setIsPreviewOpen(true);
    if (videoRef.current) {
      videoRef.current.currentTime = startSeconds;
      videoRef.current.play().catch(() => {});
    }
  };

  // HTML5 Video timeupdate event listener to loop/pause when reaching endSeconds
  const handleVideoTimeUpdate = () => {
    if (isTrimActive && videoRef.current) {
      if (videoRef.current.currentTime >= endSeconds) {
        videoRef.current.pause();
        videoRef.current.currentTime = startSeconds;
      }
    }
  };

  // Calculate proportional estimated file size
  const getEstimatedTrimmedSize = (baseSizeStr: string): string => {
    const match = baseSizeStr.match(/([0-9.]+)/);
    if (!match) return baseSizeStr;
    const baseMb = parseFloat(match[1]);
    const ratio = (endSeconds - startSeconds) / totalSeconds;
    const estMb = (baseMb * ratio).toFixed(1);
    return `${estMb} MB`;
  };

  // Build preview embed URL with timestamps
  const ytEmbedUrl = isYouTube && ytVideoId
    ? isTrimActive
      ? `https://www.youtube-nocookie.com/embed/${ytVideoId}?start=${startSeconds}&end=${endSeconds}&autoplay=1&rel=0&modestbranding=1`
      : `https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&rel=0&modestbranding=1`
    : null;

  const vimeoEmbedUrl = vimeoVideoId
    ? isTrimActive
      ? `https://player.vimeo.com/video/${vimeoVideoId}#t=${startSeconds}s`
      : `https://player.vimeo.com/video/${vimeoVideoId}?autoplay=1`
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-xl dark:shadow-2xl transition-all">
        {/* Header bar of results card */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t.streamReady} · {metadata.platformName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-300">{t.linkCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyLink}</span>
                </>
              )}
            </button>
            <button
              onClick={onReset}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              {t.closeResult}
            </button>
          </div>
        </div>

        {/* Media Details Hero Row */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Thumbnail & Video Preview Player Column */}
          <div className="md:col-span-5 relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 aspect-video group">
            {isPreviewOpen ? (
              <div className="w-full h-full relative bg-black flex items-center justify-center">
                {/* Live Preview Status Badge */}
                <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-black/85 backdrop-blur-md rounded-lg text-[11px] font-semibold text-white shadow-lg border border-white/10 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {isTrimActive
                      ? `Trim Preview: ${formatSecondsToTimestamp(startSeconds)} - ${formatSecondsToTimestamp(endSeconds)}`
                      : t.previewBadge}
                  </span>
                </div>

                {/* Close Preview Button */}
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="absolute top-2.5 right-2.5 z-20 p-1.5 bg-black/80 hover:bg-rose-600 text-white rounded-lg transition-colors cursor-pointer shadow-lg border border-white/10"
                  title={t.stopPreview}
                  aria-label={t.stopPreview}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Video Player Render Choice */}
                {isYouTube && ytEmbedUrl ? (
                  <iframe
                    key={`yt-${startSeconds}-${endSeconds}`}
                    src={ytEmbedUrl}
                    title={metadata.title}
                    className="w-full h-full rounded-xl border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : vimeoEmbedUrl ? (
                  <iframe
                    key={`vm-${startSeconds}-${endSeconds}`}
                    src={vimeoEmbedUrl}
                    title={metadata.title}
                    className="w-full h-full rounded-xl border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                    poster={metadata.thumbnailUrl}
                    controls
                    autoPlay
                    playsInline
                    onTimeUpdate={handleVideoTimeUpdate}
                    className="w-full h-full object-contain rounded-xl"
                  >
                    Your browser does not support the video preview tag.
                  </video>
                )}
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={metadata.thumbnailUrl}
                  alt={metadata.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Fallback container with gradient */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-slate-200 via-slate-100 to-rose-100 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950 flex items-center justify-center p-4">
                  <Video className="w-12 h-12 text-slate-400 dark:text-slate-700" />
                </div>

                {/* Interactive Click-to-Play Preview Overlay */}
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35 hover:bg-black/55 transition-all group/play cursor-pointer"
                  title={t.previewVideo}
                  aria-label={t.previewVideo}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-rose-600 group-hover/play:bg-rose-500 group-hover/play:scale-110 text-white flex items-center justify-center shadow-xl shadow-rose-950/80 transition-all border border-white/20">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                  </div>
                  <span className="mt-2.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-semibold text-white group-hover/play:text-rose-200 transition-colors shadow-md border border-white/10">
                    {t.previewVideo}
                  </span>
                </button>

                {/* Duration pill overlay */}
                {metadata.duration && (
                  <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded bg-black/85 text-[11px] font-mono font-medium text-white flex items-center gap-1 shadow-md pointer-events-none">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{metadata.duration}</span>
                  </div>
                )}

                {/* Trim badge overlay on thumbnail if active */}
                {isTrimActive && (
                  <div className="absolute top-2.5 left-2.5 z-10 px-2 py-1 rounded-lg bg-rose-600/90 text-[10px] font-semibold text-white flex items-center gap-1.5 shadow-lg border border-white/20">
                    <Scissors className="w-3 h-3" />
                    <span>Clip: {formatSecondsToTimestamp(startSeconds)} - {formatSecondsToTimestamp(endSeconds)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Metadata Information */}
          <div className="md:col-span-7 flex flex-col justify-center space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {metadata.platformName} Media
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                {metadata.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">{metadata.author}</span>
              {metadata.views && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-500" />
                    <span>{metadata.views}</span>
                  </span>
                </>
              )}
              {metadata.publishDate && (
                <>
                  <span>·</span>
                  <span>{metadata.publishDate}</span>
                </>
              )}
            </div>

            {/* Action buttons: Downloads & Preview toggle */}
            <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2.5">
              {/* Preview Toggle Button */}
              <button
                type="button"
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className={`px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  isPreviewOpen
                    ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 shadow-xs'
                }`}
                title={isPreviewOpen ? t.stopPreview : t.previewVideo}
              >
                {isPreviewOpen ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{t.stopPreview}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t.previewVideo}</span>
                  </>
                )}
              </button>

              {/* Primary Video Download */}
              <button
                onClick={() => primaryVideoFormat && handleTriggerDownload(primaryVideoFormat)}
                className="flex-1 min-w-[140px] px-4 py-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isTrimActive ? (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Download Clip ({formatSecondsToTimestamp(startSeconds)} - {formatSecondsToTimestamp(endSeconds)})</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{t.downloadVideoMp4}</span>
                  </>
                )}
              </button>

              {/* Audio Download */}
              <button
                onClick={() => primaryAudioFormat && handleTriggerDownload(primaryAudioFormat)}
                className="flex-1 min-w-[140px] px-4 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Music className="w-4 h-4" />
                <span>{isTrimActive ? 'Download Trimmed MP3' : t.downloadAudioMp3}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VIDEO TRIMMING TOOL COMPONENT */}
        {/* ---------------------------------------------------- */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/70 p-5 sm:p-6 transition-colors">
          {/* Section Header with Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-xs ${
                isTrimActive
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Video Trimming Tool
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isTrimActive
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {isTrimActive ? 'Clip Mode Active' : 'Full Video Mode'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Select custom start and end timestamps to download a specific clip
                </p>
              </div>
            </div>

            {/* Trimmer Mode Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isTrimActive) {
                    handleResetTrim();
                  } else {
                    setIsTrimActive(true);
                    if (activePreset === 'full') {
                      applyPreset('first60');
                    }
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs border ${
                  isTrimActive
                    ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-500'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{isTrimActive ? 'Trimming Enabled' : 'Enable Trimmer'}</span>
              </button>
            </div>
          </div>

          {/* Trimmer Controls Body */}
          <div className="space-y-5 bg-white dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-rose-500" />
                <span>Quick Clip Presets:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('first30')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isTrimActive && activePreset === 'first30'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  First 30s (Shorts)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('first60')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isTrimActive && activePreset === 'first60'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  First 60s (1 min)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('middle50')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isTrimActive && activePreset === 'middle50'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Middle 50%
                </button>
                <button
                  type="button"
                  onClick={handleResetTrim}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Full Video</span>
                </button>
              </div>
            </div>

            {/* Interactive Timeline Track Visualization */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-rose-500" />
                  <span>Interactive Timeline Range</span>
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                  00:00 / {formatSecondsToTimestamp(totalSeconds)}
                </span>
              </div>

              {/* Timeline Bar Track */}
              <div className="relative h-9 bg-slate-200/80 dark:bg-slate-800/90 rounded-xl overflow-hidden border border-slate-300/80 dark:border-slate-700 flex items-center select-none">
                {/* Hash marks along timeline for aesthetic video editor feel */}
                <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-20">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="h-3 w-0.5 bg-slate-800 dark:bg-slate-200 rounded" />
                  ))}
                </div>

                {/* Highlighted active clip selection area */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-75 opacity-90 shadow-sm flex items-center justify-between px-2"
                  style={{
                    left: `${(startSeconds / totalSeconds) * 100}%`,
                    width: `${Math.max(1, ((endSeconds - startSeconds) / totalSeconds) * 100)}%`,
                  }}
                >
                  <span className="text-[10px] font-bold font-mono text-white drop-shadow truncate">
                    {formatSecondsToTimestamp(startSeconds)}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-white drop-shadow truncate">
                    {formatSecondsToTimestamp(endSeconds)}
                  </span>
                </div>
              </div>

              {/* Range sliders row for dual scrubber control */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Start Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Scrub Start Time:</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {formatSecondsToTimestamp(startSeconds)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={endSeconds - 1}
                    value={startSeconds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setStartSeconds(val);
                      setStartInputText(formatSecondsToTimestamp(val));
                      setIsTrimActive(true);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-rose-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* End Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Scrub End Time:</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {formatSecondsToTimestamp(endSeconds)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={startSeconds + 1}
                    max={totalSeconds}
                    value={endSeconds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setEndSeconds(val);
                      setEndInputText(formatSecondsToTimestamp(val));
                      setIsTrimActive(true);
                      setActivePreset('custom');
                    }}
                    className="w-full accent-amber-500 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Precision Timestamp Inputs & Steppers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Start Timestamp Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Start Timestamp</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">MM:SS / HH:MM:SS</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startInputText}
                    onChange={(e) => {
                      setIsTrimActive(true);
                      handleStartInputChange(e.target.value);
                    }}
                    onBlur={handleStartInputBlur}
                    placeholder="00:00"
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-inner"
                  />
                </div>

                {/* Micro Adjust Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustStart(-5);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustStart(-1);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustStart(1);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    +1s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustStart(5);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    +5s
                  </button>
                </div>
              </div>

              {/* End Timestamp Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>End Timestamp</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">MM:SS / HH:MM:SS</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={endInputText}
                    onChange={(e) => {
                      setIsTrimActive(true);
                      handleEndInputChange(e.target.value);
                    }}
                    onBlur={handleEndInputBlur}
                    placeholder="01:00"
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                </div>

                {/* Micro Adjust Buttons */}
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustEnd(-5);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    -5s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustEnd(-1);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustEnd(1);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    +1s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrimActive(true);
                      handleAdjustEnd(5);
                    }}
                    className="py-1 text-[11px] font-semibold rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    +5s
                  </button>
                </div>
              </div>
            </div>

            {/* Live Clip Metrics & Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  <Scissors className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clip Duration:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                    {formatHumanDuration(endSeconds - startSeconds)}
                  </span>
                </div>

                <span className="text-slate-400 dark:text-slate-600">·</span>

                <div className="text-slate-600 dark:text-slate-400">
                  <span>Est. Size: </span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {getEstimatedTrimmedSize(primaryVideoFormat?.fileSize || '35 MB')}
                  </span>
                </div>

                <span className="text-slate-400 dark:text-slate-600">·</span>

                <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  <span>{formatSecondsToTimestamp(startSeconds)} → {formatSecondsToTimestamp(endSeconds)}</span>
                </div>
              </div>

              {/* Clip Actions: Preview Clip & Download */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewClip}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Preview the trimmed segment in player"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-rose-500" />
                  <span>Preview Clip</span>
                </button>

                <button
                  type="button"
                  onClick={() => primaryVideoFormat && handleTriggerDownload(primaryVideoFormat)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Clip</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Quality Selection Accordion / Grid */}
        <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 p-5 sm:p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t.allResolutions}
              </span>
              {isTrimActive && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                  Trimmed: {formatSecondsToTimestamp(startSeconds)} - {formatSecondsToTimestamp(endSeconds)}
                </span>
              )}
            </div>

            {/* Quality switcher tabs */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs shadow-xs">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {t.videoStreams} ({videoFormats.length})
              </button>
              {audioFormats.length > 0 && (
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === 'audio'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {t.audioTracks} ({audioFormats.length})
                </button>
              )}
            </div>
          </div>

          {/* Formats list table/grid */}
          <div className="space-y-2">
            {(activeTab === 'video' ? videoFormats : audioFormats).map((format) => (
              <div
                key={format.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                    {format.type === 'video' ? (
                      <Video className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    ) : (
                      <Music className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{format.label}</span>
                      {format.noWatermark && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 rounded">
                          Watermark Removed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span className="uppercase font-mono font-medium">{format.extension}</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        {isTrimActive
                          ? `~${getEstimatedTrimmedSize(format.fileSize)} (Trimmed)`
                          : format.fileSize}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTriggerDownload(format)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700"
                >
                  {isTrimActive ? (
                    <>
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Download Clip</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* SHARE THIS TOOL SECTION */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    {t.shareThisTool}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    · {t.inviteFriends}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {t.shareSubtitle}
                </p>
              </div>

              {/* Referral Copy Action */}
              <button
                onClick={() => {
                  const shareUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}${window.location.pathname}?ref=share`
                    : 'https://downloadkar.local/?ref=share';
                  navigator.clipboard.writeText(shareUrl);
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                  copiedShare
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
                }`}
                title="Copy referral link to clipboard"
              >
                {copiedShare ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.referralCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                    <span>{t.copyReferral}</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Download watermark-free videos and 320kbps MP3 audio from YouTube, TikTok, Instagram & more with downloadkar: ${
                    typeof window !== 'undefined' ? window.location.origin : 'https://downloadkar.local'
                  }?ref=wa`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all group shadow-xs"
                title="Share on WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.01-1.24-.74-.66-1.25-1.48-1.39-1.73-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.71 4.29 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.23-.19-.48-.31" />
                </svg>
                <span>WhatsApp</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  'Free all-in-one video downloader & MP3 converter (YouTube, TikTok, Instagram, Facebook):'
                )}&url=${encodeURIComponent(
                  `${typeof window !== 'undefined' ? window.location.origin : 'https://downloadkar.local'}?ref=x`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-xs font-semibold transition-all group shadow-xs"
                title="Share on X (Twitter)"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-slate-900 dark:text-white group-hover:scale-110 transition-transform">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Twitter / X</span>
              </a>

              {/* Reddit */}
              <a
                href={`https://www.reddit.com/submit?url=${encodeURIComponent(
                  `${typeof window !== 'undefined' ? window.location.origin : 'https://downloadkar.local'}?ref=rd`
                )}&title=${encodeURIComponent(
                  'downloadkar - Free All-in-One Video Downloader & MP3 Audio Converter'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800/60 hover:border-orange-300 dark:hover:border-orange-600 text-orange-700 dark:text-orange-300 text-xs font-semibold transition-all group shadow-xs"
                title="Share on Reddit"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.703zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-4.466 3.99a.327.327 0 0 0-.231.096.35.35 0 0 0 0 .485c.617.618 1.637.899 2.947.899 1.31 0 2.33-.281 2.947-.899a.35.35 0 0 0 0-.485.327.327 0 0 0-.462 0c-.492.492-1.353.72-2.485.72-1.132 0-1.993-.228-2.485-.72a.327.327 0 0 0-.231-.096z" />
                </svg>
                <span>Reddit</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
