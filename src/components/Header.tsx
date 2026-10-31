import { useState, useRef, useEffect } from 'react';
import {
  Download,
  Menu,
  X,
  Globe,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  ChevronDown,
  Check,
  Search,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, Theme } from '../context/ThemeContext';
import { SupportedLanguage } from '../services/i18n';

interface HeaderProps {
  onOpenContact: () => void;
}

export default function Header({ onOpenContact }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const { language, setLanguage, t, languages } = useLanguage();
  const { theme, setTheme } = useTheme();

  const themeRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const themeOptions: { id: Theme; label: string; icon: typeof Sun; desc: string }[] = [
    { id: 'light', label: t.lightMode, icon: Sun, desc: 'Clean luminous' },
    { id: 'dark', label: t.darkMode, icon: Moon, desc: 'Slate charcoal' },
    { id: 'system', label: t.systemTheme, icon: Monitor, desc: 'Syncs with device' },
    { id: 'midnight', label: t.midnightTheme, icon: Sparkles, desc: 'Pure OLED black' },
  ];

  const currentThemeObj = themeOptions.find((o) => o.id === theme) || themeOptions[1];
  const CurrentThemeIcon = currentThemeObj.icon;

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  const filteredLanguages = languages.filter((l) => {
    const q = langSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2 group"
        >
          <span className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-900/40 group-hover:bg-rose-500 transition-colors">
            <Download className="w-4 h-4 stroke-[2.5]" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            download<span className="text-rose-500">kar</span>
          </span>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => scrollToSection('hero')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            {t.navHome}
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            {t.navHowToUse}
          </button>
          <button
            onClick={() => scrollToSection('supported-platforms')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            {t.navSupportedSites}
          </button>
          <button
            onClick={onOpenContact}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            {t.navContact}
          </button>
        </nav>

        {/* Zone 3: Header Controls (Language & 4-Option Theme) */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* International Language Dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setThemeDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              aria-label="Select Language"
              aria-expanded={langDropdownOpen}
            >
              <span className="text-sm leading-none">{currentLangObj.flag}</span>
              <span className="hidden md:inline">{currentLangObj.name}</span>
              <span className="md:hidden uppercase tracking-wider">{currentLangObj.code}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  langDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search 20 languages..."
                    className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                    autoFocus
                  />
                  {langSearch && (
                    <button
                      onClick={() => setLangSearch('')}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-72 p-1.5 space-y-0.5 divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredLanguages.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No language found
                    </div>
                  ) : (
                    filteredLanguages.map((lang) => {
                      const isSelected = lang.code === language;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as SupportedLanguage);
                            setLangDropdownOpen(false);
                            setLangSearch('');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{lang.flag}</span>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {lang.nativeName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {lang.name}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-rose-500 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4-Option Theme Dropdown */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => {
                setThemeDropdownOpen(!themeDropdownOpen);
                setLangDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              aria-label="Select Theme"
              aria-expanded={themeDropdownOpen}
            >
              <CurrentThemeIcon
                className={`w-3.5 h-3.5 ${
                  theme === 'light'
                    ? 'text-amber-500'
                    : theme === 'dark'
                    ? 'text-sky-400'
                    : theme === 'system'
                    ? 'text-emerald-400'
                    : 'text-purple-400'
                }`}
              />
              <span className="hidden md:inline">{currentThemeObj.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  themeDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {t.theme}
                </div>
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = opt.id === theme;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setTheme(opt.id);
                        setThemeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`p-1.5 rounded-md ${
                            opt.id === 'light'
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600'
                              : opt.id === 'dark'
                              ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-400'
                              : opt.id === 'system'
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-500'
                              : 'bg-purple-100 dark:bg-purple-950/50 text-purple-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div>{opt.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile hamburger menu button */}
        <div className="sm:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-5 space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <nav className="space-y-1">
            <button
              onClick={() => scrollToSection('hero')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              {t.navHome}
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              {t.navHowToUse}
            </button>
            <button
              onClick={() => scrollToSection('supported-platforms')}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              {t.navSupportedSites}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              {t.navContact}
            </button>
          </nav>

          {/* Mobile Theme Selector (4 Options) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              {t.theme}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = opt.id === theme;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Language Selector */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
              <span>{t.selectLanguage}</span>
              <span className="text-[10px] text-slate-400">20 Languages</span>
            </div>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500/50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
