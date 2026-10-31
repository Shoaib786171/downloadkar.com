import { X, Shield, FileText, AlertTriangle } from 'lucide-react';

export type LegalType = 'privacy' | 'terms' | 'disclaimer' | null;

interface LegalModalsProps {
  type: LegalType;
  onClose: () => void;
}

export default function LegalModals({ type, onClose }: LegalModalsProps) {
  if (!type) return null;

  const content = {
    privacy: {
      title: 'Privacy Policy',
      icon: Shield,
      updated: 'October 2026',
      body: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>downloadkar</strong>. We are committed to protecting your privacy and ensuring you have complete transparency regarding how data is handled when you use our website.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">1. Zero Logging Policy</h4>
          <p>
            downloadkar does not store, host, or archive the videos, reels, or audio files you process through our service. We do not maintain server-side logs correlating user IP addresses with specific media URLs converted.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2. Local Browser Storage</h4>
          <p>
            Your recent download history is stored solely inside your browser&apos;s local storage (LocalStorage). This data never leaves your device and can be cleared at any time via the History panel.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3. Cookies and Analytics</h4>
          <p>
            We use minimal technical cookies strictly necessary to maintain basic session state. We do not sell or trade user data to third-party ad networks or brokers.
          </p>
        </div>
      ),
    },
    terms: {
      title: 'Terms of Service',
      icon: FileText,
      updated: 'October 2026',
      body: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            By accessing or using <strong>downloadkar</strong>, you agree to comply with and be bound by the following terms and conditions.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">1. Authorized Personal Use</h4>
          <p>
            downloadkar is designed strictly as a personal utility to extract stream formats from publicly accessible content for personal archival, educational study, or fair use purposes.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2. Intellectual Property Rights</h4>
          <p>
            Users agree not to use downloadkar to infringe upon copyrights, trademarks, or proprietary rights of content creators. You are solely responsible for ensuring you have the legal right or license to download any specific media file.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3. Service Availability</h4>
          <p>
            downloadkar is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted uptime or continuous compatibility with changing third-party media platforms.
          </p>
        </div>
      ),
    },
    disclaimer: {
      title: 'Disclaimer',
      icon: AlertTriangle,
      updated: 'October 2026',
      body: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            <strong>downloadkar</strong> operates strictly as an independent stream analysis and utility tool.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">1. No Affiliation with Third-Party Platforms</h4>
          <p>
            downloadkar is NOT affiliated, associated, authorized, endorsed by, or in any way officially connected with YouTube, Google LLC, Meta Platforms Inc. (Facebook, Instagram), ByteDance Ltd. (TikTok), Vimeo Inc., or X Corp. (Twitter).
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2. Trademarks</h4>
          <p>
            All registered product names, platform logos, and trademarks mentioned on this website belong exclusively to their respective owners. Their mention is strictly for informational and compatibility purposes.
          </p>
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3. DMCA & Copyright Takedowns</h4>
          <p>
            If you are a copyright holder with inquiries or concerns, please contact our support team through the Contact form. Because downloadkar does not host or store any media files, stream links originate directly from the host providers.
          </p>
        </div>
      ),
    },
  }[type];

  const Icon = content.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-600/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{content.title}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Last updated: {content.updated}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 border-t border-b border-slate-200 dark:border-slate-800 py-4 my-1 text-slate-700 dark:text-slate-300">
          {content.body}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
