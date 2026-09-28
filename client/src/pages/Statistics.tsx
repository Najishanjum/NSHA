import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Flame,
  Camera,
  Mic,
  Phone,
  MessageCircle,
  Calendar,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { statsApi, streakApi } from '@/services/api';
import type { CoupleStatistics, StreakData } from '@/types';
import { formatTotalHours } from '@/lib/utils';

export default function Statistics() {
  const couple = useCoupleStore((s) => s.couple);

  const [stats, setStats] = useState<CoupleStatistics | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [couple]);

  const loadStats = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const [statsRes, streakRes] = await Promise.all([
        statsApi.get(couple.id).catch(() => ({ data: null })),
        streakApi.get(couple.id).catch(() => ({ data: null })),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (streakRes.data) setStreak(streakRes.data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const statItems = [
    {
      title: 'Current Streak',
      value: streak?.currentStreak || stats?.currentStreak || 0,
      unit: 'days',
      icon: Flame,
      accent: 'bg-nsha-yellow',
      sub: `Best: ${streak?.longestStreak || stats?.longestStreak || 0} days`,
    },
    {
      title: 'Days Completed',
      value: stats?.totalCompletedDays || 0,
      unit: 'days',
      icon: Calendar,
      accent: 'bg-nsha-pink',
      sub: `${stats?.daysTogether || 0} days together`,
    },
    {
      title: 'Photos Shared',
      value: stats?.totalPhotos || 0,
      unit: '',
      icon: Camera,
      accent: 'bg-nsha-pink',
      sub: `${stats?.favoritePhotos || 0} favorited`,
    },
    {
      title: 'Voice Clips',
      value: stats?.totalVoiceClips || 0,
      unit: '',
      icon: Mic,
      accent: 'bg-nsha-purple',
      sub: 'Saved to vault',
    },
    {
      title: 'Call Time',
      value: formatTotalHours(stats?.totalCallDuration || 0),
      unit: '',
      icon: Phone,
      accent: 'bg-nsha-green',
      sub: `${stats?.totalCalls || 0} total calls`,
    },
    {
      title: 'Messages',
      value: stats?.totalMessages || 0,
      unit: '',
      icon: MessageCircle,
      accent: 'bg-nsha-lime',
      sub: 'Shared thoughts',
    },
  ];

  const barData = [
    { label: 'Photos', value: stats?.totalPhotos || 0, max: 100, color: 'bg-nsha-pink', icon: Camera },
    { label: 'Voice', value: stats?.totalVoiceClips || 0, max: 50, color: 'bg-nsha-purple', icon: Mic },
    { label: 'Calls', value: stats?.totalCalls || 0, max: 50, color: 'bg-nsha-green', icon: Phone },
    { label: 'Messages', value: stats?.totalMessages || 0, max: 200, color: 'bg-nsha-yellow', icon: MessageCircle },
  ];

  return (
    <div className="py-6 lg:py-10 space-y-8">
      {/* Page Header */}
      <div className="nsha-page-header">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-purple">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / INSIGHTS</p>
            <h1 className="nsha-page-title">Relationship Insights</h1>
          </div>
        </div>
        <p className="nsha-page-subtitle mt-2">A bird's-eye view of your shared communication, milestones, and consistency</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="nsha-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">{item.title}</span>
                <div className={`nsha-icon-box-sm ${item.accent}`} style={{ borderWidth: '2px', borderColor: '#090909', color: item.accent === 'bg-nsha-yellow' || item.accent === 'bg-nsha-green' || item.accent === 'bg-nsha-lime' ? '#090909' : '#fff' }}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="font-heading text-4xl font-bold text-nsha-black tracking-tight">
                {item.value}{item.unit ? <span className="text-lg ml-1">{item.unit}</span> : null}
              </p>
              <p className="text-xs text-nsha-text-secondary mt-2 flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                {item.sub}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Communication Distribution */}
      <div className="nsha-card p-6 md:p-8">
        <h3 className="font-heading font-bold text-xl text-nsha-black mb-6 flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-pink">
            <TrendingUp className="w-5 h-5" />
          </div>
          Communication Distribution
        </h3>

        <div className="space-y-5">
          {barData.map((bar) => {
            const BarIcon = bar.icon;
            return (
              <div key={bar.label}>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="flex items-center gap-2 font-heading font-semibold text-nsha-black">
                    <BarIcon className="w-4 h-4 text-nsha-text-secondary" />
                    {bar.label}
                  </span>
                  <span className="font-heading font-bold text-nsha-black">{bar.value}</span>
                </div>
                <div className="nsha-progress">
                  <motion.div
                    className={`nsha-progress-fill ${bar.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (bar.value / bar.max) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
