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
      title: 'Privacy Policy & Data Retention',
      icon: Shield,
      updated: 'October 2026',
      body: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>downloadkar</strong>. We are committed to transparency regarding how data is handled, processed, and stored when you use our website and media conversion services.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">1. Ephemeral Media Processing</h4>
          <p>
            Media files uploaded or processed through downloadkar are stored strictly in an isolated temporary processing directory (<code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px]">/tmp/downloadkar_jobs</code>). All input files, intermediate chunks, and generated outputs are automatically deleted by a scheduled server cleaner within <strong>15 minutes</strong> of creation. We do not maintain persistent archives of user media.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2. Server Logs and Diagnostic Information</h4>
          <p>
            Our web servers maintain standard ephemeral technical access logs (including request timestamps, HTTP status codes, and anonymized IP addresses) solely for operational security, anti-abuse rate limiting, and system troubleshooting. These diagnostic logs are rotated and discarded automatically.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3. Local Browser Storage (LocalStorage)</h4>
          <p>
            Your optional recent download history and theme preferences are stored exclusively on your device within your browser&apos;s LocalStorage. This information is never transmitted to our servers and can be wiped instantly by clearing your browser data or using the Clear History button.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">4. Contact Inquiries</h4>
          <p>
            When you submit a message through our Contact form, your email address, inquiry topic, and message are recorded to allow our support team to respond. We never sell, rent, or distribute contact details to third-party advertisers or brokers.
          </p>
        </div>
      ),
    },
    terms: {
      title: 'Terms of Service & Acceptable Use',
      icon: FileText,
      updated: 'October 2026',
      body: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            By accessing or using <strong>downloadkar</strong>, you agree to comply with and be bound by these Terms of Service.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">1. Permitted and Authorized Use</h4>
          <p>
            downloadkar provides media transcoding, audio extraction, video trimming, and watermarking utilities. You agree to use this service exclusively for media content that you own, have created, or for which you hold express authorization, valid license, or legal permission from the copyright owner.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2. Prohibited Activities</h4>
          <p>
            You agree NOT to use downloadkar to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Circumvent Digital Rights Management (DRM), authentication gates, paywalls, or encryption mechanisms.</li>
            <li>Infringe upon the intellectual property, copyright, trademark, or privacy rights of any third party.</li>
            <li>Conduct denial-of-service (DoS) attacks, flood requests, or attempt Server-Side Request Forgery (SSRF).</li>
            <li>Process, transcode, or transmit unlawful, defamatory, or abusive material.</li>
          </ul>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3. Platform Policies and Technical Limitations</h4>
          <p>
            Major platforms (including YouTube, Meta, TikTok, and Vimeo) maintain terms restricting automated stream scraping. Where an authorized API or direct public media stream is unavailable, downloadkar respects platform restrictions and does not bypass access controls.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">4. Disclaimer of Warranties</h4>
          <p>
            downloadkar is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of uninterrupted uptime or error-free processing. We reserve the right to restrict service access to prevent system abuse.
          </p>
        </div>
      ),
    },
    disclaimer: {
      title: 'Disclaimer & DMCA Takedown Procedure',
      icon: AlertTriangle,
      updated: 'October 2026',
      body: (
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            <strong>downloadkar</strong> operates as an independent media utility and conversion technology provider.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">1. No Third-Party Platform Affiliation</h4>
          <p>
            downloadkar is NOT affiliated with, authorized, endorsed by, or officially associated with YouTube, Google LLC, Meta Platforms Inc. (Facebook, Instagram), ByteDance Ltd. (TikTok), Vimeo Inc., or X Corp. (Twitter). All platform brand names, trademarks, and logos are property of their respective holders and are referenced purely for technical compatibility and descriptive purposes.
          </p>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">2. DMCA & Copyright Complaint Procedure</h4>
          <p>
            downloadkar respects the rights of copyright owners and operates in compliance with applicable intellectual property laws. If you believe your copyrighted work is being processed or referenced in violation of your rights, please submit a written notice to our designated contact through the Contact Form or by emailing our administration.
          </p>
          <p>
            Your notice must include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>Specific URL or reference to the material in question.</li>
            <li>Your contact information (name, address, telephone number, and email address).</li>
            <li>A statement of good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement made under penalty of perjury that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner.</li>
          </ul>

          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">3. Legal Review Notice</h4>
          <p>
            The legal disclaimers herein do not constitute legal advice. Users are advised to review the intellectual property laws of their respective jurisdictions.
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
