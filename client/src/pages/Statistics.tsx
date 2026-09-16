import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Flame,
  Camera,
  Mic,
  Phone,
  MessageCircle,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { statsApi, streakApi } from '@/services/api';
import type { CoupleStatistics, StreakData } from '@/types';
import { formatDuration, formatTotalHours } from '@/lib/utils';

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
      value: `${streak?.currentStreak || stats?.currentStreak || 0} days`,
      icon: Flame,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      sub: `Best: ${streak?.longestStreak || stats?.longestStreak || 0} days`,
    },
    {
      title: 'Days Completed',
      value: `${stats?.totalCompletedDays || 0} days`,
      icon: Calendar,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      sub: `${stats?.daysTogether || 0} days together`,
    },
    {
      title: 'Photos Shared',
      value: `${stats?.totalPhotos || 0}`,
      icon: Camera,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      sub: `${stats?.favoritePhotos || 0} favorited`,
    },
    {
      title: 'Voice Clips Sent',
      value: `${stats?.totalVoiceClips || 0}`,
      icon: Mic,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      sub: 'Saved to vault',
    },
    {
      title: 'Total Call Time',
      value: formatTotalHours(stats?.totalCallDuration || 0),
      icon: Phone,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      sub: `${stats?.totalCalls || 0} total calls`,
    },
    {
      title: 'Messages Exchanged',
      value: `${stats?.totalMessages || 0}`,
      icon: MessageCircle,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      sub: 'Shared thoughts',
    },
  ];

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <BarChart3 className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            Relationship Insights
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            A birds-eye view of your shared communication, milestones, and consistency
          </p>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400">{item.title}</span>
                <div className={`p-2 rounded-xl ${item.bg} ${item.color} ${item.border} border`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">{item.value}</p>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                {item.sub}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Interaction Composition Card */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-rose-400" />
          Communication Distribution
        </h3>

        {/* Visual composition bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-pink-400" /> Photos Shared
              </span>
              <span className="text-white font-semibold">{stats?.totalPhotos || 0}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full"
                style={{ width: `${Math.min(100, ((stats?.totalPhotos || 0) / 100) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-purple-400" /> Voice & Video Clips
              </span>
              <span className="text-white font-semibold">{stats?.totalVoiceClips || 0}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${Math.min(100, ((stats?.totalVoiceClips || 0) / 50) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Voice Calls
              </span>
              <span className="text-white font-semibold">{stats?.totalCalls || 0} calls</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, ((stats?.totalCalls || 0) / 50) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-cyan-400" /> Messages
              </span>
              <span className="text-white font-semibold">{stats?.totalMessages || 0}</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${Math.min(100, ((stats?.totalMessages || 0) / 200) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
