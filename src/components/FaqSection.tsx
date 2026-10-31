import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is downloadkar completely free to use?',
      a: 'Yes, downloadkar is 100% free with unlimited conversions. There are no subscriptions, hidden fees, daily download quotas, or account registrations required.',
    },
    {
      q: 'How do I download TikTok videos without a watermark?',
      a: 'Simply copy the TikTok video or reel link from the TikTok app, paste it into the downloadkar search box, and click "Fetch Video". Select the "Download Video (No Watermark)" button to save the clean, original video.',
    },
    {
      q: 'Can I extract high-quality MP3 audio from YouTube videos?',
      a: 'Yes! Whenever you paste a YouTube link, downloadkar provides a dedicated "Download Audio (MP3)" button along with quality options ranging from 128 kbps up to 320 kbps high-bitrate audio.',
    },
    {
      q: 'Where are downloaded files saved on iPhone and Android?',
      a: 'On Android devices, downloaded files are saved automatically in your "Download" folder and appear in your Gallery app. On iOS (iPhone/iPad), files save to the Safari Downloads folder inside the "Files" app, where you can tap "Save Video" to export to your Photos camera roll.',
    },
    {
      q: 'Is there any limit on file size or video duration?',
      a: 'No, downloadkar has no artificial restrictions on duration or file size. You can download short 15-second TikTok reels, Instagram stories, or full-length multi-hour YouTube podcasts and documentaries in top quality.',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-950/20 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 block">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden transition-colors shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-rose-500 dark:text-rose-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
