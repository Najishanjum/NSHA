import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage, Language } from '@/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LanguageSwitcher({ size = 'md', className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const options: { id: Language; label: string; flag: string; ariaLabel: string }[] = [
    {
      id: 'en',
      label: 'English',
      flag: '🇬🇧',
      ariaLabel: language === 'hinglish' ? 'English par switch karo' : 'Switch to English',
    },
    {
      id: 'hinglish',
      label: 'Hinglish',
      flag: '❤️',
      ariaLabel: language === 'hinglish' ? 'Hinglish par switch karo' : 'Switch to Hinglish',
    },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center p-1 rounded-xl bg-nsha-surface border-2 border-nsha-black relative select-none',
        className
      )}
      role="group"
      aria-label="Language selection"
    >
      {options.map((opt) => {
        const isActive = language === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setLanguage(opt.id)}
            aria-label={opt.ariaLabel}
            aria-pressed={isActive}
            className={cn(
              'relative z-10 flex items-center gap-1.5 font-heading font-semibold transition-colors rounded-lg duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-nsha-yellow',
              size === 'sm' && 'px-2.5 py-1 text-xs',
              size === 'md' && 'px-3 py-1.5 text-xs sm:text-sm',
              size === 'lg' && 'px-4 py-2 text-sm sm:text-base',
              isActive ? 'text-nsha-black' : 'text-nsha-text-secondary hover:text-nsha-black'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeLangPill"
                className="absolute inset-0 bg-nsha-yellow rounded-lg border-2 border-nsha-black shadow-[2px_2px_0_#090909] -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="text-sm">{opt.flag}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
