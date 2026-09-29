import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Play,
  Pause,
  Plus,
  Upload,
  Heart,
  Sparkles,
  Sliders,
  Trash2,
  Clock,
  Disc3,
  Wand2,
  Volume2,
  ListPlus,
  Check,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useMusicStore } from '@/stores/musicStore';
import { useCoupleStore } from '@/stores';
import { musicApi } from '@/services/api';
import type { MusicTrack, Playlist, Mashup, MusicMood, MashupTrackConfig } from '@/types';
import { cn, formatDuration } from '@/lib/utils';
import { useLanguage } from '@/i18n';

export default function MusicPage() {
  const { t } = useLanguage();
  const couple = useCoupleStore((s) => s.couple);
  const currentPartner = useCoupleStore((s) => s.currentPartner || 1);

  const {
    tracks,
    playlists,
    mashups,
    currentTrack,
    isPlaying,
    recentlyPlayed,
    playTrack,
    togglePlay,
    setOurSong,
    getOurSong,
    toggleFavorite,
    addTrack,
    deleteTrack,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    saveMashup,
    deleteMashup,
  } = useMusicStore();

  const [activeTab, setActiveTab] = useState<'all' | 'playlists' | 'mashup' | 'favorites' | 'recent'>('all');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCover, setUploadCover] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadMood, setUploadMood] = useState<MusicMood>('romantic');
  const [isUploading, setIsUploading] = useState(false);

  // Playlist creation state
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistMood, setNewPlaylistMood] = useState<MusicMood>('romantic');

  // Mashup Studio state
  const [mashupName, setMashupName] = useState('Our First Mashup ❤️');
  const [selectedMashupTracks, setSelectedMashupTracks] = useState<string[]>([]);
  const [autoMashupLength, setAutoMashupLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [crossfadeDuration, setCrossfadeDuration] = useState(2);
  const [trackConfigs, setTrackConfigs] = useState<Record<string, { start: number; end: number; volume: number; fadeIn: number; fadeOut: number }>>({});
  const [isGeneratingMashup, setIsGeneratingMashup] = useState(false);
  const [previewingMashup, setPreviewingMashup] = useState(false);
  const mashupAudioCtxRef = useRef<AudioContext | null>(null);

  const ourSong = getOurSong();

  // Handle Audio File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim() || !couple) return;
    setIsUploading(true);

    try {
      const res = await musicApi.uploadTrack(
        uploadFile,
        couple.id,
        currentPartner,
        {
          title: uploadTitle.trim(),
          artist: uploadArtist.trim() || 'Custom Audio',
          mood: uploadMood,
          coverFile: uploadCover || undefined,
        }
      );

      if (res.data) {
        addTrack(res.data);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadCover(null);
        setUploadTitle('');
        setUploadArtist('');
      }
    } catch (err) {
      console.error('Failed to upload track:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Playlist Creation
  const handleCreatePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), newPlaylistMood);
    setNewPlaylistName('');
    setNewPlaylistDesc('');
    setShowNewPlaylistModal(false);
  };

  // Toggle selection for Mashup Studio
  const toggleTrackForMashup = (trackId: string) => {
    if (selectedMashupTracks.includes(trackId)) {
      setSelectedMashupTracks(selectedMashupTracks.filter((id) => id !== trackId));
    } else {
      if (selectedMashupTracks.length >= 4) return;
      setSelectedMashupTracks([...selectedMashupTracks, trackId]);
      if (!trackConfigs[trackId]) {
        setTrackConfigs((prev) => ({
          ...prev,
          [trackId]: { start: 0, end: 15, volume: 1, fadeIn: 1, fadeOut: 1 },
        }));
      }
    }
  };

  // Save Mashup to Library
  const handleSaveMashup = () => {
    if (!couple || selectedMashupTracks.length < 2) return;
    setIsGeneratingMashup(true);

    setTimeout(() => {
      const selectedObj = tracks.filter((t) => selectedMashupTracks.includes(t.id));
      const mashupTracksConfig: MashupTrackConfig[] = selectedObj.map((tr, index) => {
        const cfg = trackConfigs[tr.id] || { start: 0, end: 15, volume: 1, fadeIn: 1, fadeOut: 1 };
        return {
          id: `cfg-${tr.id}`,
          trackId: tr.id,
          trackTitle: tr.title,
          position: index,
          startTime: cfg.start,
          endTime: cfg.end,
          volume: cfg.volume,
          fadeIn: cfg.fadeIn,
          fadeOut: cfg.fadeOut,
        };
      });

      const totalDur = mashupTracksConfig.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);

      const newMashup: Mashup = {
        id: `mashup-${Date.now()}`,
        coupleId: couple.id,
        createdBy: currentPartner,
        name: mashupName.trim() || 'Our Memory Mashup',
        description: `${selectedMashupTracks.length} song blend with smooth crossfades`,
        duration: Math.max(30, totalDur),
        tracks: mashupTracksConfig,
        createdAt: new Date().toISOString(),
      };

      saveMashup(newMashup);
      setIsGeneratingMashup(false);
      alert('Mashup saved to your library! ❤️🎵');
    }, 600);
  };

  // Simple Auto Mashup Preset
  const handleAutoMashupPreset = (preset: 'short' | 'medium' | 'long') => {
    setAutoMashupLength(preset);
    const targetTracks = tracks.slice(0, 3).map((t) => t.id);
    setSelectedMashupTracks(targetTracks);
    const segDuration = preset === 'short' ? 10 : preset === 'medium' ? 25 : 45;
    const newCfgs: Record<string, any> = {};
    targetTracks.forEach((id) => {
      newCfgs[id] = { start: 0, end: segDuration, volume: 1, fadeIn: 1.5, fadeOut: 1.5 };
    });
    setTrackConfigs(newCfgs);
  };

  const favoriteTracks = tracks.filter((t) => t.isFavorite);

  return (
    <div className="py-6 lg:py-10 space-y-8 max-w-5xl mx-auto w-full">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-pink">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / AUDIO SANCTUARY</p>
            <h1 className="nsha-page-title">{t('music.title')}</h1>
            <p className="nsha-page-subtitle">{t('music.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="nsha-btn nsha-btn-primary nsha-btn-sm"
          >
            <Upload className="w-4 h-4" />
            {t('music.uploadAudio')}
          </button>
        </div>
      </div>

      {/* ─── Hero: ❤️ OUR SONG ─── */}
      {ourSong && (
        <div className="nsha-card p-6 sm:p-8 bg-[#FFF9E6] border-3 border-nsha-black shadow-nsha relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Spinning Vinyl Artwork */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-3 border-nsha-black bg-nsha-black overflow-hidden shrink-0 shadow-nsha-sm flex items-center justify-center">
                {ourSong.coverPath ? (
                  <img
                    src={ourSong.coverPath}
                    alt={ourSong.title}
                    className={cn(
                      'w-full h-full object-cover transition-transform duration-1000',
                      isPlaying && currentTrack?.id === ourSong.id && 'animate-spin'
                    )}
                    style={{ animationDuration: '6s' }}
                  />
                ) : (
                  <Disc3 className={cn('w-12 h-12 text-nsha-yellow', isPlaying && currentTrack?.id === ourSong.id && 'animate-spin')} />
                )}
                {/* Center hole of vinyl */}
                <div className="absolute w-6 h-6 rounded-full bg-nsha-surface border-2 border-nsha-black" />
              </div>

              <div>
                <span className="nsha-badge nsha-badge-pink mb-2">
                  ❤️ {t('music.ourSong')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-nsha-black">
                  {ourSong.title}
                </h2>
                <p className="text-xs sm:text-sm font-heading font-semibold text-nsha-text-secondary mt-1">
                  {ourSong.artist} • "{t('music.ourSongDesc')}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  if (currentTrack?.id === ourSong.id) {
                    togglePlay();
                  } else {
                    playTrack(ourSong);
                  }
                }}
                className="nsha-btn nsha-btn-primary w-full md:w-auto"
              >
                {isPlaying && currentTrack?.id === ourSong.id ? (
                  <>
                    <Pause className="w-4 h-4 stroke-[2.5]" /> Pause Our Song
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 ml-0.5 stroke-[2.5]" /> {t('music.playOurSong')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b-2 border-nsha-black/10">
        {[
          { id: 'all', label: t('music.allTracks') },
          { id: 'playlists', label: t('music.playlists') },
          { id: 'mashup', label: '🎵 ' + t('music.createMashup') },
          { id: 'favorites', label: t('music.favorites') },
          { id: 'recent', label: t('music.recentlyPlayed') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSelectedPlaylist(null);
            }}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold transition-all border-2 whitespace-nowrap mb-1',
              activeTab === tab.id
                ? 'bg-nsha-yellow text-nsha-black border-nsha-black shadow-[2px_2px_0_#090909]'
                : 'bg-nsha-surface text-nsha-text-secondary border-transparent hover:border-nsha-black/20'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: ALL TRACKS ─── */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">
              {tracks.length} Songs in Library
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="text-xs font-heading font-bold text-nsha-pink hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Track
            </button>
          </div>

          <div className="divide-y-2 divide-nsha-black/10 nsha-card p-4 sm:p-6 bg-nsha-surface">
            {tracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isTrackPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={track.id}
                  className={cn(
                    'py-3 sm:py-3.5 flex items-center justify-between gap-3 group transition-colors rounded-xl px-2 sm:px-3',
                    isCurrent && 'bg-nsha-yellow/20'
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => {
                        if (isCurrent) togglePlay();
                        else playTrack(track, tracks);
                      }}
                      className={cn(
                        'w-10 h-10 rounded-xl border-2 border-nsha-black flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm',
                        isCurrent ? 'bg-nsha-yellow' : 'bg-white hover:bg-nsha-yellow'
                      )}
                    >
                      {isTrackPlaying ? (
                        <Pause className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 stroke-[2.5]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-heading font-bold truncate', isCurrent ? 'text-nsha-pink' : 'text-nsha-black')}>
                          {track.title}
                        </p>
                        {track.isOurSong && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-nsha-pink text-white font-bold shrink-0">
                            Our Song
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-nsha-text-secondary truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-nsha-text-secondary hidden sm:inline">
                      {formatDuration(track.duration)}
                    </span>

                    <button
                      onClick={() => toggleFavorite(track.id)}
                      className="p-1.5 rounded-lg border border-transparent hover:border-nsha-black transition-all"
                      title="Favorite"
                    >
                      <Heart
                        className={cn(
                          'w-4 h-4',
                          track.isFavorite ? 'fill-nsha-pink text-nsha-pink' : 'text-nsha-black'
                        )}
                      />
                    </button>

                    {!track.isOurSong && (
                      <button
                        onClick={() => setOurSong(track.id)}
                        className="p-1.5 rounded-lg border border-nsha-black/20 hover:bg-nsha-yellow text-xs font-heading font-bold hidden md:inline-flex"
                        title="Set as Our Song"
                      >
                        ❤️ Set Theme
                      </button>
                    )}

                    <button
                      onClick={() => deleteTrack(track.id)}
                      className="p-1.5 rounded-lg text-nsha-text-secondary hover:text-nsha-pink transition-colors"
                      title="Delete Track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: PLAYLISTS ─── */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">
              {playlists.length} Playlists
            </p>
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="nsha-btn nsha-btn-primary nsha-btn-sm"
            >
              <Plus className="w-4 h-4" />
              {t('music.createPlaylist')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {playlists.map((pl) => {
              const count = pl.trackIds.length;
              return (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl)}
                  className="nsha-card p-5 cursor-pointer hover:-translate-y-1 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-nsha-yellow border-2 border-nsha-black shadow-nsha-sm flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">
                      🎵
                    </div>
                    <h3 className="text-lg font-heading font-bold text-nsha-black group-hover:text-nsha-pink transition-colors">
                      {pl.name}
                    </h3>
                    <p className="text-xs text-nsha-text-secondary mt-1 line-clamp-2">
                      {pl.description || 'Curated romantic moments for the two of you'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t-2 border-nsha-black/10 flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-nsha-black bg-white px-2.5 py-1 rounded-md border border-nsha-black/20">
                      {count} {count === 1 ? 'song' : 'songs'}
                    </span>
                    <span className="text-xs font-heading font-bold text-nsha-pink flex items-center gap-1">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Playlist Inspector */}
          {selectedPlaylist && (
            <div className="nsha-card p-6 bg-white border-3 border-nsha-black shadow-nsha space-y-4">
              <div className="flex items-center justify-between border-b-2 border-nsha-black pb-3">
                <div>
                  <h3 className="text-xl font-heading font-bold text-nsha-black">{selectedPlaylist.name}</h3>
                  <p className="text-xs text-nsha-text-secondary">{selectedPlaylist.description}</p>
                </div>
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="p-1.5 rounded-xl border border-nsha-black hover:bg-nsha-yellow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedPlaylist.trackIds.length === 0 ? (
                <div className="py-8 text-center text-xs text-nsha-text-secondary italic">
                  No songs in this playlist yet. Add songs from the "All Songs" tab!
                </div>
              ) : (
                <div className="divide-y divide-nsha-black/10">
                  {tracks
                    .filter((tr) => selectedPlaylist.trackIds.includes(tr.id))
                    .map((tItem) => (
                      <div key={tItem.id} className="py-2.5 flex items-center justify-between">
                        <span className="text-sm font-heading font-bold text-nsha-black">{tItem.title}</span>
                        <button
                          onClick={() => playTrack(tItem)}
                          className="nsha-btn nsha-btn-primary nsha-btn-sm"
                        >
                          <Play className="w-3.5 h-3.5" /> Play
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: 🎵 MASHUP STUDIO ─── */}
      {activeTab === 'mashup' && (
        <div className="space-y-6">
          <div className="nsha-card p-6 sm:p-8 space-y-6 bg-nsha-surface">
            <div className="border-b-2 border-nsha-black/10 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="nsha-badge nsha-badge-purple mb-2">Browser-Side Audio Mixing</span>
                <h2 className="text-2xl font-heading font-bold text-nsha-black">
                  🎵 Couples Mashup Studio
                </h2>
                <p className="text-xs sm:text-sm text-nsha-text-secondary mt-1">
                  Blend 2–4 of your favorite audio memories with smooth crossfades and non-destructive trimming.
                </p>
              </div>

              {/* Mode Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAutoMashupPreset('short')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-heading font-bold border-2 transition-all',
                    autoMashupLength === 'short' ? 'bg-nsha-yellow border-nsha-black shadow-sm' : 'bg-white border-nsha-black/20'
                  )}
                >
                  ✨ Short
                </button>
                <button
                  onClick={() => handleAutoMashupPreset('medium')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-heading font-bold border-2 transition-all',
                    autoMashupLength === 'medium' ? 'bg-nsha-yellow border-nsha-black shadow-sm' : 'bg-white border-nsha-black/20'
                  )}
                >
                  ✨ Medium
                </button>
                <button
                  onClick={() => handleAutoMashupPreset('long')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-heading font-bold border-2 transition-all',
                    autoMashupLength === 'long' ? 'bg-nsha-yellow border-nsha-black shadow-sm' : 'bg-white border-nsha-black/20'
                  )}
                >
                  ✨ Long
                </button>
              </div>
            </div>

            {/* Step 1: Select Audio Tracks */}
            <div className="space-y-3">
              <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">
                Step 1: Select Tracks to Blend ({selectedMashupTracks.length} / 4 chosen)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tracks.map((tr) => {
                  const isSelected = selectedMashupTracks.includes(tr.id);
                  return (
                    <div
                      key={tr.id}
                      onClick={() => toggleTrackForMashup(tr.id)}
                      className={cn(
                        'p-3.5 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all select-none',
                        isSelected
                          ? 'bg-[#EBF9F1] border-nsha-black shadow-sm'
                          : 'bg-white border-nsha-black/20 hover:border-nsha-black'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-heading font-bold text-nsha-black truncate">{tr.title}</p>
                        <p className="text-xs text-nsha-text-secondary">{tr.artist} • {formatDuration(tr.duration)}</p>
                      </div>

                      <div
                        className={cn(
                          'w-6 h-6 rounded-lg border-2 border-nsha-black flex items-center justify-center shrink-0',
                          isSelected ? 'bg-nsha-green text-nsha-black' : 'bg-white'
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Visual Mashup Timeline */}
            {selectedMashupTracks.length > 0 && (
              <div className="space-y-4 pt-2">
                <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">
                  Step 2: Visual Timeline & Sequence
                </label>

                <div className="p-4 rounded-xl bg-white border-2 border-nsha-black space-y-4 shadow-sm">
                  {selectedMashupTracks.map((trId, index) => {
                    const trackObj = tracks.find((t) => t.id === trId);
                    if (!trackObj) return null;
                    const cfg = trackConfigs[trId] || { start: 0, end: 15, volume: 1, fadeIn: 1, fadeOut: 1 };

                    return (
                      <div key={trId} className="p-3.5 rounded-xl bg-nsha-surface border-2 border-nsha-black space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-heading font-bold px-2 py-0.5 rounded bg-nsha-yellow border border-nsha-black">
                            Track {index + 1}
                          </span>
                          <span className="text-sm font-heading font-bold text-nsha-black truncate max-w-[200px]">
                            {trackObj.title}
                          </span>
                          <span className="text-xs font-mono text-nsha-text-secondary">
                            Segment: {cfg.end - cfg.start}s
                          </span>
                        </div>

                        {/* Visual Bar representation */}
                        <div className="h-6 w-full bg-slate-200 rounded-lg border border-nsha-black relative overflow-hidden flex items-center px-2">
                          <div
                            className="h-full bg-nsha-green rounded-md opacity-80"
                            style={{ width: `${Math.min(100, ((cfg.end - cfg.start) / trackObj.duration) * 100)}%` }}
                          />
                        </div>

                        {/* Quick adjustments */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-nsha-text-secondary font-bold">Start Time (s):</span>
                            <input
                              type="number"
                              min={0}
                              max={trackObj.duration - 5}
                              value={cfg.start}
                              onChange={(e) =>
                                setTrackConfigs((prev) => ({
                                  ...prev,
                                  [trId]: { ...cfg, start: Math.max(0, Number(e.target.value)) },
                                }))
                              }
                              className="w-full bg-white border border-nsha-black rounded px-2 py-1 font-mono font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-nsha-text-secondary font-bold">End Time (s):</span>
                            <input
                              type="number"
                              min={cfg.start + 5}
                              max={trackObj.duration}
                              value={cfg.end}
                              onChange={(e) =>
                                setTrackConfigs((prev) => ({
                                  ...prev,
                                  [trId]: { ...cfg, end: Number(e.target.value) },
                                }))
                              }
                              className="w-full bg-white border border-nsha-black rounded px-2 py-1 font-mono font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-nsha-text-secondary font-bold">Fade In (s):</span>
                            <input
                              type="number"
                              min={0}
                              max={5}
                              value={cfg.fadeIn}
                              onChange={(e) =>
                                setTrackConfigs((prev) => ({
                                  ...prev,
                                  [trId]: { ...cfg, fadeIn: Number(e.target.value) },
                                }))
                              }
                              className="w-full bg-white border border-nsha-black rounded px-2 py-1 font-mono font-bold"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-nsha-text-secondary font-bold">Fade Out (s):</span>
                            <input
                              type="number"
                              min={0}
                              max={5}
                              value={cfg.fadeOut}
                              onChange={(e) =>
                                setTrackConfigs((prev) => ({
                                  ...prev,
                                  [trId]: { ...cfg, fadeOut: Number(e.target.value) },
                                }))
                              }
                              className="w-full bg-white border border-nsha-black rounded px-2 py-1 font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Save / Action Buttons */}
            {selectedMashupTracks.length >= 2 && (
              <div className="pt-2 space-y-4">
                <input
                  type="text"
                  value={mashupName}
                  onChange={(e) => setMashupName(e.target.value)}
                  placeholder="Give your mashup a sweet name..."
                  className="nsha-input"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveMashup}
                    disabled={isGeneratingMashup}
                    className="nsha-btn nsha-btn-primary flex-1"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isGeneratingMashup ? 'Blending Audio...' : t('music.saveMashup')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Mashups List */}
          {mashups.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-heading font-bold text-nsha-black">Your Saved Mashups</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mashups.map((m) => (
                  <div key={m.id} className="nsha-card p-5 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="nsha-badge nsha-badge-purple">Mashup</span>
                      <button
                        onClick={() => deleteMashup(m.id)}
                        className="text-nsha-text-secondary hover:text-nsha-pink"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-base font-heading font-bold text-nsha-black">{m.name}</h4>
                      <p className="text-xs text-nsha-text-secondary mt-0.5">{m.description}</p>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t border-nsha-black/10">
                      <span className="text-xs font-mono font-bold text-nsha-black">
                        {formatDuration(m.duration)}
                      </span>
                      <span className="text-xs font-heading font-bold text-emerald-700">
                        {m.tracks.length} tracks blended
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: FAVORITES ─── */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <p className="text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">
            {favoriteTracks.length} Favorited Songs
          </p>
          {favoriteTracks.length === 0 ? (
            <div className="nsha-card p-12 text-center">
              <Heart className="w-12 h-12 text-nsha-pink mx-auto mb-3" />
              <h3 className="text-lg font-heading font-bold text-nsha-black mb-1">No Favorite Songs Yet</h3>
              <p className="text-xs text-nsha-text-secondary max-w-sm mx-auto">
                Tap the heart on any song to save it to your couple favorites list ❤️
              </p>
            </div>
          ) : (
            <div className="nsha-card p-4 sm:p-6 divide-y-2 divide-nsha-black/10">
              {favoriteTracks.map((tr) => (
                <div key={tr.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-heading font-bold text-nsha-black truncate">{tr.title}</p>
                    <p className="text-xs text-nsha-text-secondary">{tr.artist}</p>
                  </div>
                  <button onClick={() => playTrack(tr)} className="nsha-btn nsha-btn-primary nsha-btn-sm">
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: RECENTLY PLAYED ─── */}
      {activeTab === 'recent' && (
        <div className="space-y-4">
          <p className="text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">
            Recently Played History
          </p>
          {recentlyPlayed.length === 0 ? (
            <div className="nsha-card p-12 text-center text-xs text-nsha-text-secondary">
              No recently played songs yet. Start playing a track above!
            </div>
          ) : (
            <div className="nsha-card p-4 sm:p-6 divide-y-2 divide-nsha-black/10">
              {recentlyPlayed.map((tr) => (
                <div key={tr.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-heading font-bold text-nsha-black truncate">{tr.title}</p>
                    <p className="text-xs text-nsha-text-secondary">{tr.artist}</p>
                  </div>
                  <button onClick={() => playTrack(tr)} className="nsha-btn nsha-btn-primary nsha-btn-sm">
                    <Play className="w-3.5 h-3.5" /> Play
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: Upload Custom Audio ─── */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-nsha-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] shadow-nsha max-w-lg w-full p-6 sm:p-8 space-y-5 max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b-2 border-nsha-black pb-3">
                <h3 className="font-heading font-bold text-xl text-nsha-black">
                  Upload Song / Personal Audio
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 rounded-xl border border-nsha-black hover:bg-nsha-yellow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Song / Track Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Our Road Trip Anthem"
                    className="nsha-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Artist / Note
                  </label>
                  <input
                    type="text"
                    value={uploadArtist}
                    onChange={(e) => setUploadArtist(e.target.value)}
                    placeholder="e.g. Acoustic Cover by Me"
                    className="nsha-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Audio File (MP3, WAV, M4A, OGG) *
                  </label>
                  <input
                    type="file"
                    required
                    accept="audio/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="nsha-input text-xs"
                  />
                  <p className="text-[11px] text-nsha-text-secondary mt-1">
                    Upload audio that you own or have permission to use ❤️
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Artwork Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadCover(e.target.files?.[0] || null)}
                    className="nsha-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Music Mood
                  </label>
                  <select
                    value={uploadMood}
                    onChange={(e) => setUploadMood(e.target.value as any)}
                    className="nsha-input text-xs"
                  >
                    <option value="romantic">❤️ Romantic</option>
                    <option value="emotional">🥹 Emotional</option>
                    <option value="latenight">🌙 Late Night</option>
                    <option value="happy">☀️ Happy & Upbeat</option>
                    <option value="chill">😌 Chill & Relaxing</option>
                    <option value="travel">🚗 Road Trip</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="nsha-btn nsha-btn-secondary nsha-btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="nsha-btn nsha-btn-primary nsha-btn-sm"
                  >
                    {isUploading ? 'Uploading...' : 'Save Track to Music'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: Create New Playlist ─── */}
      <AnimatePresence>
        {showNewPlaylistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-nsha-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] shadow-nsha max-w-md w-full p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-nsha-black pb-3">
                <h3 className="font-heading font-bold text-xl text-nsha-black">Create Playlist</h3>
                <button
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="p-1.5 rounded-xl border border-nsha-black hover:bg-nsha-yellow"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePlaylistSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Playlist Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. Sunday Walks With You"
                    className="nsha-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-nsha-text-secondary uppercase mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    placeholder="e.g. All our acoustic favorites"
                    className="nsha-input"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewPlaylistModal(false)}
                    className="nsha-btn nsha-btn-secondary nsha-btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="nsha-btn nsha-btn-primary nsha-btn-sm"
                  >
                    Create Playlist
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
