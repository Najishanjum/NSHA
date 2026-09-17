import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Mic,
  Calendar,
  Heart,
  Filter,
  Sparkles,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Clock,
  User,
  Search,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { photoApi, voiceApi, memoryApi } from '@/services/api';
import type { Photo, VoiceClip, DailyMemory } from '@/types';
import { cn, formatDate, formatDuration } from '@/lib/utils';
import { useLanguage } from '@/i18n';

export default function Memories() {
  const { t } = useLanguage();
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.currentPartner || s.partner);

  const [activeTab, setActiveTab] = useState<'photos' | 'voice' | 'on-this-day'>('photos');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [voiceClips, setVoiceClips] = useState<VoiceClip[]>([]);
  const [onThisDayMemories, setOnThisDayMemories] = useState<DailyMemory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPartner, setFilterPartner] = useState<'all' | '1' | '2'>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [searchDate, setSearchDate] = useState('');

  // Selected Photo Lightbox
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Audio Playback
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadData();
  }, [couple]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
      if (e.key === 'ArrowRight' && selectedPhotoIndex < filteredPhotos.length - 1) {
        setSelectedPhotoIndex(selectedPhotoIndex + 1);
        setIsZoomed(false);
      }
      if (e.key === 'ArrowLeft' && selectedPhotoIndex > 0) {
        setSelectedPhotoIndex(selectedPhotoIndex - 1);
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, photos]);

  const loadData = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const [photosRes, voiceRes, onThisDayRes] = await Promise.all([
        photoApi.getAll(couple.id),
        voiceApi.getAll(couple.id),
        memoryApi.getOnThisDay(couple.id).catch(() => ({ data: [] })),
      ]);

      if (photosRes.data) setPhotos(photosRes.data);
      if (voiceRes.data) setVoiceClips(voiceRes.data);
      if (onThisDayRes.data) setOnThisDayMemories(onThisDayRes.data);
    } catch (err) {
      console.error('Failed to load memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!couple) return;
    try {
      const res = await photoApi.toggleFavorite(photo.id, couple.id);
      if (res.data) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, isFavorite: !p.isFavorite } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeletePhoto = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!couple) return;
    if (!window.confirm('Delete this photo memory?')) return;
    try {
      await photoApi.delete(id, couple.id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (selectedPhotoIndex !== null) setSelectedPhotoIndex(null);
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const handlePlayVoice = (clip: VoiceClip) => {
    if (playingClipId === clip.id) {
      audioElement?.pause();
      setPlayingClipId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(clip.fileUrl);
    audio.onended = () => setPlayingClipId(null);
    audio.play();
    setAudioElement(audio);
    setPlayingClipId(clip.id);
  };

  // Filtered lists
  const filteredPhotos = photos.filter((p) => {
    if (filterPartner !== 'all' && p.partner !== Number(filterPartner)) return false;
    if (filterFavorites && !p.isFavorite) return false;
    if (searchDate && !p.date.includes(searchDate)) return false;
    return true;
  });

  const filteredVoiceClips = voiceClips.filter((v) => {
    if (filterPartner !== 'all' && v.partner !== Number(filterPartner)) return false;
    if (searchDate && !v.date.includes(searchDate)) return false;
    return true;
  });

  const currentModalPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Sparkles className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                {t('memories.title')}
              </h1>
              <p className="text-xs text-slate-400">
                {t('memories.momentsWorthKeeping')}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('photos')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all',
              activeTab === 'photos'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <ImageIcon className="w-4 h-4" />
            {t('memories.photosTab')} ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all',
              activeTab === 'voice'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Mic className="w-4 h-4" />
            {t('memories.clipsTab')} ({voiceClips.length})
          </button>
          <button
            onClick={() => setActiveTab('on-this-day')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all',
              activeTab === 'on-this-day'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Clock className="w-4 h-4" />
            {t('memories.memoryOfDay')}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {activeTab !== 'on-this-day' && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>

            {/* Partner filter */}
            <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-white/10 text-xs">
              <button
                onClick={() => setFilterPartner('all')}
                className={cn('px-2.5 py-1 rounded-lg transition-all', filterPartner === 'all' ? 'bg-rose-500 text-white font-medium' : 'text-slate-400')}
              >
                {t('achievements.categoryAll')}
              </button>
              <button
                onClick={() => setFilterPartner('1')}
                className={cn('px-2.5 py-1 rounded-lg transition-all', filterPartner === '1' ? 'bg-rose-500 text-white font-medium' : 'text-slate-400')}
              >
                {couple?.partner1Name || 'Partner 1'}
              </button>
              <button
                onClick={() => setFilterPartner('2')}
                className={cn('px-2.5 py-1 rounded-lg transition-all', filterPartner === '2' ? 'bg-rose-500 text-white font-medium' : 'text-slate-400')}
              >
                {couple?.partner2Name || 'Partner 2'}
              </button>
            </div>

            {/* Favorites toggle */}
            {activeTab === 'photos' && (
              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                  filterFavorites
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                )}
              >
                <Heart className={cn('w-3.5 h-3.5', filterFavorites && 'fill-rose-500 text-rose-500')} />
                {t('memories.favoritesTab')}
              </button>
            )}
          </div>

          {/* Date search */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="text-xs text-rose-400 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Photos Grid */}
      {activeTab === 'photos' && (
        <>
          {filteredPhotos.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ImageIcon className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{t('empty.noPhotos')}</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {t('memories.emptyStateSub')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {filteredPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => {
                    setSelectedPhotoIndex(index);
                    setIsZoomed(false);
                  }}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-950 cursor-pointer shadow-lg hover:border-rose-500/60 transition-all hover:shadow-xl hover:shadow-rose-500/10 flex items-center justify-center p-2"
                >
                  <img
                    src={photo.fileUrl}
                    alt={photo.caption || 'Memory'}
                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/80 text-white font-medium">
                        {photo.partner === 1 ? couple?.partner1Name : couple?.partner2Name}
                      </span>
                      <button
                        onClick={(e) => handleToggleFavorite(photo, e)}
                        className="p-1.5 rounded-full bg-black/80 text-white hover:text-rose-400 transition-colors"
                      >
                        <Heart
                          className={cn('w-3.5 h-3.5', photo.isFavorite && 'fill-rose-500 text-rose-500')}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-semibold flex items-center gap-1 shadow-lg">
                        <Maximize2 className="w-3 h-3" /> View
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-300 truncate">
                      {photo.caption ? photo.caption : photo.date}
                    </div>
                  </div>

                  {photo.isFavorite && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-rose-500 group-hover:hidden">
                      <Heart className="w-3 h-3 fill-rose-500" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Voice Clips */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredVoiceClips.map((clip) => {
            const isPlaying = playingClipId === clip.id;
            const authorName = clip.partner === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <div
                key={clip.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{authorName}</p>
                      <p className="text-[11px] text-slate-400">{clip.date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {formatDuration(clip.duration || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handlePlayVoice(clip)}
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                      isPlaying ? 'bg-pink-500 text-white' : 'bg-white/10 text-white hover:bg-pink-500'
                    )}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <p className="text-xs text-slate-300">
                    {isPlaying ? t('voice.recording') : t('voice.play')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: On This Day */}
      {activeTab === 'on-this-day' && (
        <div className="space-y-4">
          {onThisDayMemories.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {t('memories.emptyStateTitle')}
            </div>
          ) : (
            onThisDayMemories.map((mem) => (
              <div key={mem.date} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <p className="text-sm font-bold text-rose-400 mb-2">{formatDate(mem.date)}</p>
                <p className="text-xs text-slate-300">
                  {mem.photos} {t('home.photos')} • {mem.voiceClips} {t('home.voiceClips')} • {mem.calls} {t('nav.calls')}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {currentModalPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedPhotoIndex(null);
              setIsZoomed(false);
            }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-3 sm:p-6"
          >
            {/* Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex items-center justify-between py-2 px-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl z-20"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {currentModalPhoto.partner === 1 ? couple?.partner1Name : couple?.partner2Name}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {formatDate(currentModalPhoto.date)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                >
                  {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDeletePhoto(currentModalPhoto.id)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedPhotoIndex(null);
                    setIsZoomed(false);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition-all ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Full View Area */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-3 overflow-hidden"
            >
              {selectedPhotoIndex !== null && selectedPhotoIndex > 0 && (
                <button
                  onClick={() => {
                    setSelectedPhotoIndex(selectedPhotoIndex - 1);
                    setIsZoomed(false);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/70 hover:bg-rose-600 text-white backdrop-blur-md transition-all shadow-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {selectedPhotoIndex !== null && selectedPhotoIndex < filteredPhotos.length - 1 && (
                <button
                  onClick={() => {
                    setSelectedPhotoIndex(selectedPhotoIndex + 1);
                    setIsZoomed(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/70 hover:bg-rose-600 text-white backdrop-blur-md transition-all shadow-xl"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={currentModalPhoto.fileUrl}
                  alt={currentModalPhoto.caption || 'Full Memory'}
                  className={cn(
                    'max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl transition-all duration-300',
                    isZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
                  )}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
              </div>
            </div>

            {currentModalPhoto.caption && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl py-2.5 px-4 rounded-xl bg-slate-900/90 border border-white/10 text-center text-sm font-medium text-white shadow-xl"
              >
                "{currentModalPhoto.caption}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

