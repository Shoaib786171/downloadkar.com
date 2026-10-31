import { useEffect, useState, useRef } from 'react';
import {
  Download,
  CheckCircle2,
  Loader2,
  X,
  FileVideo,
  Music,
  Shield,
  Cpu,
  Layers,
  Scissors,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { TrimRange, VideoFormatOption, VideoMetadata } from '../types/downloader';
import {
  startConversionJob,
  pollJobStatus,
  cancelConversionJob,
  sanitizeFilename,
  triggerBrowserDownload,
} from '../services/downloader';

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
  const [status, setStatus] = useState<'preparing' | 'processing' | 'completed' | 'failed' | 'cancelled'>('preparing');
  const [stepMessage, setStepMessage] = useState('Initializing media engine...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const filename = sanitizeFilename(metadata.title, format.extension, trimRange);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (activeJobId && status === 'processing') {
        cancelConversionJob(activeJobId);
      }
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setProgress(0);
      setStatus('preparing');
      setErrorMessage(null);
      setDownloadUrl(null);
      setActiveJobId(null);
      return;
    }

    let isMounted = true;

    async function runConversion() {
      try {
        setStatus('preparing');
        setStepMessage('Dispatching job to FFmpeg media engine...');
        setErrorMessage(null);

        // 1. Start real backend conversion job
        const initRes = await startConversionJob(format, metadata, trimRange);
        if (!isMounted) return;

        setActiveJobId(initRes.jobId);
        setStatus('processing');

        // 2. Poll real progress from /api/jobs/:id
        pollTimerRef.current = setInterval(async () => {
          try {
            const job = await pollJobStatus(initRes.jobId);
            if (!isMounted) return;

            setProgress(job.progress);
            if (job.step) setStepMessage(job.step);

            if (job.status === 'completed') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              setStatus('completed');
              setProgress(100);
              const realUrl = job.downloadUrl || `/api/jobs/${initRes.jobId}/download`;
              setDownloadUrl(realUrl);

              // Trigger authentic browser file download
              triggerBrowserDownload(realUrl, job.outputFilename || filename);
              onRecordHistory(format, metadata);
            } else if (job.status === 'failed') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              setStatus('failed');
              setErrorMessage(job.error || 'Media processing error encountered.');
            } else if (job.status === 'cancelled') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              setStatus('cancelled');
            }
          } catch (pollErr: any) {
            console.warn('Status poll warning:', pollErr);
          }
        }, 600);
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('failed');
        setErrorMessage(err.message || 'Failed to start media conversion.');
      }
    }

    runConversion();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, format, metadata, trimRange]);

  const handleCancel = async () => {
    if (activeJobId) {
      await cancelConversionJob(activeJobId);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden transition-colors">
        {/* Close Button */}
        <button
          onClick={handleCancel}
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
            ) : status === 'failed' ? (
              <AlertCircle className="w-9 h-9 text-rose-600 dark:text-rose-400 animate-in zoom-in-75 duration-300" />
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
                  : 'Genuine Media Ready!'
                : status === 'failed'
                ? 'Processing Error'
                : trimRange?.enabled
                ? 'Processing Trimmed Clip with FFmpeg'
                : 'Converting Media with FFmpeg'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 font-mono">
              {filename}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
              {trimRange && trimRange.enabled && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>
                    Clip: {trimRange.startFormatted} - {trimRange.endFormatted} ({trimRange.durationFormatted})
                  </span>
                </div>
              )}

              {trimRange?.pictureOverlay?.enabled && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    Picture Frame: {trimRange.pictureOverlay.frameStyle} ({trimRange.pictureOverlay.position})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Phase Indicators */}
          <div className="grid grid-cols-3 gap-2 py-1">
            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'preparing' || status === 'processing' || status === 'completed'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-[10px] leading-tight">1. Stream Probe</div>
            </div>

            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'processing' || status === 'completed'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-[10px] leading-tight">2. FFmpeg Engine</div>
            </div>

            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                status === 'completed'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex justify-center mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-[10px] leading-tight">3. Container Deliver</div>
            </div>
          </div>

          {/* Error Message if Failed */}
          {status === 'failed' && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-left text-xs text-rose-700 dark:text-rose-300">
              <span className="font-bold block mb-1">Processing Limitation Notice:</span>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Visual Progress Bar Component */}
          {status !== 'failed' && (
            <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[280px]">
                  {status !== 'completed' && <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500 shrink-0" />}
                  <span className="truncate">{stepMessage}</span>
                </span>
                <span className="text-base font-extrabold tabular-nums font-mono text-rose-600 dark:text-rose-400 shrink-0 ml-2">
                  {progress}%
                </span>
              </div>

              {/* Glowing Gradient Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 relative shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 transition-all duration-200 ease-out shadow-md relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </div>
              </div>

              {/* Progress status footer */}
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-medium">
                <span>Format: {format.label}</span>
                <span className="uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[10px]">
                  {format.extension}
                </span>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2">
            {status === 'completed' ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your genuinely processed media file has been generated. Check your <span className="font-semibold text-slate-900 dark:text-white">Downloads</span> folder.
                </p>
                <div className="flex gap-2">
                  {downloadUrl && (
                    <button
                      onClick={() => triggerBrowserDownload(downloadUrl, filename)}
                      className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Again</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-rose-950/40"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : status === 'failed' ? (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Real-time FFmpeg worker</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel Job
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
