import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Award,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { achievementApi, statsApi } from '@/services/api';
import type { Achievement, UserAchievement, CoupleStatistics } from '@/types';
import { ACHIEVEMENTS, COUPLE_LEVELS } from '@/types';
import { cn, formatDate } from '@/lib/utils';

export default function Achievements() {
  const couple = useCoupleStore((s) => s.couple);

  const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>([]);
  const [stats, setStats] = useState<CoupleStatistics | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'streak' | 'photos' | 'vcs' | 'calls' | 'days'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [couple]);

  const loadAchievements = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const [achievementsRes, statsRes] = await Promise.all([
        achievementApi.getAll(couple.id).catch(() => ({ data: { achievements: ACHIEVEMENTS, unlocked: [] } })),
        statsApi.get(couple.id).catch(() => ({ data: null })),
      ]);

      if (achievementsRes.data) {
        setUnlockedAchievements(achievementsRes.data.unlocked || []);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const unlockedMap = new Map<string, UserAchievement>();
  unlockedAchievements.forEach((u) => unlockedMap.set(u.achievementId, u));

  const completedDays = stats?.totalCompletedDays || 0;
  const currentLevel =
    COUPLE_LEVELS.find((l) => completedDays >= l.minDays && completedDays <= l.maxDays) ||
    COUPLE_LEVELS[0];
  const nextLevel = COUPLE_LEVELS.find((l) => l.level === currentLevel.level + 1);

  const levelProgress = nextLevel
    ? Math.min(
        100,
        Math.round(((completedDays - currentLevel.minDays) / (nextLevel.minDays - currentLevel.minDays)) * 100)
      )
    : 100;

  const filteredAchievements = ACHIEVEMENTS.filter((a) => {
    if (categoryFilter === 'all') return true;
    return a.category === categoryFilter;
  });

  const getProgressForAchievement = (a: Achievement): number => {
    if (!stats) return 0;
    let current = 0;
    switch (a.category) {
      case 'streak':
        current = stats.longestStreak || 0;
        break;
      case 'photos':
        current = stats.totalPhotos || 0;
        break;
      case 'vcs':
        current = stats.totalVoiceClips || 0;
        break;
      case 'calls':
        current = a.id === 'ten-hours-calling' ? (stats.totalCallDuration || 0) : (stats.totalCalls || 0);
        break;
      case 'days':
        current = stats.totalCompletedDays || 0;
        break;
      default:
        current = 0;
    }
    return Math.min(100, Math.round((current / a.requirement) * 100));
  };

  return (
    <div className="py-6 lg:py-10 space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box" style={{ background: '#FFE28A' }}>
            <Trophy className="w-5 h-5 text-nsha-black" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / ACHIEVEMENTS</p>
            <h1 className="nsha-page-title">Badges & Achievements</h1>
            <p className="nsha-page-subtitle">Celebrate your milestones as your relationship story grows</p>
          </div>
        </div>

        <div className="nsha-badge">
          <Award className="w-4 h-4" />
          {unlockedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
        </div>
      </div>

      {/* Couple Level Card */}
      <div className="nsha-card p-6 md:p-8" style={{ background: '#FFD21C' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-nsha-purple border-3 border-nsha-black flex items-center justify-center text-3xl" style={{ borderWidth: '3px' }}>
              {currentLevel.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="nsha-badge nsha-badge-purple text-[10px]">
                  Level {currentLevel.level}
                </span>
                <span className="text-xs text-nsha-text-secondary font-semibold">• {completedDays} Days</span>
              </div>
              <h2 className="font-heading font-bold text-xl text-nsha-black">{currentLevel.title}</h2>
            </div>
          </div>

          {nextLevel && (
            <div className="text-left sm:text-right">
              <span className="text-xs text-nsha-text-secondary font-semibold">Next Rank:</span>
              <p className="text-sm font-heading font-bold text-nsha-black">
                {nextLevel.emoji} {nextLevel.title} ({nextLevel.minDays - completedDays} days away)
              </p>
            </div>
          )}
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-1.5">
          <div className="nsha-progress">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="nsha-progress-fill bg-nsha-purple"
            />
          </div>
          <div className="flex justify-between text-[11px] text-nsha-text-secondary font-semibold">
            <span>{currentLevel.minDays} days</span>
            <span>{nextLevel ? `${nextLevel.minDays} days` : 'Max Level'}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(
          [
            { id: 'all', label: 'All Badges' },
            { id: 'streak', label: 'Streak 🔥' },
            { id: 'photos', label: 'Photos 📸' },
            { id: 'vcs', label: 'Voice 🎙️' },
            { id: 'calls', label: 'Calls 📞' },
            { id: 'days', label: 'Days ❤️' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-heading font-bold whitespace-nowrap transition-all',
              categoryFilter === tab.id
                ? 'bg-nsha-yellow text-nsha-black border-2 border-nsha-black shadow-[3px_3px_0_#090909]'
                : 'bg-nsha-surface text-nsha-text-secondary border-2 border-transparent hover:border-nsha-black/20 hover:text-nsha-black'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {filteredAchievements.map((ach) => {
          const isUnlocked = unlockedMap.has(ach.id);
          const unlockedData = unlockedMap.get(ach.id);
          const progressPercent = isUnlocked ? 100 : getProgressForAchievement(ach);

          return (
            <motion.div
              key={ach.id}
              whileHover={{ y: -3 }}
              className={cn(
                'nsha-card-sm p-5 flex flex-col justify-between',
                isUnlocked ? 'bg-nsha-yellow-soft' : 'opacity-70'
              )}
              style={!isUnlocked ? { background: '#F0EDE6' } : {}}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                      isUnlocked
                        ? 'bg-nsha-yellow border-2 border-nsha-black'
                        : 'bg-[#E8E4DA] border-2 border-[#D4D0C7] grayscale'
                    )}
                  >
                    {ach.emoji}
                  </div>

                  {isUnlocked ? (
                    <span className="nsha-badge nsha-badge-green text-[10px]">
                      <CheckCircle className="w-3 h-3" />
                      Done
                    </span>
                  ) : (
                    <span className="nsha-badge nsha-badge-outline text-[10px]">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-bold text-base text-nsha-black mb-1">{ach.title}</h3>
                <p className="text-xs text-nsha-text-secondary leading-relaxed mb-4">{ach.description}</p>
              </div>

              {/* Progress or Unlock date */}
              <div className="pt-3" style={{ borderTop: '2px solid #090909' }}>
                {isUnlocked ? (
                  <p className="text-[11px] text-nsha-text-secondary font-heading font-semibold">
                    Unlocked {unlockedData?.unlockedAt ? formatDate(unlockedData.unlockedAt) : 'recently'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-nsha-text-secondary font-heading font-bold">
                      <span>Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="nsha-progress" style={{ height: '8px' }}>
                      <div
                        className="nsha-progress-fill bg-nsha-text-secondary"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
