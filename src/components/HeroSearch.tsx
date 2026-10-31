import React, { useRef, useState } from 'react';
import { Search, Clipboard, X, Loader2, Sparkles, AlertCircle, CheckCircle2, Upload, Film } from 'lucide-react';
import { PlatformType } from '../types/downloader';
import { PLATFORM_DETECTORS } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface HeroSearchProps {
  url: string;
  setUrl: (url: string) => void;
  detectedPlatform: PlatformType;
  isLoading: boolean;
  onFetch: () => void;
  onUploadFile?: (file: File) => void;
  isUploading?: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export default function HeroSearch({
  url,
  setUrl,
  detectedPlatform,
  isLoading,
  onFetch,
  onUploadFile,
  isUploading,
  errorMessage,
  onClearError,
}: HeroSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const { t } = useLanguage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text);
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
          onClearError();
          if (inputRef.current) inputRef.current.focus();
        }
      }
    } catch {
      // Clipboard permission denied or unsupported
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      onFetch();
    }
  };

  const detectedConfig =
    detectedPlatform !== 'unknown'
      ? PLATFORM_DETECTORS[detectedPlatform as keyof typeof PLATFORM_DETECTORS]
      : null;

  return (
    <section id="hero" className="relative pt-12 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto text-center">
        {/* Editorial Subtitle */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 mb-6 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
          <span>{t.heroBadge}</span>
        </div>

        {/* Catchy Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-balance transition-colors">
          {t.heroTitlePrefix}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500">
            {t.heroTitleHighlight}
          </span>
        </h1>

        {/* Value Proposition */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 text-balance transition-colors">
          {t.heroSubtitle}
        </p>

        {/* Prominent URL Search Bar Container */}
        <div className="max-w-3xl mx-auto">
          <div className="relative p-1.5 sm:p-2 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-xl dark:shadow-2xl focus-within:border-rose-500/80 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Input wrapper */}
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMessage) onClearError();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t.inputPlaceholder}
                  className="w-full bg-transparent px-3 py-3 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
                  disabled={isLoading}
                  autoComplete="off"
                  spellCheck="false"
                  maxLength={2048}
                />

                {/* Clear and Paste actions */}
                <div className="flex items-center gap-1 mr-2 shrink-0">
                  {url ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUrl('');
                        onClearError();
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t.clearBtn}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePaste}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-md transition-colors cursor-pointer"
                      title="Paste from clipboard"
                    >
                      {pasteSuccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-300">{t.pastedBtn}</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>{t.pasteBtn}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Primary Download / Fetch Button */}
              <button
                type="button"
                onClick={onFetch}
                disabled={isLoading || !url.trim()}
                className="px-6 py-3.5 sm:py-3 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-rose-950/20 dark:shadow-rose-950/50 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.fetchingBtn}</span>
                  </>
                ) : (
                  <>
                    <span>{t.fetchBtn}</span>
                  </>
                )}
              </button>
            </div>

            {/* Platform detection badge when a valid link is typed */}
            {detectedConfig && (
              <div className="mt-2 pt-2 px-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: detectedConfig.brandColor }} />
                  <span>{t.detected}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{detectedConfig.name}</span>
                </div>
                <span className="text-slate-500 hidden sm:inline">{t.streamReady}</span>
              </div>
            )}
          </div>

          {/* Local Media File Upload Option */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Want to trim or convert your own video/audio?</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*,audio/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-rose-500 text-slate-800 dark:text-slate-200 font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                  <span>Probing File...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-rose-500" />
                  <span>Upload Media to Convert / Trim</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message notification banner */}
          {errorMessage && (
            <div className="mt-4 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-sm flex items-start gap-2.5 text-left animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Unable to process link:</span> {errorMessage}
              </div>
              <button
                onClick={onClearError}
                className="text-rose-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
