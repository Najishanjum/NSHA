import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Heart,
  Copy,
  Check,
  Calendar,
  Clock,
  Shield,
  Snowflake,
  User,
  Users,
  LogOut,
  Save,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { coupleApi, streakApi } from '@/services/api';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Settings() {
  const { t } = useLanguage();
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.currentPartner || s.partner);
  const setCouple = useCoupleStore((s) => s.setCouple);
  const setPartner = useCoupleStore((s) => s.setPartner);
  const logout = useCoupleStore((s) => s.logout);

  const [nickname, setNickname] = useState(couple?.coupleNickname || '');
  const [partner1Name, setPartner1Name] = useState(couple?.partner1Name || '');
  const [partner2Name, setPartner2Name] = useState(couple?.partner2Name || '');
  const [anniversary, setAnniversary] = useState(couple?.relationshipStartDate || '');
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [freezeMessage, setFreezeMessage] = useState<string | null>(null);

  const handleCopyCode = () => {
    if (!couple?.code) return;
    navigator.clipboard.writeText(couple.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couple) return;

    try {
      const res = await coupleApi.update(couple.code, {
        coupleNickname: nickname,
        partner1Name,
        partner2Name,
        relationshipStartDate: anniversary,
      });

      if (res.data) {
        setCouple(res.data);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const handleUseFreeze = async () => {
    if (!couple) return;
    try {
      const res = await streakApi.useFreeze(couple.id);
      if (res.data) {
        setCouple({
          ...couple,
          streakFreezesRemaining: res.data.streakFreezesRemaining,
        });
        setFreezeMessage('Streak freeze activated for today! ❄️');
        setTimeout(() => setFreezeMessage(null), 4000);
      }
    } catch (err: any) {
      setFreezeMessage(err.message || 'Could not use freeze');
      setTimeout(() => setFreezeMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="p-2.5 rounded-2xl bg-slate-800 text-slate-300 border border-white/10">
          <SettingsIcon className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-200 via-rose-300 to-pink-300 bg-clip-text text-transparent">
            {t('settings.title')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      {/* Language Experience Card */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-rose-400" />
            {t('settings.languageSection')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {t('settings.languageDesc')}
          </p>
        </div>

        <LanguageSwitcher size="md" />
      </div>

      {/* Couple Share Code Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border border-rose-500/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
            {t('settings.coupleCode')}
          </span>
          <p className="text-2xl font-mono font-bold text-white mt-1">{couple?.code}</p>
          <p className="text-xs text-slate-400 mt-1">
            {t('welcome.shareCodePrompt')}
          </p>
        </div>

        <button
          onClick={handleCopyCode}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? t('common.copied') : t('settings.copyCode')}
        </button>
      </div>

      {/* Switch Current Persona Card */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-400" />
          {t('settings.switchPartner')}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {t('settings.currentIdentity', { name: partner === 1 ? (couple?.partner1Name || 'Partner 1') : (couple?.partner2Name || 'Partner 2') })}
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setPartner(1)}
            className={`p-4 rounded-2xl border transition-all text-left ${
              partner === 1
                ? 'bg-rose-500/20 border-rose-500/50 text-white ring-2 ring-rose-500/30'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-xs text-rose-400 font-bold block mb-1">Partner 1</span>
            <p className="text-sm font-semibold">{couple?.partner1Name || 'Partner 1'}</p>
          </button>

          <button
            onClick={() => setPartner(2)}
            className={`p-4 rounded-2xl border transition-all text-left ${
              partner === 2
                ? 'bg-rose-500/20 border-rose-500/50 text-white ring-2 ring-rose-500/30'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-xs text-pink-400 font-bold block mb-1">Partner 2</span>
            <p className="text-sm font-semibold">{couple?.partner2Name || 'Partner 2'}</p>
          </button>
        </div>
      </div>

      {/* Streak Freeze Management */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-sky-400" />
              {t('streak.streakFreeze')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('streak.dontBreakStreak')}
            </p>
            <p className="text-sm font-semibold text-sky-300 mt-2">
              {couple?.streakFreezesRemaining ?? 2} Freezes Available
            </p>
          </div>

          <button
            onClick={handleUseFreeze}
            disabled={(couple?.streakFreezesRemaining ?? 0) <= 0}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 font-semibold text-xs disabled:opacity-40 transition-all"
          >
            <Snowflake className="w-4 h-4" />
            {t('streak.useFreeze')}
          </button>
        </div>

        {freezeMessage && (
          <p className="text-xs font-semibold text-sky-400 mt-3">{freezeMessage}</p>
        )}
      </div>

      {/* Profile Form */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          {t('settings.partnerInfo')}
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{t('welcome.coupleNickname')}</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('welcome.yourName')}</label>
              <input
                type="text"
                value={partner1Name}
                onChange={(e) => setPartner1Name(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('welcome.partnerName')}</label>
              <input
                type="text"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              {t('welcome.relationshipDate')}
            </label>
            <input
              type="date"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            {savedMessage ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {t('common.success')}
              </span>
            ) : (
              <div />
            )}

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold shadow-lg shadow-rose-500/20"
            >
              <Save className="w-4 h-4" />
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Exit Couple Space
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Log out from this session on this device. Your data is safely preserved.
          </p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Leave Space
        </button>
      </div>
    </div>
  );
}

