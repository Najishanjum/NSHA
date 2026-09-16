import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Lock,
  Unlock,
  Clock,
  Plus,
  Sparkles,
  Calendar,
  Eye,
  Heart,
  AlertCircle,
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
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
            <Gift className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-fuchsia-400 via-pink-400 to-rose-300 bg-clip-text text-transparent">
              Time Capsule Surprises
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Lock secret messages & surprises that only open on a special moment in the future
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-semibold shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Lock a Surprise
        </button>
      </div>

      {/* Create Capsule Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-3xl bg-slate-950 border border-fuchsia-500/30 shadow-2xl backdrop-blur-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-fuchsia-400" />
              Lock a Future Surprise for{' '}
              <span className="text-fuchsia-400">
                {partner === 1 ? couple?.partner2Name : couple?.partner1Name}
              </span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Capsule Title / Hint</label>
                <input
                  type="text"
                  placeholder="e.g. Open on our 6-month anniversary! 🎂"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-fuchsia-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Secret Message / Content</label>
                <textarea
                  rows={4}
                  placeholder="Write what you want them to see when the clock strikes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-fuchsia-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Unlock Date & Time</label>
                <input
                  type="datetime-local"
                  value={unlockAt}
                  onChange={(e) => setUnlockAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-fuchsia-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-semibold shadow-lg shadow-fuchsia-500/20"
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
        <div className="py-20 text-center rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
            <Gift className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">No Surprises Locked</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Lock a sweet digital letter, anniversary promise, or photo to open in the future!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {surprises.map((s) => {
            const { canUnlock, text: timeText } = getTimeRemaining(s.unlockAt);
            const isAuthor = s.fromPartner === partner;
            const authorName = s.fromPartner === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <motion.div
                key={s.id}
                whileHover={{ y: -3 }}
                className={cn(
                  'p-6 rounded-3xl border backdrop-blur-xl flex flex-col justify-between transition-all shadow-xl',
                  s.isUnlocked
                    ? 'bg-gradient-to-br from-fuchsia-950/20 to-slate-900 border-fuchsia-500/30'
                    : 'bg-white/[0.03] border-white/10'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center text-xl border',
                        s.isUnlocked
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
                      )}
                    >
                      {s.isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>

                    <span
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-medium border flex items-center gap-1.5',
                        s.isUnlocked
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : canUnlock
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          : 'bg-slate-900 border-white/10 text-slate-400'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {s.isUnlocked ? 'Unlocked' : timeText}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    From <span className="text-fuchsia-400 font-medium">{authorName}</span>
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Unlocks: {formatDate(s.unlockAt)}
                  </span>

                  {s.isUnlocked ? (
                    <button
                      onClick={() => setViewingSurprise(s)}
                      className="text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Capsule
                    </button>
                  ) : canUnlock ? (
                    <button
                      onClick={() => handleUnlock(s.id)}
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-semibold shadow-md shadow-fuchsia-500/30"
                    >
                      Open Now! 🎁
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Locked</span>
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950 border border-fuchsia-500/40 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-5 text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-3xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 mx-auto flex items-center justify-center text-2xl">
                🎁
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{viewingSurprise.title}</h3>
                <p className="text-xs text-slate-400">
                  Written by{' '}
                  <span className="text-fuchsia-400 font-semibold">
                    {viewingSurprise.fromPartner === 1 ? couple?.partner1Name : couple?.partner2Name}
                  </span>
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-left">
                <p className="text-sm font-serif italic text-slate-200 leading-relaxed whitespace-pre-line">
                  {viewingSurprise.message}
                </p>
              </div>

              <button
                onClick={() => setViewingSurprise(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-fuchsia-500/25"
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
