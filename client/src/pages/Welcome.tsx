import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, Users, Sparkles, Star, Camera, MessageCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCoupleStore } from '@/stores';
import { coupleApi } from '@/services/api';
import { useLanguage } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { PartnerNumber } from '@/types';

type Step = 'welcome' | 'choice' | 'create' | 'join' | 'select-partner';

export default function Welcome() {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('welcome');
  const [coupleCode, setCoupleCode] = useState('');
  const [partner1Name, setPartner1Name] = useState('');
  const [partner2Name, setPartner2Name] = useState('');
  const [coupleNickname, setCoupleNickname] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const navigate = useNavigate();
  const { setCouple, setCurrentPartner, setJoined } = useCoupleStore();

  const handleCreate = async () => {
    if (!partner1Name.trim() || !partner2Name.trim()) {
      setError(t('welcome.bothNamesNeeded'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await coupleApi.create({
        partner1Name: partner1Name.trim(),
        partner2Name: partner2Name.trim(),
        coupleNickname: coupleNickname.trim() || `${partner1Name.trim()} & ${partner2Name.trim()}`,
        relationshipStartDate: startDate || new Date().toISOString().split('T')[0],
      });
      if (res.success && res.data) {
        setCouple(res.data);
        setCreatedCode(res.data.code);
        setStep('select-partner');
      }
    } catch (e: any) {
      setError(e.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!coupleCode.trim()) {
      setError(t('welcome.enterCodeNeeded'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await coupleApi.get(coupleCode.trim().toUpperCase());
      if (res.success && res.data) {
        setCouple(res.data);
        setStep('select-partner');
      }
    } catch (e: any) {
      setError(e.message || t('welcome.codeNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPartner = (partner: PartnerNumber) => {
    setCurrentPartner(partner);
    setJoined(true);
    navigate('/');
  };

  const couple = useCoupleStore((s) => s.couple);

  return (
    <div className="min-h-screen bg-nsha-surface flex flex-col relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher size="sm" />
      </div>

      {/* Decorative shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-nsha-yellow/30" />
        <div className="absolute top-1/3 -left-16 w-48 h-48 rounded-full bg-nsha-pink/15" />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-nsha-purple/10" />
        <div className="absolute bottom-40 left-1/4 w-24 h-24 rounded-full bg-nsha-green/10" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 px-6 py-12 lg:py-0 relative z-10 max-w-[1280px] mx-auto w-full"
          >
            {/* Left: Hero Text */}
            <div className="flex-1 max-w-xl text-center lg:text-left">
              <div className="nsha-badge mb-6 inline-flex">
                <Star className="w-3.5 h-3.5" />
                NSHA / YOUR SHARED SPACE
              </div>

              <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl text-nsha-black mb-6 leading-[1.05] tracking-tight">
                {t('welcome.welcomeTo')}
                <br />
                <span className="text-nsha-pink">{t('welcome.yourSpace')}</span>
              </h1>

              <p className="text-nsha-text-secondary text-lg md:text-xl mb-3 max-w-md mx-auto lg:mx-0">
                {t('welcome.heroSubtitle')}
              </p>

              <p className="text-nsha-text-secondary/70 text-sm mb-10 max-w-sm mx-auto lg:mx-0">
                {t('welcome.heroDescription')}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={() => setStep('choice')}
                  className="nsha-btn nsha-btn-primary text-base px-8 py-4"
                >
                  {t('welcome.getStarted')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right: Feature Cards Stack */}
            <div className="flex-1 max-w-md w-full relative hidden md:block">
              <div className="relative" style={{ height: '420px' }}>
                {/* Card 1: Challenge */}
                <motion.div
                  initial={{ opacity: 0, y: 20, rotate: -3 }}
                  animate={{ opacity: 1, y: 0, rotate: -3 }}
                  transition={{ delay: 0.2 }}
                  className="nsha-card absolute top-0 left-4 right-8 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="nsha-icon-box-sm nsha-icon-box">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="font-heading font-bold text-sm">Today's Challenge</span>
                  </div>
                  <p className="text-nsha-text-secondary text-sm">
                    "Share something you've never told each other before"
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="nsha-badge nsha-badge-green text-[10px]">Day 27</span>
                    <span className="nsha-badge text-[10px]">🔥 Active</span>
                  </div>
                </motion.div>

                {/* Card 2: Memory */}
                <motion.div
                  initial={{ opacity: 0, y: 20, rotate: 2 }}
                  animate={{ opacity: 1, y: 0, rotate: 2 }}
                  transition={{ delay: 0.4 }}
                  className="nsha-card absolute top-36 left-8 right-4 p-6"
                  style={{ background: '#FFE28A' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="nsha-icon-box-sm nsha-icon-box-pink">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="font-heading font-bold text-sm">Latest Memory</span>
                  </div>
                  <p className="text-nsha-text-secondary text-sm">
                    12 photos shared today
                  </p>
                  <div className="flex -space-x-2 mt-3">
                    {['📸', '🌅', '☕', '🎵'].map((e, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-nsha-surface border-2 border-nsha-black flex items-center justify-center text-sm">
                        {e}
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Card 3: Chat */}
                <motion.div
                  initial={{ opacity: 0, y: 20, rotate: -1 }}
                  animate={{ opacity: 1, y: 0, rotate: -1 }}
                  transition={{ delay: 0.6 }}
                  className="nsha-card absolute top-72 left-0 right-12 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="nsha-icon-box-sm nsha-icon-box-purple">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="font-heading font-bold text-sm">Messages</span>
                  </div>
                  <p className="text-nsha-text-secondary text-sm">
                    Your private conversation space
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'choice' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex items-center justify-center px-6 py-12 relative z-10"
          >
            <div className="w-full max-w-md">
              <h2 className="font-heading text-3xl font-bold text-center mb-8 text-nsha-black">
                {t('welcome.howToStart')}
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => setStep('create')}
                  className="w-full nsha-card p-6 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="nsha-icon-box">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-heading font-bold text-lg text-nsha-black">{t('welcome.createSpaceTitle')}</p>
                      <p className="text-sm text-nsha-text-secondary mt-0.5">
                        {t('welcome.createSpaceDesc')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-nsha-text-secondary group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => setStep('join')}
                  className="w-full nsha-card p-6 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="nsha-icon-box nsha-icon-box-purple">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-heading font-bold text-lg text-nsha-black">{t('welcome.joinPartnerTitle')}</p>
                      <p className="text-sm text-nsha-text-secondary mt-0.5">
                        {t('welcome.joinPartnerDesc')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-nsha-text-secondary group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep('welcome')}
                className="mt-6 text-sm font-heading font-semibold text-nsha-text-secondary hover:text-nsha-black transition-colors mx-auto block"
              >
                ← {t('common.back')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex items-center justify-center px-6 py-12 relative z-10"
          >
            <div className="w-full max-w-md">
              <h2 className="font-heading text-3xl font-bold text-center mb-2 text-nsha-black">
                {t('welcome.createSpaceHeader')}
              </h2>
              <p className="text-nsha-text-secondary text-center text-sm mb-8">
                {t('welcome.createSpaceSub')}
              </p>

              <div className="nsha-card p-6 space-y-4">
                <div>
                  <label className="text-sm font-heading font-semibold text-nsha-text mb-1.5 block">{t('welcome.yourName')}</label>
                  <input
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    placeholder="e.g. Alex"
                    className="nsha-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-heading font-semibold text-nsha-text mb-1.5 block">{t('welcome.partnerName')}</label>
                  <input
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    placeholder="e.g. Jordan"
                    className="nsha-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-heading font-semibold text-nsha-text mb-1.5 block">
                    {t('welcome.coupleNickname')} <span className="text-nsha-text-secondary font-normal">{t('welcome.optional')}</span>
                  </label>
                  <input
                    value={coupleNickname}
                    onChange={(e) => setCoupleNickname(e.target.value)}
                    placeholder={partner1Name && partner2Name ? `${partner1Name} & ${partner2Name}` : 'e.g. A & J'}
                    className="nsha-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-heading font-semibold text-nsha-text mb-1.5 block">
                    {t('welcome.relationshipDate')} <span className="text-nsha-text-secondary font-normal">{t('welcome.optional')}</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="nsha-input"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 font-semibold text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full nsha-btn nsha-btn-primary text-base py-3.5"
                >
                  {loading ? t('welcome.creating') : t('welcome.createBtn')}
                </button>
              </div>

              <button
                onClick={() => { setStep('choice'); setError(''); }}
                className="mt-6 text-sm font-heading font-semibold text-nsha-text-secondary hover:text-nsha-black transition-colors mx-auto block"
              >
                ← {t('common.back')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex items-center justify-center px-6 py-12 relative z-10"
          >
            <div className="w-full max-w-md">
              <h2 className="font-heading text-3xl font-bold text-center mb-2 text-nsha-black">
                {t('welcome.joinSpaceHeader')}
              </h2>
              <p className="text-nsha-text-secondary text-center text-sm mb-8">
                {t('welcome.joinSpaceSub')}
              </p>

              <div className="nsha-card p-6 space-y-4">
                <div>
                  <label className="text-sm font-heading font-semibold text-nsha-text mb-1.5 block">{t('welcome.coupleCode')}</label>
                  <input
                    value={coupleCode}
                    onChange={(e) => setCoupleCode(e.target.value.toUpperCase())}
                    placeholder="COUPLE-XXXXX"
                    className="nsha-input text-center text-lg font-mono tracking-wider uppercase"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 font-semibold text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full nsha-btn nsha-btn-primary text-base py-3.5"
                >
                  {loading ? t('welcome.joining') : t('welcome.joinBtn')}
                </button>
              </div>

              <button
                onClick={() => { setStep('choice'); setError(''); }}
                className="mt-6 text-sm font-heading font-semibold text-nsha-text-secondary hover:text-nsha-black transition-colors mx-auto block"
              >
                ← {t('common.back')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'select-partner' && couple && (
          <motion.div
            key="select-partner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex items-center justify-center px-6 py-12 relative z-10"
          >
            <div className="w-full max-w-md text-center">
              {createdCode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="nsha-card p-5 mb-8 bg-nsha-yellow"
                >
                  <p className="text-sm text-nsha-text-secondary mb-1">{t('welcome.shareCodePrompt')}</p>
                  <p className="font-mono text-2xl font-bold tracking-widest text-nsha-black">
                    {createdCode}
                  </p>
                </motion.div>
              )}

              <h2 className="font-heading text-3xl font-bold mb-2 text-nsha-black">{t('welcome.whoAreYou')}</h2>
              <p className="text-nsha-text-secondary text-sm mb-8">
                {t('welcome.selectIdentity')}
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => handleSelectPartner(1)}
                  className="w-full nsha-card p-6 text-center cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-nsha-pink border-3 border-nsha-black flex items-center justify-center mx-auto mb-3" style={{ borderWidth: '3px' }}>
                    <span className="text-2xl font-heading font-bold text-white">
                      {couple.partner1Name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-heading font-bold text-lg text-nsha-black">{couple.partner1Name}</p>
                  <p className="text-sm text-nsha-text-secondary">{t('welcome.partner1Label')}</p>
                </button>

                <button
                  onClick={() => handleSelectPartner(2)}
                  className="w-full nsha-card p-6 text-center cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-2xl bg-nsha-purple border-3 border-nsha-black flex items-center justify-center mx-auto mb-3" style={{ borderWidth: '3px' }}>
                    <span className="text-2xl font-heading font-bold text-white">
                      {couple.partner2Name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-heading font-bold text-lg text-nsha-black">{couple.partner2Name}</p>
                  <p className="text-sm text-nsha-text-secondary">{t('welcome.partner2Label')}</p>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
