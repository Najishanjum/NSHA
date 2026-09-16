import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Award,
  Sparkles,
  Flame,
  Camera,
  Mic,
  Phone,
  Calendar,
  Lock,
  CheckCircle,
  Star,
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

  // Determine current couple level based on total completed days
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
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Trophy className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-400 bg-clip-text text-transparent">
              Badges & Achievements
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Celebrate your milestones as your relationship story grows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold text-white">
            {unlockedAchievements.length} / {ACHIEVEMENTS.length} Unlocked
          </span>
        </div>
      </div>

      {/* Couple Level Progression Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/30 via-slate-900/80 to-rose-950/30 border border-purple-500/20 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30">
              {currentLevel.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Level {currentLevel.level}
                </span>
                <span className="text-xs text-slate-400">• {completedDays} Days Completed</span>
              </div>
              <h2 className="text-xl font-bold text-white">{currentLevel.title}</h2>
            </div>
          </div>

          {nextLevel && (
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Next Rank:</span>
              <p className="text-sm font-semibold text-purple-300">
                {nextLevel.emoji} {nextLevel.title} ({nextLevel.minDays - completedDays} days away)
              </p>
            </div>
          )}
        </div>

        {/* Level Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg shadow-pink-500/50"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{currentLevel.minDays} days</span>
            <span>{nextLevel ? `${nextLevel.minDays} days` : 'Max Level'}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(
          [
            { id: 'all', label: 'All Badges' },
            { id: 'streak', label: 'Streak 🔥' },
            { id: 'photos', label: 'Photos 📸' },
            { id: 'vcs', label: 'Voice Clips 🎙️' },
            { id: 'calls', label: 'Calls 📞' },
            { id: 'days', label: 'Days ❤️' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
              categoryFilter === tab.id
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredAchievements.map((ach) => {
          const isUnlocked = unlockedMap.has(ach.id);
          const unlockedData = unlockedMap.get(ach.id);
          const progressPercent = isUnlocked ? 100 : getProgressForAchievement(ach);

          return (
            <motion.div
              key={ach.id}
              whileHover={{ y: -3 }}
              className={cn(
                'p-5 rounded-3xl border transition-all backdrop-blur-xl relative overflow-hidden flex flex-col justify-between',
                isUnlocked
                  ? 'bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-rose-500/10 border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'bg-white/[0.02] border-white/5 opacity-70'
              )}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border',
                      isUnlocked
                        ? 'bg-amber-500/20 border-amber-500/40 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 border-white/10 grayscale'
                    )}
                  >
                    {ach.emoji}
                  </div>

                  {isUnlocked ? (
                    <span className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 rounded-full bg-white/5 text-slate-500 border border-white/10">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-1">{ach.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{ach.description}</p>
              </div>

              {/* Progress or Unlocked Time */}
              <div className="pt-3 border-t border-white/5">
                {isUnlocked ? (
                  <p className="text-[11px] text-amber-400/80 font-medium">
                    Unlocked {unlockedData?.unlockedAt ? formatDate(unlockedData.unlockedAt) : 'recently'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-600 rounded-full"
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
