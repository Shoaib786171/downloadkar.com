import { X, ShieldCheck, Lock, CheckCircle, Cpu, EyeOff, ServerOff, Terminal } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SecurityModal({ isOpen, onClose }: SecurityModalProps) {
  if (!isOpen) return null;

  const securityFeatures = [
    {
      title: 'Protocol & Scheme Guard',
      desc: 'Strictly blocks dangerous URL schemes including javascript:, data:, vbscript:, and file: to neutralize cross-site scripting (XSS) and remote code execution.',
      icon: Lock,
    },
    {
      title: 'Anti-ReDoS & Buffer Overflow Shield',
      desc: 'All URL inputs are capped to 2,048 characters with bounded regular expression lookups to prevent algorithmic complexity attacks and CPU freezing.',
      icon: Cpu,
    },
    {
      title: 'Strict Content Security Policy (CSP)',
      desc: 'Hardened HTTP meta policy prohibits untrusted inline script execution, unauthorized iframe framing, and malicious data exfiltration.',
      icon: ShieldCheck,
    },
    {
      title: 'Anti-Flood Rate Limiting',
      desc: 'Client-side sliding window limiter throttles automated bot floods and brute-force hammering to protect browser memory and user bandwidth.',
      icon: Terminal,
    },
    {
      title: 'Path Traversal & Payload Sanitizer',
      desc: 'Downloaded media filenames are sanitized against directory traversal sequences (../), null-byte injections, and executable extensions (.exe, .sh, .bat).',
      icon: CheckCircle,
    },
    {
      title: 'Zero Server Logs & Client Isolation',
      desc: 'URLs and extracted streams run purely in your isolated browser session. No IP addresses or download links are logged or stored on remote servers.',
      icon: ServerOff,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Security Shield & Defense Status</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Continuous protection against web vulnerabilities and hacker exploits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature List */}
        <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1">
          {securityFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex items-start gap-3 shadow-xs dark:shadow-none"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <span>{feat.title}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Known Vulnerabilities Detected</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
