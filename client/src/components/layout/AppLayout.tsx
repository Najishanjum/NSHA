import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Target,
  Image,
  Mic,
  Phone,
  Calendar,
  Trophy,
  BarChart3,
  ListChecks,
  BookHeart,
  Gift,
  Settings,
  Menu,
  X,
  Bell,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCoupleStore, useUIStore, useNotificationStore } from '@/stores';
import { useLanguage } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const navItemConfig = [
  { path: '/', icon: Home, key: 'nav.home' },
  { path: '/challenge', icon: Target, key: 'nav.challenge' },
  { path: '/memories', icon: Image, key: 'nav.memories' },
  { path: '/voice', icon: Mic, key: 'nav.voice' },
  { path: '/calls', icon: Phone, key: 'nav.calls' },
  { path: '/calendar', icon: Calendar, key: 'nav.calendar' },
  { path: '/achievements', icon: Trophy, key: 'nav.achievements' },
  { path: '/statistics', icon: BarChart3, key: 'nav.statistics' },
  { path: '/bucket-list', icon: ListChecks, key: 'nav.bucketList' },
  { path: '/love-notes', icon: BookHeart, key: 'nav.loveNotes' },
  { path: '/surprises', icon: Gift, key: 'nav.surprises' },
  { path: '/settings', icon: Settings, key: 'nav.settings' },
];

/* Desktop top nav: limited set */
const desktopNavItems = [
  { path: '/', icon: Home, key: 'nav.home', label: 'Home' },
  { path: '/challenge', icon: Target, key: 'nav.challenge', label: 'Challenges' },
  { path: '/memories', icon: Image, key: 'nav.memories', label: 'Memories' },
  { path: '/statistics', icon: BarChart3, key: 'nav.statistics', label: 'Statistics' },
  { path: '/calendar', icon: Calendar, key: 'nav.calendar', label: 'Calendar' },
];

const mobileNavItemConfig = [
  { path: '/', icon: Home, key: 'nav.home' },
  { path: '/challenge', icon: Target, key: 'nav.challenge' },
  { path: '/memories', icon: Image, key: 'nav.memories' },
  { path: '/voice', icon: Mic, key: 'nav.voice' },
  { path: '/settings', icon: Heart, key: 'nav.profile' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();

  return (
    <div className="min-h-screen w-full bg-nsha-surface">
      {/* Desktop Top Navigation */}
      <DesktopNav />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-nsha-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 w-80 h-screen bg-nsha-surface border-r-3 border-nsha-black z-50 lg:hidden flex flex-col"
              style={{ borderRightWidth: '3px' }}
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="w-full max-w-[1320px] mx-auto px-4 md:px-6 lg:px-8">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Page Content */}
        <div className="pb-24 lg:pb-12 min-h-[calc(100vh-80px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}

/* ─── Desktop Top Navigation ─── */
function DesktopNav() {
  const couple = useCoupleStore((s) => s.couple);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const { t } = useLanguage();
  const { setSidebarOpen } = useUIStore();

  return (
    <header className="hidden lg:block sticky top-0 z-30 bg-nsha-surface" style={{ borderBottom: '3px solid #090909' }}>
      <div className="max-w-[1320px] mx-auto px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nsha-yellow border-3 border-nsha-black flex items-center justify-center" style={{ borderWidth: '3px' }}>
            <span className="font-heading font-bold text-nsha-black text-lg">N</span>
          </div>
          <span className="font-heading font-bold text-xl text-nsha-black tracking-tight">NSHA</span>
        </div>

        {/* Center Navigation */}
        <nav className="flex items-center gap-1">
          {desktopNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2 rounded-xl text-sm font-heading font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-nsha-yellow text-nsha-black border-2 border-nsha-black shadow-[3px_3px_0_#090909]'
                    : 'text-nsha-text-secondary hover:text-nsha-black hover:bg-nsha-yellow/20'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {/* More menu trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-3 py-2 rounded-xl text-sm font-heading font-semibold text-nsha-text-secondary hover:text-nsha-black hover:bg-nsha-yellow/20 transition-all"
          >
            More…
          </button>
        </nav>

        {/* Right: Profile + Notifications */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher size="sm" />

          <button
            className="relative w-10 h-10 rounded-xl border-2 border-nsha-black bg-nsha-surface flex items-center justify-center hover:bg-nsha-yellow/20 transition-colors"
            aria-label={t('header.notifications')}
          >
            <Bell className="w-5 h-5 text-nsha-black" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-nsha-pink text-white text-[10px] font-bold flex items-center justify-center border-2 border-nsha-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {couple && (
            <NavLink
              to="/settings"
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-nsha-black bg-nsha-surface hover:bg-nsha-yellow/20 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-nsha-pink border-2 border-nsha-black flex items-center justify-center">
                <span className="text-white font-bold text-xs">{couple.partner1Name[0]?.toUpperCase()}</span>
              </div>
              <span className="text-sm font-heading font-semibold text-nsha-black">
                {couple.partner1Name} & {couple.partner2Name}
              </span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

/* ─── Mobile Header (visible on mobile only) ─── */
function MobileHeader() {
  const { setSidebarOpen } = useUIStore();
  const couple = useCoupleStore((s) => s.couple);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const { t } = useLanguage();

  return (
    <header className="lg:hidden flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-xl border-2 border-nsha-black bg-nsha-surface flex items-center justify-center hover:bg-nsha-yellow/20 transition-colors"
          aria-label={t('header.openMenu')}
        >
          <Menu className="w-5 h-5 text-nsha-black" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-nsha-yellow border-2 border-nsha-black flex items-center justify-center">
            <span className="font-heading font-bold text-nsha-black text-sm">N</span>
          </div>
          <span className="font-heading font-bold text-lg text-nsha-black tracking-tight">NSHA</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher size="sm" />
        <button
          className="relative w-10 h-10 rounded-xl border-2 border-nsha-black bg-nsha-surface flex items-center justify-center"
          aria-label={t('header.notifications')}
        >
          <Bell className="w-5 h-5 text-nsha-black" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-nsha-pink text-white text-[10px] font-bold flex items-center justify-center border-2 border-nsha-black">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

/* ─── Sidebar Content (for mobile slide-out) ─── */
function SidebarContent({ onClose }: { onClose?: () => void }) {
  const couple = useCoupleStore((s) => s.couple);
  const { t } = useLanguage();

  return (
    <>
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: '3px solid #090909' }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-nsha-yellow border-2 border-nsha-black flex items-center justify-center">
            <span className="font-heading font-bold text-nsha-black">N</span>
          </div>
          <span className="font-heading font-bold text-xl text-nsha-black">NSHA</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border-2 border-nsha-black flex items-center justify-center hover:bg-nsha-pink hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {couple && (
        <div className="px-5 py-4" style={{ borderBottom: '3px solid #090909' }}>
          <p className="text-sm font-heading font-bold text-nsha-black">
            {couple.partner1Name} & {couple.partner2Name}
          </p>
          {couple.coupleNickname && (
            <p className="text-xs text-nsha-text-secondary mt-0.5">{couple.coupleNickname}</p>
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-3 no-scrollbar">
        {navItemConfig.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-heading font-semibold transition-all duration-200 mb-0.5',
                isActive
                  ? 'bg-nsha-yellow text-nsha-black border-2 border-nsha-black shadow-[3px_3px_0_#090909]'
                  : 'text-nsha-text-secondary hover:text-nsha-black hover:bg-nsha-yellow/20'
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

/* ─── Mobile Bottom Nav ─── */
function MobileNav() {
  const { t } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-nsha-surface safe-area-bottom"
      style={{ borderTop: '3px solid #090909' }}
    >
      <div className="flex items-center justify-around py-2 px-2">
        {mobileNavItemConfig.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-nsha-black'
                  : 'text-nsha-text-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'bg-nsha-yellow border-2 border-nsha-black shadow-[2px_2px_0_#090909]'
                      : ''
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-heading font-semibold">{t(item.key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
