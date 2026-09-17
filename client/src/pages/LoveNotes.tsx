import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Plus,
  Sparkles,
  Trash2,
  Send,
  Pin,
  Smile,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { loveNoteApi } from '@/services/api';
import type { LoveNote } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { useLanguage } from '@/i18n';

export default function LoveNotes() {
  const { t } = useLanguage();
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.currentPartner || s.partner);

  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, [couple]);

  const loadNotes = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const res = await loveNoteApi.getAll(couple.id);
      if (res.data) setNotes(res.data);
    } catch (err) {
      console.error('Failed to load love notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couple || !partner || !content.trim()) return;

    try {
      const res = await loveNoteApi.create(couple.id, partner, content.trim());
      if (res.data) {
        setNotes((prev) => [res.data!, ...prev]);
        setContent('');
        setIsWriting(false);
      }
    } catch (err) {
      console.error('Failed to send love note:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!couple) return;
    try {
      await loveNoteApi.delete(id, couple.id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete love note:', err);
    }
  };

  const romanticPrompts = [
    'I love the way you...',
    'Thank you for always...',
    'You made my day brighter today because...',
    'My favorite memory of us recently was...',
    'Just a reminder that you are my favorite person ❤️',
  ];

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Heart className="w-6 h-6 fill-rose-500/20" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              {t('loveNotes.title')}
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              {t('loveNotes.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsWriting(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('loveNotes.leaveSpecial')}
        </button>
      </div>

      {/* Write Note Modal / Form */}
      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-3xl bg-slate-950 border border-rose-500/30 shadow-2xl backdrop-blur-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500" />
                {t('loveNotes.subtitle')}
              </h3>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-slate-500 flex-shrink-0">Ideas:</span>
              {romanticPrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setContent(p + ' ')}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] text-slate-300 hover:text-white hover:border-rose-500/40 whitespace-nowrap transition-all"
                >
                  {p}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendNote} className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder={t('loveNotes.writePlaceholder')}
                className="w-full p-4 rounded-2xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500 resize-none font-serif leading-relaxed"
                autoFocus
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t('loveNotes.sendNote')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Notes Grid */}
      {notes.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
            <Heart className="w-8 h-8 opacity-60 fill-rose-500/20" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{t('loveNotes.emptyState')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {notes.map((note, idx) => {
            const authorName = note.partner === 1 ? couple?.partner1Name : couple?.partner2Name;
            const isFromMe = note.partner === partner;

            const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-0'];
            const rotClass = rotations[idx % rotations.length];

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, rotate: 0 }}
                className={cn(
                  'p-6 rounded-3xl border shadow-xl backdrop-blur-xl relative flex flex-col justify-between transition-all group',
                  rotClass,
                  note.partner === 1
                    ? 'bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-pink-950/30 border-rose-500/25'
                    : 'bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-indigo-950/30 border-purple-500/25'
                )}
              >
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-gradient-to-r from-rose-400 to-amber-300 shadow-md" />

                <div className="mt-3 mb-6">
                  <p className="text-sm font-serif italic text-slate-200 leading-relaxed whitespace-pre-line">
                    "{note.content}"
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-rose-400">— {authorName}</span>
                    <p className="text-[10px] text-slate-500">{formatDate(note.createdAt)}</p>
                  </div>

                  {isFromMe && (
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-1"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

