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
  Clock,
  Trophy,
  BarChart3,
  ListChecks,
  Heart,
  Gift,
  BookHeart,
  Settings,
  Menu,
  X,
  Bell,
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
    <div className="h-screen w-screen bg-background ambient-bg flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen shrink-0 glass border-r border-border/50 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 w-72 h-screen glass border-r border-border/50 z-50 lg:hidden flex flex-col"
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Page Content with dedicated scroll container */}
        <div className="flex-1 relative z-10 min-h-0 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="min-w-0"
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

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const couple = useCoupleStore((s) => s.couple);
  const { t } = useLanguage();

  return (
    <>
      <div className="p-5 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary fill-primary" />
          <span className="font-heading font-semibold text-lg gradient-text">CoupleSync</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {couple && (
        <div className="px-5 py-4 border-b border-border/30">
          <p className="text-sm font-medium text-foreground">
            {couple.partner1Name} ❤️ {couple.partner2Name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{couple.coupleNickname}</p>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-0.5',
                isActive
                  ? 'bg-primary/10 text-primary glow-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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

function Header() {
  const { setSidebarOpen } = useUIStore();
  const couple = useCoupleStore((s) => s.couple);
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 glass border-b border-border/30 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors lg:hidden"
            aria-label={t('header.openMenu')}
          >
            <Menu className="w-5 h-5" />
          </button>

          {couple && (
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm lg:text-base">
                {couple.partner1Name} & {couple.partner2Name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher size="sm" />

          <button className="relative p-2 rounded-xl hover:bg-muted/50 transition-colors" aria-label={t('header.notifications')}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const { t } = useLanguage();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/30 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {mobileNavItemConfig.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_8px_hsl(346,77%,50%)]')} />
                <span className="text-[10px] font-medium">{t(item.key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

