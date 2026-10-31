export type PlatformType =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'vimeo'
  | 'twitter'
  | 'unknown';

export interface VideoFormatOption {
  id: string;
  label: string; // e.g. "1080p Full HD", "720p HD", "320kbps MP3"
  quality: string; // "1080p", "720p", "320kbps"
  type: 'video' | 'audio';
  extension: 'mp4' | 'mp3' | 'webm';
  fileSize: string; // e.g. "45.2 MB"
  downloadUrl?: string;
  hasAudio?: boolean;
  noWatermark?: boolean;
}

export interface TrimRange {
  enabled: boolean;
  startSeconds: number;
  endSeconds: number;
  startFormatted: string;
  endFormatted: string;
  durationSeconds: number;
  durationFormatted: string;
}

export interface VideoMetadata {
  id: string;
  originalUrl: string;
  platform: PlatformType;
  platformName: string;
  title: string;
  author: string;
  authorUrl?: string;
  duration: string; // e.g. "03:45"
  views?: string; // e.g. "1.4M"
  publishDate?: string;
  thumbnailUrl: string;
  formats: VideoFormatOption[];
  fetchedAt: number;
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  platform: PlatformType;
  formatLabel: string;
  type: 'video' | 'audio';
  extension: string;
  thumbnailUrl: string;
  downloadedAt: number;
  originalUrl: string;
}

export interface BackendApiConfig {
  mode: 'mock' | 'custom';
  customEndpoint: string;
  rapidApiKey?: string;
}
