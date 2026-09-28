import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Plus,
  Trash2,
  Send,
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

  const noteAccents = ['bg-nsha-yellow-soft', 'bg-[#FFE0EE]', 'bg-[#E8E0FF]', 'bg-[#E0FFE8]', 'bg-nsha-surface'];

  return (
    <div className="py-6 lg:py-10 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-pink">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / LOVE NOTES</p>
            <h1 className="nsha-page-title">{t('loveNotes.title')}</h1>
            <p className="nsha-page-subtitle">{t('loveNotes.subtitle')}</p>
          </div>
        </div>

        <button
          onClick={() => setIsWriting(true)}
          className="nsha-btn nsha-btn-pink nsha-btn-sm"
        >
          <Plus className="w-4 h-4" />
          {t('loveNotes.leaveSpecial')}
        </button>
      </div>

      {/* Write Note */}
      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="nsha-card p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-nsha-pink" />
              <h3 className="font-heading font-bold text-lg text-nsha-black">{t('loveNotes.subtitle')}</h3>
            </div>

            {/* Prompts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs text-nsha-text-secondary font-semibold flex-shrink-0">Ideas:</span>
              {romanticPrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setContent(p + ' ')}
                  className="px-3 py-1 rounded-xl bg-nsha-surface border-2 border-nsha-black/10 text-[11px] text-nsha-text-secondary hover:text-nsha-black hover:border-nsha-pink/40 whitespace-nowrap transition-all"
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
                className="nsha-input resize-none leading-relaxed"
                autoFocus
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  className="nsha-btn nsha-btn-secondary nsha-btn-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="nsha-btn nsha-btn-pink nsha-btn-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t('loveNotes.sendNote')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="nsha-card">
          <div className="nsha-empty">
            <span className="nsha-empty-icon">💌</span>
            <p className="nsha-empty-title">{t('loveNotes.emptyState')}</p>
            <p className="nsha-empty-text">Your first love note is waiting to be written.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {notes.map((note, idx) => {
            const authorName = note.partner === 1 ? couple?.partner1Name : couple?.partner2Name;
            const isFromMe = note.partner === partner;

            const rotations = ['rotate-1', '-rotate-1', 'rotate-[1.5deg]', '-rotate-[1.5deg]', 'rotate-0'];
            const rotClass = rotations[idx % rotations.length];
            const accentBg = noteAccents[idx % noteAccents.length];

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, rotate: 0 }}
                className={cn(
                  'nsha-card p-6 relative flex flex-col justify-between group',
                  rotClass,
                  accentBg
                )}
              >
                {/* Pin */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-nsha-pink border-2 border-nsha-black shadow-sm" />

                <div className="mt-4 mb-6">
                  <p className="text-sm italic text-nsha-black leading-relaxed whitespace-pre-line">
                    "{note.content}"
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs" style={{ borderTop: '2px solid #090909' }}>
                  <div>
                    <span className="font-heading font-bold text-nsha-pink">— {authorName}</span>
                    <p className="text-[10px] text-nsha-text-secondary">{formatDate(note.createdAt)}</p>
                  </div>

                  {isFromMe && (
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-nsha-text-secondary hover:text-red-500 transition-opacity p-1"
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
