import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, Users, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-background ambient-bg flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher size="sm" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/20"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center max-w-lg relative z-10"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-primary glow-primary-strong mb-8"
            >
              <Heart className="w-10 h-10 text-white fill-white" />
            </motion.div>

            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">{t('welcome.welcomeTo')}</span>
              <br />
              <span className="text-foreground">{t('welcome.yourSpace')}</span>
            </h1>

            <p className="text-muted-foreground text-lg mb-3 max-w-md mx-auto">
              {t('welcome.heroSubtitle')}
            </p>

            <p className="text-muted-foreground/60 text-sm mb-10">
              {t('welcome.heroDescription')}
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep('choice')}
              className="gradient-primary text-white font-semibold px-8 py-4 rounded-2xl text-lg glow-primary-strong inline-flex items-center gap-2 transition-shadow hover:shadow-lg hover:shadow-primary/20"
            >
              {t('welcome.getStarted')}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {step === 'choice' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md relative z-10"
          >
            <h2 className="font-heading text-2xl font-bold text-center mb-8">
              {t('welcome.howToStart')}
            </h2>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setStep('create')}
                className="w-full glass glass-hover rounded-2xl p-6 text-left transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-lg">{t('welcome.createSpaceTitle')}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('welcome.createSpaceDesc')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setStep('join')}
                className="w-full glass glass-hover rounded-2xl p-6 text-left transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-lg">{t('welcome.joinPartnerTitle')}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t('welcome.joinPartnerDesc')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.button>
            </div>

            <button
              onClick={() => setStep('welcome')}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto block"
            >
              ← {t('common.back')}
            </button>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md relative z-10"
          >
            <h2 className="font-heading text-2xl font-bold text-center mb-2">
              {t('welcome.createSpaceHeader')}
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-8">
              {t('welcome.createSpaceSub')}
            </p>

            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('welcome.yourName')}</label>
                <input
                  value={partner1Name}
                  onChange={(e) => setPartner1Name(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('welcome.partnerName')}</label>
                <input
                  value={partner2Name}
                  onChange={(e) => setPartner2Name(e.target.value)}
                  placeholder="e.g. Jordan"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  {t('welcome.coupleNickname')} <span className="text-muted-foreground/50">{t('welcome.optional')}</span>
                </label>
                <input
                  value={coupleNickname}
                  onChange={(e) => setCoupleNickname(e.target.value)}
                  placeholder={partner1Name && partner2Name ? `${partner1Name} & ${partner2Name}` : 'e.g. A & J'}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  {t('welcome.relationshipDate')} <span className="text-muted-foreground/50">{t('welcome.optional')}</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all [color-scheme:dark]"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive text-center"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                disabled={loading}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl text-base glow-primary disabled:opacity-60 transition-all"
              >
                {loading ? t('welcome.creating') : t('welcome.createBtn')}
              </motion.button>
            </div>

            <button
              onClick={() => { setStep('choice'); setError(''); }}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto block"
            >
              ← {t('common.back')}
            </button>
          </motion.div>
        )}

        {step === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md relative z-10"
          >
            <h2 className="font-heading text-2xl font-bold text-center mb-2">
              {t('welcome.joinSpaceHeader')}
            </h2>
            <p className="text-muted-foreground text-center text-sm mb-8">
              {t('welcome.joinSpaceSub')}
            </p>

            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t('welcome.coupleCode')}</label>
                <input
                  value={coupleCode}
                  onChange={(e) => setCoupleCode(e.target.value.toUpperCase())}
                  placeholder="COUPLE-XXXXX"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-center text-lg font-mono tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all uppercase"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-destructive text-center"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoin}
                disabled={loading}
                className="w-full gradient-primary text-white font-semibold py-3.5 rounded-xl text-base glow-primary disabled:opacity-60 transition-all"
              >
                {loading ? t('welcome.joining') : t('welcome.joinBtn')}
              </motion.button>
            </div>

            <button
              onClick={() => { setStep('choice'); setError(''); }}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto block"
            >
              ← {t('common.back')}
            </button>
          </motion.div>
        )}

        {step === 'select-partner' && couple && (
          <motion.div
            key="select-partner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md relative z-10 text-center"
          >
            {createdCode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 mb-6"
              >
                <p className="text-sm text-muted-foreground mb-1">{t('welcome.shareCodePrompt')}</p>
                <p className="font-mono text-2xl font-bold tracking-widest gradient-text">
                  {createdCode}
                </p>
              </motion.div>
            )}

            <h2 className="font-heading text-2xl font-bold mb-2">{t('welcome.whoAreYou')}</h2>
            <p className="text-muted-foreground text-sm mb-8">
              {t('welcome.selectIdentity')}
            </p>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectPartner(1)}
                className="w-full glass glass-hover rounded-2xl p-6 text-center transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-heading font-bold text-white">
                    {couple.partner1Name[0]?.toUpperCase()}
                  </span>
                </div>
                <p className="font-heading font-semibold text-lg">{couple.partner1Name}</p>
                <p className="text-sm text-muted-foreground">{t('welcome.partner1Label')}</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectPartner(2)}
                className="w-full glass glass-hover rounded-2xl p-6 text-center transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-heading font-bold text-secondary">
                    {couple.partner2Name[0]?.toUpperCase()}
                  </span>
                </div>
                <p className="font-heading font-semibold text-lg">{couple.partner2Name}</p>
                <p className="text-sm text-muted-foreground">{t('welcome.partner2Label')}</p>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

