import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Mic,
  Heart,
  Filter,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Clock,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Music,
  Film,
  Plus,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { useMusicStore } from '@/stores/musicStore';
import { photoApi, voiceApi, memoryApi } from '@/services/api';
import type { Photo, VoiceClip, DailyMemory, MusicTrack } from '@/types';
import { cn, formatDate, formatDuration } from '@/lib/utils';
import { useLanguage } from '@/i18n';

export default function Memories() {
  const { t } = useLanguage();
  const couple = useCoupleStore((s) => s.couple);

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

  // Music Integration
  const {
    tracks,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    attachTrackToMemory,
    getMemoryTrack,
  } = useMusicStore();

  const [showSoundtrackPicker, setShowSoundtrackPicker] = useState(false);

  // 🎞️ Cinematic Memory Mode Slideshow
  const [isMemoryMode, setIsMemoryMode] = useState(false);
  const [memoryModeIndex, setMemoryModeIndex] = useState(0);
  const [memoryModePlaying, setMemoryModePlaying] = useState(true);

  // Audio Playback for voice clips
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadData();
  }, [couple]);

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

  // Slideshow timer for 🎞️ Memory Mode
  useEffect(() => {
    if (!isMemoryMode || !memoryModePlaying || filteredPhotos.length === 0) return;
    const interval = setInterval(() => {
      setMemoryModeIndex((prev) => (prev + 1 < filteredPhotos.length ? prev + 1 : 0));
    }, 4500);
    return () => clearInterval(interval);
  }, [isMemoryMode, memoryModePlaying, filteredPhotos.length]);

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
  }, [selectedPhotoIndex, photos, filteredPhotos.length]);

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

  const currentModalPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;
  const currentSoundtrack = currentModalPhoto ? getMemoryTrack(currentModalPhoto.id) || getMemoryTrack(currentModalPhoto.date) : undefined;

  // Start 🎞️ Cinematic Memory Mode
  const startCinematicMemory = () => {
    if (filteredPhotos.length === 0) return;
    setIsMemoryMode(true);
    setMemoryModeIndex(0);
    setMemoryModePlaying(true);

    // If memory has a soundtrack or we have tracks, start music
    const firstPhoto = filteredPhotos[0];
    const sTrack = firstPhoto ? getMemoryTrack(firstPhoto.id) || getMemoryTrack(firstPhoto.date) || tracks[0] : tracks[0];
    if (sTrack) {
      playTrack(sTrack);
    }
  };

  return (
    <div className="py-6 lg:py-10 space-y-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-pink">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / ARCHIVE</p>
            <h1 className="nsha-page-title">{t('memories.title')}</h1>
            <p className="nsha-page-subtitle">{t('memories.momentsWorthKeeping')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {filteredPhotos.length > 0 && (
            <button
              onClick={startCinematicMemory}
              className="nsha-btn nsha-btn-primary nsha-btn-sm"
            >
              <Film className="w-4 h-4" />
              {t('music.memoryMode')}
            </button>
          )}

          {/* Tab switcher */}
          <div className="flex p-1.5 bg-nsha-surface border-3 border-nsha-black rounded-2xl shadow-nsha-sm shrink-0 gap-1.5">
            <button
              onClick={() => setActiveTab('photos')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-heading font-bold transition-all',
                activeTab === 'photos'
                  ? 'bg-nsha-yellow text-nsha-black border-2 border-nsha-black shadow-[2px_2px_0_#090909]'
                  : 'text-nsha-text-secondary hover:text-nsha-black'
              )}
            >
              <ImageIcon className="w-4 h-4" />
              {t('memories.photosTab')} ({photos.length})
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-heading font-bold transition-all',
                activeTab === 'voice'
                  ? 'bg-nsha-yellow text-nsha-black border-2 border-nsha-black shadow-[2px_2px_0_#090909]'
                  : 'text-nsha-text-secondary hover:text-nsha-black'
              )}
            >
              <Mic className="w-4 h-4" />
              {t('memories.clipsTab')} ({voiceClips.length})
            </button>
            <button
              onClick={() => setActiveTab('on-this-day')}
              className={cn(
                'flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-heading font-bold transition-all',
                activeTab === 'on-this-day'
                  ? 'bg-nsha-yellow text-nsha-black border-2 border-nsha-black shadow-[2px_2px_0_#090909]'
                  : 'text-nsha-text-secondary hover:text-nsha-black'
              )}
            >
              <Clock className="w-4 h-4" />
              {t('memories.memoryOfDay')}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {activeTab !== 'on-this-day' && (
        <div className="p-4 rounded-2xl bg-nsha-surface border-3 border-nsha-black shadow-nsha-sm flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>

            {/* Partner filter */}
            <div className="flex items-center bg-nsha-surface rounded-xl p-1 border-2 border-nsha-black text-xs font-heading font-bold gap-1">
              <button
                onClick={() => setFilterPartner('all')}
                className={cn('px-3 py-1.5 rounded-lg transition-all', filterPartner === 'all' ? 'bg-nsha-black text-white' : 'text-nsha-text-secondary hover:text-nsha-black')}
              >
                {t('achievements.categoryAll')}
              </button>
              <button
                onClick={() => setFilterPartner('1')}
                className={cn('px-3 py-1.5 rounded-lg transition-all', filterPartner === '1' ? 'bg-nsha-black text-white' : 'text-nsha-text-secondary hover:text-nsha-black')}
              >
                {couple?.partner1Name || 'Partner 1'}
              </button>
              <button
                onClick={() => setFilterPartner('2')}
                className={cn('px-3 py-1.5 rounded-lg transition-all', filterPartner === '2' ? 'bg-nsha-black text-white' : 'text-nsha-text-secondary hover:text-nsha-black')}
              >
                {couple?.partner2Name || 'Partner 2'}
              </button>
            </div>

            {/* Favorites toggle */}
            {activeTab === 'photos' && (
              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-nsha-black text-xs font-heading font-bold transition-all shadow-[2px_2px_0_#090909]',
                  filterFavorites
                    ? 'bg-nsha-pink text-white'
                    : 'bg-nsha-surface text-nsha-black hover:bg-nsha-yellow/30'
                )}
              >
                <Heart className={cn('w-3.5 h-3.5', filterFavorites ? 'fill-white text-white' : 'text-nsha-pink')} />
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
              className="bg-nsha-surface border-2 border-nsha-black rounded-xl px-3 py-1.5 text-xs font-body font-medium text-nsha-black focus:outline-none focus:ring-2 focus:ring-nsha-yellow"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="text-xs font-heading font-bold text-nsha-pink hover:underline"
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
            <div className="nsha-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-nsha-yellow border-2 border-nsha-black shadow-nsha-sm flex items-center justify-center text-nsha-black">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-heading font-bold text-nsha-black mb-1">{t('empty.noPhotos')}</h3>
              <p className="text-sm text-nsha-text-secondary max-w-sm mx-auto">
                {t('memories.emptyStateSub')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPhotos.map((photo, index) => {
                const assignedMusic = getMemoryTrack(photo.id) || getMemoryTrack(photo.date);

                return (
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
                    className="group relative aspect-square rounded-[18px] overflow-hidden border-3 border-nsha-black bg-nsha-surface cursor-pointer shadow-nsha-sm hover:shadow-nsha hover:-translate-y-1 transition-all flex items-center justify-center p-2"
                  >
                    <img
                      src={photo.fileUrl}
                      alt={photo.caption || 'Memory'}
                      className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Soundtrack badge */}
                    {assignedMusic && (
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-nsha-yellow border border-nsha-black text-[10px] font-heading font-bold text-nsha-black shadow-sm flex items-center gap-1">
                        <Music className="w-2.5 h-2.5" /> Soundtrack
                      </div>
                    )}

                    <div className="absolute inset-0 bg-nsha-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between rounded-[16px] z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-nsha-yellow text-nsha-black font-heading font-bold border border-nsha-black">
                          {photo.partner === 1 ? couple?.partner1Name : couple?.partner2Name}
                        </span>
                        <button
                          onClick={(e) => handleToggleFavorite(photo, e)}
                          className="p-1.5 rounded-full bg-nsha-surface border border-nsha-black text-nsha-black hover:bg-nsha-pink hover:text-white transition-colors"
                        >
                          <Heart
                            className={cn('w-3.5 h-3.5', photo.isFavorite && 'fill-nsha-pink text-nsha-pink')}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-center">
                        <span className="px-3 py-1 rounded-xl bg-nsha-yellow text-nsha-black text-xs font-heading font-bold border-2 border-nsha-black flex items-center gap-1 shadow-sm">
                          <Maximize2 className="w-3 h-3" /> View
                        </span>
                      </div>

                      <div className="text-[10px] text-white font-mono truncate">
                        {photo.caption ? photo.caption : photo.date}
                      </div>
                    </div>

                    {photo.isFavorite && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-nsha-surface border-2 border-nsha-black text-nsha-pink group-hover:hidden shadow-sm z-10">
                        <Heart className="w-3 h-3 fill-nsha-pink" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Voice Clips */}
      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filteredVoiceClips.map((clip) => {
            const isPlayingClip = playingClipId === clip.id;
            const authorName = clip.partner === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <div key={clip.id} className="nsha-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-nsha-yellow border-2 border-nsha-black shadow-nsha-sm text-nsha-black flex items-center justify-center">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-heading font-bold text-nsha-black">{authorName}</p>
                      <p className="text-xs text-nsha-text-secondary">{clip.date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-nsha-text-secondary bg-nsha-surface border border-nsha-black/20 px-2 py-0.5 rounded-md">
                    {formatDuration(clip.duration || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t-2 border-nsha-black/10">
                  <button
                    onClick={() => handlePlayVoice(clip)}
                    className={cn(
                      'w-10 h-10 rounded-xl border-2 border-nsha-black flex items-center justify-center transition-all shadow-[2px_2px_0_#090909]',
                      isPlayingClip ? 'bg-nsha-pink text-white' : 'bg-nsha-yellow text-nsha-black hover:bg-nsha-pink hover:text-white'
                    )}
                  >
                    {isPlayingClip ? <Pause className="w-4 h-4 stroke-[2.5]" /> : <Play className="w-4 h-4 ml-0.5 stroke-[2.5]" />}
                  </button>
                  <p className="text-xs font-heading font-bold text-nsha-black">
                    {isPlayingClip ? t('voice.recording') : t('voice.play')}
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
            <div className="nsha-card p-12 text-center text-nsha-text-secondary font-heading text-sm">
              {t('memories.emptyStateTitle')}
            </div>
          ) : (
            onThisDayMemories.map((mem) => (
              <div key={mem.date} className="nsha-card p-5">
                <p className="text-base font-heading font-bold text-nsha-pink mb-1">{formatDate(mem.date)}</p>
                <p className="text-xs font-heading font-bold text-nsha-text-secondary">
                  {mem.photos} {t('home.photos')} • {mem.voiceClips} {t('home.voiceClips')} • {mem.calls} {t('nav.calls')}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── LIGHTBOX MODAL WITH SOUNDTRACK INTEGRATION ─── */}
      <AnimatePresence>
        {currentModalPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedPhotoIndex(null);
              setIsZoomed(false);
              setShowSoundtrackPicker(false);
            }}
            className="fixed inset-0 z-50 bg-nsha-black/85 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6"
          >
            {/* Top Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex items-center justify-between py-2.5 px-5 rounded-2xl bg-nsha-surface border-3 border-nsha-black shadow-nsha z-20 gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-heading font-bold px-3 py-1 rounded-xl bg-nsha-yellow text-nsha-black border-2 border-nsha-black">
                  {currentModalPhoto.partner === 1 ? couple?.partner1Name : couple?.partner2Name}
                </span>
                <span className="text-xs font-heading font-bold text-nsha-black">
                  {formatDate(currentModalPhoto.date)}
                </span>
              </div>

              {/* Soundtrack Status & Controls in Lightbox */}
              <div className="flex items-center gap-2">
                {currentSoundtrack ? (
                  <button
                    onClick={() => {
                      if (currentTrack?.id === currentSoundtrack.id) togglePlay();
                      else playTrack(currentSoundtrack);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-nsha-yellow border-2 border-nsha-black text-xs font-heading font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>{currentSoundtrack.title}</span>
                    {isPlaying && currentTrack?.id === currentSoundtrack.id ? (
                      <Pause className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <Play className="w-3 h-3 stroke-[2.5]" />
                    )}
                  </button>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowSoundtrackPicker(!showSoundtrackPicker)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-nsha-yellow border-2 border-nsha-black text-xs font-heading font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('music.giveMemorySoundtrack')}</span>
                    </button>

                    {/* Soundtrack selection dropdown */}
                    {showSoundtrackPicker && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-nsha-surface border-2 border-nsha-black rounded-xl p-2 shadow-nsha z-50 space-y-1">
                        <p className="text-[10px] font-heading font-bold uppercase text-nsha-text-secondary px-2 py-1">Attach Song</p>
                        {tracks.map((tr) => (
                          <button
                            key={tr.id}
                            onClick={() => {
                              attachTrackToMemory(currentModalPhoto.id, tr.id);
                              setShowSoundtrackPicker(false);
                            }}
                            className="w-full text-left text-xs font-heading font-bold text-nsha-black px-2 py-1.5 rounded-lg hover:bg-nsha-yellow transition-colors truncate"
                          >
                            🎵 {tr.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-2 rounded-xl border-2 border-nsha-black hover:bg-nsha-yellow transition-all"
                >
                  {isZoomed ? <ZoomOut className="w-4 h-4 text-nsha-black" /> : <ZoomIn className="w-4 h-4 text-nsha-black" />}
                </button>
                <button
                  onClick={() => handleDeletePhoto(currentModalPhoto.id)}
                  className="p-2 rounded-xl border-2 border-nsha-black hover:bg-nsha-pink hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedPhotoIndex(null);
                    setIsZoomed(false);
                    setShowSoundtrackPicker(false);
                  }}
                  className="p-2 rounded-xl border-2 border-nsha-black hover:bg-nsha-yellow transition-all ml-1"
                >
                  <X className="w-4 h-4 text-nsha-black" />
                </button>
              </div>
            </div>

            {/* Central Full View Area */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden"
            >
              {selectedPhotoIndex !== null && selectedPhotoIndex > 0 && (
                <button
                  onClick={() => {
                    setSelectedPhotoIndex(selectedPhotoIndex - 1);
                    setIsZoomed(false);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-nsha-surface border-3 border-nsha-black shadow-nsha text-nsha-black hover:bg-nsha-yellow transition-all"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[3]" />
                </button>
              )}

              {selectedPhotoIndex !== null && selectedPhotoIndex < filteredPhotos.length - 1 && (
                <button
                  onClick={() => {
                    setSelectedPhotoIndex(selectedPhotoIndex + 1);
                    setIsZoomed(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-nsha-surface border-3 border-nsha-black shadow-nsha text-nsha-black hover:bg-nsha-yellow transition-all"
                >
                  <ChevronRight className="w-6 h-6 stroke-[3]" />
                </button>
              )}

              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={currentModalPhoto.fileUrl}
                  alt={currentModalPhoto.caption || 'Full Memory'}
                  className={cn(
                    'max-w-full max-h-[75vh] object-contain rounded-2xl border-3 border-nsha-black shadow-nsha bg-nsha-surface transition-all duration-300',
                    isZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
                  )}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
              </div>
            </div>

            {currentModalPhoto.caption && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl py-3 px-5 rounded-2xl bg-nsha-surface border-3 border-nsha-black text-center text-sm font-heading font-bold text-nsha-black shadow-nsha"
              >
                "{currentModalPhoto.caption}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 🎞️ FULL-SCREEN CINEMATIC MEMORY MODE ─── */}
      <AnimatePresence>
        {isMemoryMode && filteredPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 select-none overflow-hidden"
          >
            {/* Top Bar with Exit and soundtrack indicator */}
            <div className="flex items-center justify-between text-white z-20 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                <Music className="w-4 h-4 text-nsha-yellow" />
                <span className="text-xs font-heading font-bold text-white">
                  {currentTrack ? `Soundtrack: ${currentTrack.title}` : 'Cinematic Memory Mode'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMemoryModePlaying(!memoryModePlaying)}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-heading font-bold text-xs flex items-center gap-1.5 backdrop-blur-md"
                >
                  {memoryModePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {memoryModePlaying ? 'Pause' : 'Play'}
                </button>

                <button
                  onClick={() => setIsMemoryMode(false)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-rose-500 text-white backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Central Animated Photo */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden max-w-4xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={filteredPhotos[memoryModeIndex]?.id || memoryModeIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="relative max-h-[75vh] max-w-full flex items-center justify-center"
                >
                  <img
                    src={filteredPhotos[memoryModeIndex]?.fileUrl}
                    alt=""
                    className="max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl border-2 border-white/20"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Emotional Caption & Date */}
            <div className="text-center z-20 max-w-2xl mx-auto w-full space-y-2">
              <motion.div
                key={`caption-${memoryModeIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 inline-block text-white"
              >
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-yellow">
                  {formatDate(filteredPhotos[memoryModeIndex]?.date || '')}
                </p>
                <p className="text-sm sm:text-base font-body font-medium italic mt-0.5">
                  "{filteredPhotos[memoryModeIndex]?.caption || 'One of those days we will always remember. ❤️'}"
                </p>
              </motion.div>

              <p className="text-[11px] text-white/60 font-heading">
                Photo {memoryModeIndex + 1} of {filteredPhotos.length} • "Another memory saved forever. ❤️"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
