import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Lock,
  Unlock,
  Clock,
  Plus,
  Eye,
  X,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { surpriseApi } from '@/services/api';
import type { Surprise } from '@/types';
import { cn, formatDate } from '@/lib/utils';

export default function Surprises() {
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.partner);

  const [surprises, setSurprises] = useState<Surprise[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected revealed surprise modal
  const [viewingSurprise, setViewingSurprise] = useState<Surprise | null>(null);

  useEffect(() => {
    loadSurprises();
  }, [couple]);

  const loadSurprises = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const res = await surpriseApi.getAll(couple.id);
      if (res.data) setSurprises(res.data);
    } catch (err) {
      console.error('Failed to load surprises:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couple || !partner || !title.trim() || !message.trim() || !unlockAt) return;

    try {
      const res = await surpriseApi.create(couple.id, partner, {
        title: title.trim(),
        message: message.trim(),
        unlockAt,
      });
      if (res.data) {
        setSurprises((prev) => [res.data!, ...prev]);
        setTitle('');
        setMessage('');
        setUnlockAt('');
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Failed to create surprise capsule:', err);
    }
  };

  const handleUnlock = async (id: string) => {
    if (!couple) return;
    try {
      const res = await surpriseApi.unlock(id, couple.id);
      if (res.data) {
        setSurprises((prev) => prev.map((s) => (s.id === id ? res.data! : s)));
        setViewingSurprise(res.data);
      }
    } catch (err) {
      console.error('Failed to unlock surprise:', err);
    }
  };

  const getTimeRemaining = (targetDateStr: string) => {
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (diff <= 0) return { canUnlock: true, text: 'Ready to unlock!' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return { canUnlock: false, text: `${days}d ${hours}h left` };
    if (hours > 0) return { canUnlock: false, text: `${hours}h ${minutes}m left` };
    return { canUnlock: false, text: `${minutes}m left` };
  };

  return (
    <div className="py-6 lg:py-10 space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-pink">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / TIME CAPSULE</p>
            <h1 className="nsha-page-title">Time Capsule Surprises</h1>
            <p className="nsha-page-subtitle">
              Lock secret messages & surprises that only open on a special moment in the future
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="nsha-btn nsha-btn-primary"
        >
          <Plus className="w-4 h-4" />
          Lock a Surprise
        </button>
      </div>

      {/* Create Capsule Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="nsha-card p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between border-b-2 border-nsha-black pb-4">
              <h3 className="text-xl font-heading font-bold text-nsha-black flex items-center gap-2">
                <Lock className="w-5 h-5 text-nsha-pink" />
                Lock a Future Surprise for{' '}
                <span className="text-nsha-pink">
                  {partner === 1 ? couple?.partner2Name : couple?.partner1Name}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-xl border-2 border-nsha-black hover:bg-nsha-yellow transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider mb-1.5">
                  Capsule Title / Hint
                </label>
                <input
                  type="text"
                  placeholder="e.g. Open on our 6-month anniversary! 🎂"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="nsha-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider mb-1.5">
                  Secret Message / Content
                </label>
                <textarea
                  rows={4}
                  placeholder="Write what you want them to see when the clock strikes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="nsha-input resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider mb-1.5">
                  Unlock Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                  className="nsha-input"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="nsha-btn nsha-btn-secondary nsha-btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="nsha-btn nsha-btn-primary nsha-btn-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Seal Time Capsule
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surprises Grid */}
      {surprises.length === 0 ? (
        <div className="nsha-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-nsha-yellow border-2 border-nsha-black shadow-nsha-sm flex items-center justify-center text-nsha-black">
            <Gift className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-heading font-bold text-nsha-black mb-1">No Surprises Locked</h3>
          <p className="text-sm text-nsha-text-secondary max-w-sm mx-auto">
            Lock a sweet digital letter, anniversary promise, or memory to open in the future!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {surprises.map((s) => {
            const { canUnlock, text: timeText } = getTimeRemaining(s.unlockAt);
            const authorName = s.fromPartner === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <motion.div
                key={s.id}
                whileHover={{ y: -3 }}
                className={cn(
                  'nsha-card p-6 flex flex-col justify-between transition-all',
                  s.isUnlocked
                    ? 'bg-[#F2EFFE]'
                    : 'bg-nsha-surface'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 border-nsha-black shadow-nsha-sm',
                        s.isUnlocked
                          ? 'bg-nsha-green text-nsha-black'
                          : 'bg-nsha-pink text-white'
                      )}
                    >
                      {s.isUnlocked ? <Unlock className="w-6 h-6 stroke-[2.5]" /> : <Lock className="w-6 h-6 stroke-[2.5]" />}
                    </div>

                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-lg font-heading font-bold border-2 border-nsha-black flex items-center gap-1.5 shadow-nsha-sm',
                        s.isUnlocked
                          ? 'bg-nsha-green text-nsha-black'
                          : canUnlock
                          ? 'bg-nsha-yellow text-nsha-black animate-bounce'
                          : 'bg-nsha-surface text-nsha-text-secondary'
                      )}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {s.isUnlocked ? 'Unlocked' : timeText}
                    </span>
                  </div>

                  <h3 className="text-lg font-heading font-bold text-nsha-black mb-1">{s.title}</h3>
                  <p className="text-xs text-nsha-text-secondary mb-4">
                    From <span className="font-heading font-bold text-nsha-pink">{authorName}</span>
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-nsha-black/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-nsha-text-secondary">
                    Unlocks: {formatDate(s.unlockAt)}
                  </span>

                  {s.isUnlocked ? (
                    <button
                      onClick={() => setViewingSurprise(s)}
                      className="nsha-btn nsha-btn-purple nsha-btn-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  ) : canUnlock ? (
                    <button
                      onClick={() => handleUnlock(s.id)}
                      className="nsha-btn nsha-btn-primary nsha-btn-sm"
                    >
                      Open Now! 🎁
                    </button>
                  ) : (
                    <span className="text-xs font-heading font-bold text-nsha-text-secondary italic">Locked</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View Opened Capsule Modal */}
      <AnimatePresence>
        {viewingSurprise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingSurprise(null)}
            className="fixed inset-0 z-50 bg-nsha-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] max-w-lg w-full p-8 shadow-nsha space-y-6 text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-nsha-yellow text-nsha-black border-3 border-nsha-black shadow-nsha-sm mx-auto flex items-center justify-center text-3xl">
                🎁
              </div>

              <div>
                <h3 className="text-2xl font-heading font-bold text-nsha-black mb-1">{viewingSurprise.title}</h3>
                <p className="text-xs text-nsha-text-secondary">
                  Written by{' '}
                  <span className="font-heading font-bold text-nsha-pink">
                    {viewingSurprise.fromPartner === 1 ? couple?.partner1Name : couple?.partner2Name}
                  </span>
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#FFF9E6] border-2 border-nsha-black text-left shadow-nsha-sm">
                <p className="text-sm font-body text-nsha-black leading-relaxed whitespace-pre-line">
                  {viewingSurprise.message}
                </p>
              </div>

              <button
                onClick={() => setViewingSurprise(null)}
                className="nsha-btn nsha-btn-primary w-full"
              >
                Close with Love ❤️
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
