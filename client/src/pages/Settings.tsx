import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Heart,
  Copy,
  Check,
  Snowflake,
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
    <div className="py-6 lg:py-10 space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="nsha-page-header">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / SETTINGS</p>
            <h1 className="nsha-page-title">{t('settings.title')}</h1>
          </div>
        </div>
        <p className="nsha-page-subtitle mt-2">{t('settings.subtitle')}</p>
      </div>

      {/* Language */}
      <div className="nsha-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-base text-nsha-black flex items-center gap-2">
            <Globe className="w-5 h-5 text-nsha-purple" />
            {t('settings.languageSection')}
          </h3>
          <p className="text-xs text-nsha-text-secondary mt-1">
            {t('settings.languageDesc')}
          </p>
        </div>
        <LanguageSwitcher size="md" />
      </div>

      {/* Couple Code */}
      <div className="nsha-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: '#FFD21C' }}>
        <div>
          <span className="nsha-badge nsha-badge-outline text-[10px] mb-2 inline-flex">
            {t('settings.coupleCode')}
          </span>
          <p className="font-mono text-2xl font-bold text-nsha-black mt-1">{couple?.code}</p>
          <p className="text-xs text-nsha-text-secondary mt-1">
            {t('welcome.shareCodePrompt')}
          </p>
        </div>

        <button
          onClick={handleCopyCode}
          className="nsha-btn nsha-btn-black nsha-btn-sm"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t('common.copied') : t('settings.copyCode')}
        </button>
      </div>

      {/* Switch Partner */}
      <div className="nsha-card p-6">
        <h3 className="font-heading font-bold text-base text-nsha-black mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-nsha-pink" />
          {t('settings.switchPartner')}
        </h3>
        <p className="text-xs text-nsha-text-secondary mb-4">
          {t('settings.currentIdentity', { name: partner === 1 ? (couple?.partner1Name || 'Partner 1') : (couple?.partner2Name || 'Partner 2') })}
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            onClick={() => setPartner(1)}
            className={`p-4 rounded-xl text-left transition-all ${
              partner === 1
                ? 'bg-nsha-pink text-white border-3 border-nsha-black shadow-[3px_3px_0_#090909]'
                : 'bg-nsha-surface border-2 border-nsha-black text-nsha-text-secondary hover:bg-nsha-yellow/20'
            }`}
            style={{ borderWidth: partner === 1 ? '3px' : '2px' }}
          >
            <span className="text-xs font-heading font-bold block mb-1">Partner 1</span>
            <p className="text-sm font-heading font-semibold">{couple?.partner1Name || 'Partner 1'}</p>
          </button>

          <button
            onClick={() => setPartner(2)}
            className={`p-4 rounded-xl text-left transition-all ${
              partner === 2
                ? 'bg-nsha-purple text-white border-3 border-nsha-black shadow-[3px_3px_0_#090909]'
                : 'bg-nsha-surface border-2 border-nsha-black text-nsha-text-secondary hover:bg-nsha-yellow/20'
            }`}
            style={{ borderWidth: partner === 2 ? '3px' : '2px' }}
          >
            <span className="text-xs font-heading font-bold block mb-1">Partner 2</span>
            <p className="text-sm font-heading font-semibold">{couple?.partner2Name || 'Partner 2'}</p>
          </button>
        </div>
      </div>

      {/* Streak Freeze */}
      <div className="nsha-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-base text-nsha-black flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-nsha-purple" />
              {t('streak.streakFreeze')}
            </h3>
            <p className="text-xs text-nsha-text-secondary mt-1">
              {t('streak.dontBreakStreak')}
            </p>
            <p className="text-sm font-heading font-bold text-nsha-purple mt-2">
              {couple?.streakFreezesRemaining ?? 2} Freezes Available
            </p>
          </div>

          <button
            onClick={handleUseFreeze}
            disabled={(couple?.streakFreezesRemaining ?? 0) <= 0}
            className="nsha-btn nsha-btn-purple nsha-btn-sm"
          >
            <Snowflake className="w-4 h-4" />
            {t('streak.useFreeze')}
          </button>
        </div>

        {freezeMessage && (
          <p className="text-xs font-heading font-semibold text-nsha-purple mt-3">{freezeMessage}</p>
        )}
      </div>

      {/* Profile Form */}
      <div className="nsha-card p-6">
        <h3 className="font-heading font-bold text-base text-nsha-black mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-nsha-pink" />
          {t('settings.partnerInfo')}
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold text-nsha-text-secondary mb-1.5">{t('welcome.coupleNickname')}</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="nsha-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-bold text-nsha-text-secondary mb-1.5">{t('welcome.yourName')}</label>
              <input
                type="text"
                value={partner1Name}
                onChange={(e) => setPartner1Name(e.target.value)}
                className="nsha-input"
              />
            </div>
            <div>
              <label className="block text-xs font-heading font-bold text-nsha-text-secondary mb-1.5">{t('welcome.partnerName')}</label>
              <input
                type="text"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
                className="nsha-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-heading font-bold text-nsha-text-secondary mb-1.5">
              {t('welcome.relationshipDate')}
            </label>
            <input
              type="date"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
              className="nsha-input"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            {savedMessage ? (
              <span className="text-xs text-nsha-green font-heading font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {t('common.success')}
              </span>
            ) : (
              <div />
            )}

            <button
              type="submit"
              className="nsha-btn nsha-btn-primary nsha-btn-sm"
            >
              <Save className="w-4 h-4" />
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="nsha-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: '#FFF0F0', borderColor: '#EF4444' }}>
        <div>
          <h4 className="font-heading font-bold text-sm text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Exit Couple Space
          </h4>
          <p className="text-xs text-nsha-text-secondary mt-1">
            Log out from this session on this device. Your data is safely preserved.
          </p>
        </div>

        <button
          onClick={logout}
          className="nsha-btn nsha-btn-sm"
          style={{ background: '#EF4444', color: '#fff', borderColor: '#090909' }}
        >
          <LogOut className="w-4 h-4" />
          Leave Space
        </button>
      </div>
    </div>
  );
}
