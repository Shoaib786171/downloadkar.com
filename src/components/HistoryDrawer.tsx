import { X, Trash2, Download, Video, Music, Clock } from 'lucide-react';
import { DownloadHistoryItem } from '../types/downloader';
import { useLanguage } from '../context/LanguageContext';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DownloadHistoryItem[];
  onClearHistory: () => void;
  onReDownload: (item: DownloadHistoryItem) => void;
}

export default function HistoryDrawer({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onReDownload,
}: HistoryDrawerProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-colors">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.historyTitle}</h2>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-200 dark:border-slate-700">
                {history.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {history.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Clock className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-400">{t.noHistory}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Videos and MP3 tracks you download will appear here for fast re-access.
                </p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {item.type === 'video' ? (
                        <Video className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      ) : (
                        <Music className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.title}</p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{item.platform}</span>
                        <span>·</span>
                        <span className="uppercase font-mono">{item.extension}</span>
                        <span>·</span>
                        <span className="text-slate-400 dark:text-slate-500">
                          {new Date(item.downloadedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onReDownload(item)}
                    className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-700 dark:text-slate-300 dark:hover:bg-rose-600 dark:hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Download again"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-500 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearHistory}</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
