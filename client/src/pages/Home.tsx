import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Flame,
  Camera,
  Mic,
  Phone,
  MessageCircle,
  Calendar,
  ChevronRight,
  Sparkles,
  Clock,
  Image,
} from 'lucide-react';
import { cn, getDaysBetween, getDateString } from '@/lib/utils';
import { useCoupleStore } from '@/stores';
import { useNavigate } from 'react-router-dom';
import { challengeApi, streakApi, statsApi, questionApi } from '@/services/api';
import type { DailyChallenge, StreakData, CoupleStatistics } from '@/types';
import { DAILY_QUESTIONS } from '@/types';

/* ─── Reusable progress ring ─── */
function ProgressRing({ progress, size = 80, strokeWidth = 6, children }: {
  progress: number; size?: number; strokeWidth?: number; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#progressGradient)" strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(346, 77%, 50%)" />
            <stop offset="100%" stopColor="hsl(280, 60%, 55%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const couple = useCoupleStore((s) => s.couple);
  const currentPartner = useCoupleStore((s) => s.currentPartner);
  const partnerName = useCoupleStore((s) => s.getPartnerName());
  const myName = useCoupleStore((s) => s.getMyName());
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [stats, setStats] = useState<CoupleStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  const today = getDateString();
  const daysTogether = couple ? getDaysBetween(couple.relationshipStartDate, today) + 1 : 0;

  // Calculate daily question based on day of year
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const todayQuestion = DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];

  useEffect(() => {
    if (!couple) return;
    const load = async () => {
      setLoading(true);
      try {
        const [challengeRes, streakRes, statsRes] = await Promise.allSettled([
          challengeApi.getToday(couple.id),
          streakApi.get(couple.id),
          statsApi.get(couple.id),
        ]);
        if (challengeRes.status === 'fulfilled' && challengeRes.value.data) setChallenge(challengeRes.value.data);
        if (streakRes.status === 'fulfilled' && streakRes.value.data) setStreak(streakRes.value.data);
        if (statsRes.status === 'fulfilled' && statsRes.value.data) setStats(statsRes.value.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [couple]);

  // Calculate progress
  const myPhotos = challenge ? (currentPartner === 1 ? challenge.partner1Photos : challenge.partner2Photos) : 0;
  const partnerPhotos = challenge ? (currentPartner === 1 ? challenge.partner2Photos : challenge.partner1Photos) : 0;
  const myVc = challenge ? (currentPartner === 1 ? challenge.partner1Vc : challenge.partner2Vc) : false;
  const partnerVc = challenge ? (currentPartner === 1 ? challenge.partner2Vc : challenge.partner1Vc) : false;
  const myQuestion = challenge ? (currentPartner === 1 ? challenge.partner1Question : challenge.partner2Question) : false;
  const partnerQuestion = challenge ? (currentPartner === 1 ? challenge.partner2Question : challenge.partner1Question) : false;
  const myMood = challenge ? (currentPartner === 1 ? challenge.partner1Mood : challenge.partner2Mood) : null;
  const partnerMood = challenge ? (currentPartner === 1 ? challenge.partner2Mood : challenge.partner1Mood) : null;

  const requiredPhotos = challenge?.requiredPhotos || 5;
  const totalTasks = (requiredPhotos * 2) + 2 + 2 + 2; // photos x2 + vc x2 + question x2 + mood x2
  const completedTasks =
    Math.min(myPhotos, requiredPhotos) + Math.min(partnerPhotos, requiredPhotos) +
    (myVc ? 1 : 0) + (partnerVc ? 1 : 0) +
    (myQuestion ? 1 : 0) + (partnerQuestion ? 1 : 0) +
    (myMood ? 1 : 0) + (partnerMood ? 1 : 0);
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const streakDays = streak?.currentStreak || 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

        {/* ─── Hero Section ─── */}
        <motion.div variants={itemVariants} className="text-center py-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-muted-foreground mb-4"
          >
            <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
            <span>Day {daysTogether} Together</span>
          </motion.div>

          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
            <span className="gradient-text">Our Space</span>
          </h1>

          {streakDays > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 mt-3"
            >
              <span className="text-3xl fire-glow">🔥</span>
              <span className="font-heading text-2xl font-bold">{streakDays}</span>
              <span className="text-muted-foreground text-sm">Day Streak</span>
            </motion.div>
          )}

          <p className="text-muted-foreground/60 text-sm mt-2 italic">
            "Keep showing up for each other."
          </p>
        </motion.div>

        {/* ─── Today's Challenge Card ─── */}
        <motion.div
          variants={itemVariants}
          className="glass rounded-2xl p-6 glow-primary cursor-pointer hover:border-primary/20 transition-all"
          onClick={() => navigate('/challenge')}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Today's Challenge</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            {/* Overall Progress Ring */}
            <ProgressRing progress={overallProgress} size={100} strokeWidth={8}>
              <div className="text-center">
                <span className="font-heading text-xl font-bold">{overallProgress}%</span>
              </div>
            </ProgressRing>

            <div className="flex-1 space-y-4 min-w-[200px]">
              {/* Photos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Photos</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{myName}</span>
                      <span>{Math.min(myPhotos, requiredPhotos)}/{requiredPhotos}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full gradient-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (myPhotos / requiredPhotos) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{partnerName}</span>
                      <span>{Math.min(partnerPhotos, requiredPhotos)}/{requiredPhotos}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-secondary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (partnerPhotos / requiredPhotos) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* VC */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Daily VC</span>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', myVc ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                    {myName} {myVc ? '✓' : '⏳'}
                  </span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', partnerVc ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                    {partnerName} {partnerVc ? '✓' : '⏳'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {challenge?.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 py-3 rounded-xl gradient-subtle text-center"
            >
              <span className="text-sm font-medium">🎉 Daily Challenge Complete!</span>
            </motion.div>
          )}
        </motion.div>

        {/* ─── Quick Stats Row ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Image, label: 'Photos', value: stats?.totalPhotos || 0, color: 'text-pink-400' },
            { icon: Mic, label: 'Voice Clips', value: stats?.totalVoiceClips || 0, color: 'text-purple-400' },
            { icon: Phone, label: 'Call Hours', value: `${Math.floor((stats?.totalCallDuration || 0) / 3600)}h`, color: 'text-blue-400' },
            { icon: MessageCircle, label: 'Messages', value: stats?.totalMessages || 0, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.color)} />
              <p className="font-heading text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ─── Daily Question ─── */}
        <motion.div
          variants={itemVariants}
          className="glass rounded-2xl p-6 cursor-pointer hover:border-primary/20 transition-all"
          onClick={() => navigate('/challenge')}
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold">Today's Question</h3>
          </div>
          <p className="text-muted-foreground italic">"{todayQuestion}"</p>
          <div className="flex items-center gap-2 mt-3">
            <span className={cn('text-xs px-2 py-0.5 rounded-full', myQuestion ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
              {myName} {myQuestion ? 'answered ✓' : 'not yet'}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', partnerQuestion ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
              {partnerName} {partnerQuestion ? 'answered ✓' : 'not yet'}
            </span>
          </div>
        </motion.div>

        {/* ─── Quick Actions ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Camera, label: 'Upload Photo', path: '/challenge', gradient: 'from-pink-500/20 to-rose-500/20' },
            { icon: Mic, label: 'Record VC', path: '/challenge', gradient: 'from-purple-500/20 to-violet-500/20' },
            { icon: MessageCircle, label: 'Chat', path: '/chat', gradient: 'from-blue-500/20 to-cyan-500/20' },
            { icon: Phone, label: 'Call', path: '/calls', gradient: 'from-green-500/20 to-emerald-500/20' },
          ].map((action) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.path)}
              className={cn('glass rounded-xl p-4 text-center transition-all bg-gradient-to-br', action.gradient)}
            >
              <action.icon className="w-6 h-6 mx-auto mb-2 text-foreground" />
              <p className="text-sm font-medium">{action.label}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* ─── Streak & Level ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="font-heading font-semibold">Streak</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-heading font-bold fire-glow">{streakDays}</span>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-xs text-muted-foreground/60">Longest: {streak?.longestStreak || 0} days</p>
              </div>
            </div>
          </div>

          <div
            className="glass rounded-2xl p-6 cursor-pointer hover:border-primary/20 transition-all"
            onClick={() => navigate('/calendar')}
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">This Month</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-heading font-bold gradient-text">
                {stats?.totalCompletedDays || 0}
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Days Completed</p>
                <p className="text-xs text-muted-foreground/60">
                  {daysTogether} days together
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
