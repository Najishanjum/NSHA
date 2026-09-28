import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Flame,
  Camera,
  Mic,
  Phone,
  Calendar,
  ChevronRight,
  Sparkles,
  Image,
  BookHeart,
  Target,
  ArrowRight,
} from 'lucide-react';
import { cn, getDaysBetween, getDateString } from '@/lib/utils';
import { useCoupleStore } from '@/stores';
import { useNavigate } from 'react-router-dom';
import { challengeApi, streakApi, statsApi } from '@/services/api';
import type { DailyChallenge, StreakData, CoupleStatistics } from '@/types';
import { DAILY_QUESTIONS } from '@/types';
import { useLanguage } from '@/i18n';

export default function Home() {
  const { t } = useLanguage();
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

  const myPhotos = challenge ? (currentPartner === 1 ? challenge.partner1Photos : challenge.partner2Photos) : 0;
  const partnerPhotos = challenge ? (currentPartner === 1 ? challenge.partner2Photos : challenge.partner1Photos) : 0;
  const myVc = challenge ? (currentPartner === 1 ? challenge.partner1Vc : challenge.partner2Vc) : false;
  const partnerVc = challenge ? (currentPartner === 1 ? challenge.partner2Vc : challenge.partner1Vc) : false;
  const myQuestion = challenge ? (currentPartner === 1 ? challenge.partner1Question : challenge.partner2Question) : false;
  const partnerQuestion = challenge ? (currentPartner === 1 ? challenge.partner2Question : challenge.partner1Question) : false;
  const myMood = challenge ? (currentPartner === 1 ? challenge.partner1Mood : challenge.partner2Mood) : null;
  const partnerMood = challenge ? (currentPartner === 1 ? challenge.partner2Mood : challenge.partner1Mood) : null;

  const requiredPhotos = challenge?.requiredPhotos || 5;
  const totalTasks = (requiredPhotos * 2) + 2 + 2 + 2;
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
    <div className="py-6 lg:py-10">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">

        {/* ─── Hero Section ─── */}
        <motion.div
          variants={itemVariants}
          className="nsha-section-yellow rounded-[24px] p-8 md:p-10 relative overflow-hidden"
          style={{ border: '3px solid #090909', boxShadow: '7px 7px 0 #090909' }}
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-nsha-pink/15 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-32 h-32 rounded-full bg-nsha-purple/10 translate-y-1/2 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="nsha-badge nsha-badge-outline mb-4">
                <Heart className="w-3.5 h-3.5" />
                {t('home.dayTogether', { days: daysTogether })}
              </div>

              <h1 className="font-heading font-bold text-4xl md:text-5xl text-nsha-black mb-3 tracking-tight">
                {t('home.ourSpace')}
              </h1>

              {streakDays > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🔥</span>
                  <span className="font-heading text-2xl font-bold text-nsha-black">{streakDays}</span>
                  <span className="text-nsha-text-secondary text-sm font-semibold">{t('home.dayStreak')}</span>
                </div>
              )}

              <p className="text-nsha-text-secondary text-sm italic max-w-md">
                {t('home.quote')}
              </p>
            </div>

            <button
              onClick={() => navigate('/challenge')}
              className="nsha-btn nsha-btn-black whitespace-nowrap"
            >
              Start today's challenge
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* ─── Quick Stats Row ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Image, label: t('home.photos'), value: stats?.totalPhotos || 0, color: 'bg-nsha-pink', textColor: 'text-white' },
            { icon: Mic, label: t('home.voiceClips'), value: stats?.totalVoiceClips || 0, color: 'bg-nsha-purple', textColor: 'text-white' },
            { icon: Phone, label: t('home.callHours'), value: `${Math.floor((stats?.totalCallDuration || 0) / 3600)}h`, color: 'bg-nsha-green', textColor: 'text-nsha-black' },
            { icon: Flame, label: t('home.streakTag'), value: streakDays, color: 'bg-nsha-yellow', textColor: 'text-nsha-black' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="nsha-card-sm p-5"
            >
              <div className={cn('nsha-icon-box-sm mb-3', stat.color, stat.textColor)} style={{ borderWidth: '2px', borderColor: '#090909' }}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="font-heading text-2xl font-bold text-nsha-black">{stat.value}</p>
              <p className="text-xs text-nsha-text-secondary font-semibold mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Today's Challenge Card ─── */}
        <motion.div
          variants={itemVariants}
          className="nsha-card p-6 md:p-8 cursor-pointer"
          onClick={() => navigate('/challenge')}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="nsha-icon-box">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-heading font-bold text-xl text-nsha-black">{t('home.todayChallenge')}</h2>
            </div>
            <ChevronRight className="w-5 h-5 text-nsha-text-secondary" />
          </div>

          {/* Progress */}
          <div className="flex items-center gap-6 flex-wrap mb-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-nsha-yellow border-3 border-nsha-black flex items-center justify-center" style={{ borderWidth: '3px' }}>
                <span className="font-heading text-2xl font-bold text-nsha-black">{overallProgress}%</span>
              </div>
              <p className="text-xs text-nsha-text-secondary mt-1 font-semibold">Complete</p>
            </div>

            <div className="flex-1 space-y-4 min-w-[200px]">
              {/* Photos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-nsha-pink" />
                  <span className="text-sm font-heading font-semibold text-nsha-black">{t('home.photos')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-xs text-nsha-text-secondary mb-1 font-semibold">
                      <span>{myName}</span>
                      <span>{Math.min(myPhotos, requiredPhotos)}/{requiredPhotos}</span>
                    </div>
                    <div className="nsha-progress">
                      <motion.div
                        className="nsha-progress-fill bg-nsha-pink"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (myPhotos / requiredPhotos) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-nsha-text-secondary mb-1 font-semibold">
                      <span>{partnerName}</span>
                      <span>{Math.min(partnerPhotos, requiredPhotos)}/{requiredPhotos}</span>
                    </div>
                    <div className="nsha-progress">
                      <motion.div
                        className="nsha-progress-fill bg-nsha-purple"
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
                  <Mic className="w-4 h-4 text-nsha-purple" />
                  <span className="text-sm font-heading font-semibold text-nsha-black">{t('home.dailyVc')}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className={cn('nsha-badge text-[10px]', myVc ? 'nsha-badge-green' : 'nsha-badge-outline')}>
                    {myName} {myVc ? '✓' : '⏳'}
                  </span>
                  <span className={cn('nsha-badge text-[10px]', partnerVc ? 'nsha-badge-green' : 'nsha-badge-outline')}>
                    {partnerName} {partnerVc ? '✓' : '⏳'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {challenge?.status === 'completed' && (
            <div className="py-3 rounded-xl bg-nsha-green/20 text-center" style={{ border: '2px solid #090909' }}>
              <span className="text-sm font-heading font-bold text-nsha-black">{t('home.challengeCompleteHeader')}</span>
            </div>
          )}
        </motion.div>

        {/* ─── Daily Question ─── */}
        <motion.div
          variants={itemVariants}
          className="nsha-card p-6 cursor-pointer"
          onClick={() => navigate('/challenge')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="nsha-icon-box nsha-icon-box-pink">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-heading font-bold text-lg text-nsha-black">{t('home.todayQuestion')}</h3>
          </div>
          <p className="text-nsha-text-secondary italic text-lg leading-relaxed">"{todayQuestion}"</p>
          <div className="flex items-center gap-2 mt-4">
            <span className={cn('nsha-badge text-[10px]', myQuestion ? 'nsha-badge-green' : 'nsha-badge-outline')}>
              {myName} {myQuestion ? t('home.answered') : t('home.notYet')}
            </span>
            <span className={cn('nsha-badge text-[10px]', partnerQuestion ? 'nsha-badge-green' : 'nsha-badge-outline')}>
              {partnerName} {partnerQuestion ? t('home.answered') : t('home.notYet')}
            </span>
          </div>
        </motion.div>

        {/* ─── Quick Actions ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
          {[
            { icon: Camera, label: t('home.uploadPhotoAction'), path: '/challenge', bg: 'bg-nsha-pink', iconColor: 'text-white' },
            { icon: Mic, label: t('home.recordVcAction'), path: '/challenge', bg: 'bg-nsha-purple', iconColor: 'text-white' },
            { icon: BookHeart, label: t('nav.loveNotes'), path: '/love-notes', bg: 'bg-nsha-green', iconColor: 'text-nsha-black' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="nsha-card-sm p-5 text-center cursor-pointer"
            >
              <div
                className={cn('w-12 h-12 rounded-xl border-2 border-nsha-black flex items-center justify-center mx-auto mb-3', action.bg)}
              >
                <action.icon className={cn('w-5 h-5', action.iconColor)} />
              </div>
              <p className="text-sm font-heading font-semibold text-nsha-black">{action.label}</p>
            </button>
          ))}
        </motion.div>

        {/* ─── Streak & Calendar Bottom Row ─── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="nsha-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="nsha-icon-box" style={{ background: '#FFE28A' }}>
                <Flame className="w-5 h-5 text-nsha-black" />
              </div>
              <h3 className="font-heading font-bold text-lg text-nsha-black">{t('home.streakTag')}</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-heading text-5xl font-bold text-nsha-pink">{streakDays}</span>
              <div>
                <p className="text-sm text-nsha-text-secondary font-semibold">{t('streak.currentStreak')}</p>
                <p className="text-xs text-nsha-text-secondary">{t('streak.longestStreak')}: {streak?.longestStreak || 0} days</p>
              </div>
            </div>
          </div>

          <div
            className="nsha-card p-6 cursor-pointer"
            onClick={() => navigate('/calendar')}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="nsha-icon-box nsha-icon-box-purple">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg text-nsha-black">{t('home.thisMonth')}</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-heading text-5xl font-bold text-nsha-purple">
                {stats?.totalCompletedDays || 0}
              </span>
              <div>
                <p className="text-sm text-nsha-text-secondary font-semibold">{t('home.daysCompleted')}</p>
                <p className="text-xs text-nsha-text-secondary">
                  {t('home.daysTogetherText', { days: daysTogether })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
