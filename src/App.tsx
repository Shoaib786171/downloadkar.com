/**
 * downloadkar - Multi-Platform Video Downloader
 * 
 * Free all-in-one web video downloader and audio converter for YouTube,
 * Instagram, TikTok, Facebook, Vimeo, and X.
 */

import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import HeroSearch from './components/HeroSearch';
import PlatformBadges from './components/PlatformBadges';
import ResultCard from './components/ResultCard';
import DownloadModal from './components/DownloadModal';
import HowToUse from './components/HowToUse';
import FeaturesGrid from './components/FeaturesGrid';
import SeoContentSection from './components/SeoContentSection';
import FaqSection from './components/FaqSection';
import ContactModal from './components/ContactModal';
import LegalModals, { LegalType } from './components/LegalModals';
import Footer from './components/Footer';

import { BackendApiConfig, DownloadHistoryItem, TrimRange, VideoFormatOption, VideoMetadata } from './types/downloader';
import { detectPlatform, fetchVideoData, uploadUserMediaFile } from './services/api';
import { sanitizeFilename, triggerBrowserDownload } from './services/downloader';
import { safeJsonParse, requestRateLimiter, validateAndSanitizeUrl, sanitizeText } from './services/security';
import { useLanguage } from './context/LanguageContext';

const HISTORY_STORAGE_KEY = 'downloadkar_history_v1';
const API_CONFIG_STORAGE_KEY = 'downloadkar_api_config_v1';

export default function App() {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active download state (for modal)
  const [activeDownload, setActiveDownload] = useState<{
    format: VideoFormatOption;
    metadata: VideoMetadata;
    trimRange?: TrimRange;
  } | null>(null);

  // History state protected against Prototype Pollution
  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    return safeJsonParse<DownloadHistoryItem[]>(
      localStorage.getItem(HISTORY_STORAGE_KEY),
      []
    );
  });

  // Backend API configuration state protected against Prototype Pollution
  const [apiConfig, setApiConfig] = useState<BackendApiConfig>(() => {
    return safeJsonParse<BackendApiConfig>(
      localStorage.getItem(API_CONFIG_STORAGE_KEY),
      { mode: 'mock', customEndpoint: '', rapidApiKey: '' }
    );
  });

  // Modal controls
  const [contactOpen, setContactOpen] = useState(false);
  const [legalType, setLegalType] = useState<LegalType>(null);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore localStorage write failure
    }
  }, [history]);

  // Save API config to localStorage
  const handleSaveApiConfig = (newConfig: BackendApiConfig) => {
    setApiConfig(newConfig);
    try {
      localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch {
      // Ignore
    }
  };

  // Real-time platform detection via regex
  const detectedPlatform = useMemo(() => {
    return detectPlatform(url);
  }, [url]);

  // Handle Fetch Video request
  // Handle Fetch Video request with Rate Limiting and URL Security Shield
  const handleFetch = async (targetUrl?: string) => {
    const inputUrl = targetUrl || url;
    if (!inputUrl.trim()) {
      setErrorMessage(t.enterValidUrl);
      return;
    }

    // 1. Anti-Flood / Anti-DDoS Sliding Window Rate Limiting Check
    const rateCheck = requestRateLimiter.check();
    if (!rateCheck.allowed) {
      setErrorMessage(
        `Security Alert: Anti-abuse flood protection active. Please wait ${rateCheck.retryAfterSeconds}s before requesting again.`
      );
      return;
    }

    // 2. Strict Zero-Trust URL Scheme & Sanitization Validation
    const validation = validateAndSanitizeUrl(inputUrl);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Security Alert: Insecure or unsupported URL detected.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchVideoData(validation.sanitizedUrl, apiConfig);
      setVideoData(data);
      // Smooth scroll to result
      setTimeout(() => {
        const resultEl = document.getElementById('result-section');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process this video URL. Please check the link and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sample quick select
  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setErrorMessage(null);
    handleFetch(sampleUrl);
  };

  // Handle User Media File Upload (video / audio file for genuine FFmpeg processing)
  const handleUploadFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await uploadUserMediaFile(file);
      setVideoData(data);
      setUrl('');
      setTimeout(() => {
        const resultEl = document.getElementById('result-section');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload and probe media file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download Trigger Handler
  const handleDownloadFormat = (
    format: VideoFormatOption,
    metadata: VideoMetadata,
    trimRange?: TrimRange
  ) => {
    setActiveDownload({ format, metadata, trimRange });
  };

  // Record History item with Safe Sanitized Strings (Anti-Stored-XSS)
  const handleRecordHistory = (format: VideoFormatOption, metadata: VideoMetadata) => {
    const safeTitle = sanitizeText(metadata.title, 120) || 'Video Stream';
    const newItem: DownloadHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: safeTitle,
      platform: metadata.platform,
      formatLabel: sanitizeText(format.label, 40),
      type: format.type,
      extension: format.extension,
      thumbnailUrl: metadata.thumbnailUrl,
      downloadedAt: Date.now(),
      originalUrl: metadata.originalUrl,
    };
    setHistory((prev) => [newItem, ...prev.filter((h) => h.originalUrl !== metadata.originalUrl)].slice(0, 30));
  };

  // Clear history
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Re-download from history via genuine download engine
  const handleReDownload = (item: DownloadHistoryItem) => {
    const mockFormat: VideoFormatOption = {
      id: item.id,
      label: item.formatLabel,
      quality: 'Original',
      type: item.type,
      extension: item.extension as any,
      fileSize: 'Saved File',
    };
    const mockMetadata: VideoMetadata = {
      id: item.id,
      originalUrl: item.originalUrl,
      platform: item.platform,
      platformName: item.platform.toUpperCase(),
      title: item.title,
      author: 'downloadkar archive',
      duration: '00:00',
      thumbnailUrl: item.thumbnailUrl,
      formats: [mockFormat],
      fetchedAt: item.downloadedAt,
    };
    setActiveDownload({ format: mockFormat, metadata: mockMetadata });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-rose-500/20 selection:text-rose-600 dark:selection:text-rose-300 transition-colors">
      {/* Top Header */}
      <Header
        onOpenContact={() => setContactOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section with URL Input and Local File Upload */}
        <HeroSearch
          url={url}
          setUrl={setUrl}
          detectedPlatform={detectedPlatform}
          isLoading={isLoading}
          onFetch={() => handleFetch()}
          onUploadFile={handleUploadFile}
          isUploading={isLoading}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
        />

        {/* Supported Platforms clickable badges */}
        <PlatformBadges
          detectedPlatform={detectedPlatform}
          onSelectSample={handleSelectSample}
        />

        {/* Dynamic Result Card (shown when video is fetched) */}
        {videoData && (
          <div id="result-section" className="scroll-mt-20">
            <ResultCard
              metadata={videoData}
              onDownloadFormat={handleDownloadFormat}
              onReset={() => {
                setVideoData(null);
                setUrl('');
              }}
            />
          </div>
        )}

        {/* How to Use Section */}
        <HowToUse />

        {/* Feature Specifications & Platform Matrix */}
        <FeaturesGrid />

        {/* SEO In-Depth Guide & Authoritative Resources */}
        <SeoContentSection />

        {/* FAQ Section */}
        <FaqSection />
      </main>

      {/* Footer */}
      <Footer
        onOpenLegal={(type) => setLegalType(type)}
        onOpenContact={() => setContactOpen(true)}
      />

      {/* Active Download Progress Modal */}
      {activeDownload && (
        <DownloadModal
          isOpen={true}
          format={activeDownload.format}
          metadata={activeDownload.metadata}
          trimRange={activeDownload.trimRange}
          onClose={() => setActiveDownload(null)}
          onRecordHistory={handleRecordHistory}
        />
      )}


      {/* Contact Form Modal */}
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
      />


      {/* Legal Modals (Privacy / Terms / Disclaimer) */}
      <LegalModals
        type={legalType}
        onClose={() => setLegalType(null)}
      />
    </div>
  );
}
