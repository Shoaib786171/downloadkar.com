import { useEffect, useState, useMemo } from 'react';
import { Download, CheckCircle2, Loader2, X, FileVideo, Music, Shield, Cpu, Layers, Scissors } from 'lucide-react';
import { TrimRange, VideoFormatOption, VideoMetadata } from '../types/downloader';
import { generateSampleMediaBlob, sanitizeFilename, triggerBrowserDownload } from '../services/downloader';

interface DownloadModalProps {
  format: VideoFormatOption;
  metadata: VideoMetadata;
  trimRange?: TrimRange;
  isOpen: boolean;
  onClose: () => void;
  onRecordHistory: (format: VideoFormatOption, metadata: VideoMetadata) => void;
}

export default function DownloadModal({
  format,
  metadata,
  trimRange,
  isOpen,
  onClose,
  onRecordHistory,
}: DownloadModalProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'preparing' | 'downloading' | 'packaging' | 'completed'>('preparing');
  const [downloadSpeed, setDownloadSpeed] = useState('14.2 MB/s');
  const filename = sanitizeFilename(metadata.title, format.extension, trimRange);

  // Parse total size in MB for dynamic calculation
  const totalMb = useMemo(() => {
    const match = format.fileSize.match(/([0-9.]+)/);
    return match ? parseFloat(match[1]) : 15.0;
  }, [format.fileSize]);

  // Transferred MB
  const transferredMb = useMemo(() => {
    return ((totalMb * progress) / 100).toFixed(1);
  }, [totalMb, progress]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStatus('preparing');
      return;
    }

    // Step 1: Preparing stream handshake
    setStatus('preparing');
    const timer1 = setTimeout(() => {
      setStatus('downloading');
    }, 450);

    // Step 2: Smooth progressive counter simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random step increment
        const step = Math.floor(Math.random() * 12) + 8;
        const next = Math.min(prev + step, 100);

        if (next >= 75 && next < 100) {
          setStatus('packaging');
        }

        // Randomize speed fluctuation slightly for realism
        const speedVal = (12 + Math.random() * 5).toFixed(1);
        setDownloadSpeed(`${speedVal} MB/s`);

        return next;
      });
    }, 160);

    return () => {
      clearTimeout(timer1);
      clearInterval(interval);
    };
  }, [isOpen]);

  // When progress hits 100%, trigger the real browser download and record history
  useEffect(() => {
    if (progress === 100 && status !== 'completed') {
      setStatus('completed');
      const blob = generateSampleMediaBlob(format, metadata, trimRange);
      triggerBrowserDownload(blob, filename);
      onRecordHistory(format, metadata);
    }
  }, [progress, status, format, metadata, filename, trimRange, onRecordHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden transition-colors">
        {/* Close / Cancel Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
          aria-label="Close download modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-4">
          {/* Animated Hero Icon Container */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-600/10 border border-rose-200 dark:border-rose-500/25 flex items-center justify-center shadow-inner">
            {status === 'completed' ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-300" />
            ) : format.type === 'video' ? (
              <FileVideo className="w-8 h-8 text-rose-600 dark:text-rose-400 animate-bounce" />
            ) : (
              <Music className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-bounce" />
            )}
          </div>

          {/* Heading and Filename */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {status === 'completed'
                ? trimRange?.enabled
                  ? 'Trimmed Clip Ready!'
                  : 'Download Complete!'
                : trimRange?.enabled
                ? 'Processing Trimmed Clip'
                : 'Downloading Media File'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 font-mono">
              {filename}
            </p>

            {trimRange && trimRange.enabled && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                <Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>
                  Clip: {trimRange.startFormatted} - {trimRange.endFormatted} ({trimRange.durationFormatted})
                </span>
              </div>
            )}
          </div>

          {/* Stepper Phase Indicators */}
          <div className="grid grid-cols-3 gap-2 py-1">
            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'preparing' || status === 'downloading' || status === 'packaging' || status === 'completed'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-[10px] leading-tight">1. Handshake</div>
            </div>

            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'downloading' || status === 'packaging' || status === 'completed'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-[10px] leading-tight">2. Chunks</div>
            </div>

            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'packaging' || status === 'completed'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-[10px] leading-tight">3. Assemble</div>
            </div>
          </div>

          {/* Visual Progress Bar Component */}
          <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {status !== 'completed' && <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />}
                {status === 'preparing' && 'Connecting to CDN stream...'}
                {status === 'downloading' && (trimRange?.enabled ? 'Extracting clip frame ranges...' : 'Fetching audio/video streams...')}
                {status === 'packaging' && (trimRange?.enabled ? 'Trimming and packaging final clip...' : 'Packaging final container...')}
                {status === 'completed' && (trimRange?.enabled ? 'Trimmed clip delivered!' : 'Delivered to browser!')}
              </span>
              <span className="text-base font-extrabold tabular-nums font-mono text-rose-600 dark:text-rose-400">
                {progress}%
              </span>
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 relative shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 transition-all duration-200 ease-out shadow-md relative"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer animation highlight */}
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>

            {/* Live Progress Metadata Stats */}
            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium">
              <span className="tabular-nums">
                {transferredMb} MB / {format.fileSize}
              </span>
              {status !== 'completed' && (
                <span className="tabular-nums font-mono text-slate-600 dark:text-slate-300">
                  {downloadSpeed}
                </span>
              )}
              <span className="uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px]">
                {format.extension}
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2">
            {status === 'completed' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your browser has initiated the download. Check your <span className="font-semibold text-slate-900 dark:text-white">Downloads</span> folder.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = generateSampleMediaBlob(format, metadata, trimRange);
                      triggerBrowserDownload(blob, filename);
                    }}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Again</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-rose-950/40"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Secure SSL 256-bit stream</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
