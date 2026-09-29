import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ChevronDown,
  ListMusic,
  Disc3,
  X,
  Sparkles,
  Plus,
} from 'lucide-react';
import { useMusicStore } from '@/stores/musicStore';
import { cn, formatDuration } from '@/lib/utils';
import { useLanguage } from '@/i18n';

export function GlobalMusicPlayer() {
  const { t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    queueIndex,
    repeatMode,
    isShuffled,
    isExpanded,
    playlists,
    togglePlay,
    pause,
    resume,
    seek,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    toggleShuffle,
    toggleRepeat,
    setExpanded,
    toggleFavorite,
    setOurSong,
    addTrackToPlaylist,
  } = useMusicStore();

  const [showQueue, setShowQueue] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  // Sync audio element with state
  useEffect(() => {
    if (!audioRef.current) return;
    if (currentTrack) {
      if (audioRef.current.src !== currentTrack.storagePath) {
        audioRef.current.src = currentTrack.storagePath;
        audioRef.current.load();
      }
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Autoplay prevented or interrupted:', err);
            pause();
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrack, isPlaying]);

  // Volume & Mute Sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Time update listener
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!duration && audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    nextTrack();
  };

  const handleSliderSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    seek(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  if (!currentTrack) {
    return <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} />;
  }

  const isFavorite = currentTrack.isFavorite;
  const isOurSong = currentTrack.isOurSong;

  return (
    <>
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* ─── MINI PLAYER (Desktop & Mobile) ─── */}
      <div className="fixed z-40 bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] pointer-events-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-nsha-surface border-3 border-nsha-black rounded-2xl p-2.5 sm:p-3 shadow-nsha flex items-center justify-between gap-3 select-none"
        >
          {/* Track Info (Click to open full player) */}
          <div
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="relative w-11 h-11 rounded-xl border-2 border-nsha-black overflow-hidden bg-nsha-yellow shrink-0 flex items-center justify-center shadow-[2px_2px_0_#090909]">
              {currentTrack.coverPath ? (
                <img
                  src={currentTrack.coverPath}
                  alt={currentTrack.title}
                  className={cn(
                    'w-full h-full object-cover transition-transform duration-700',
                    isPlaying && 'scale-105'
                  )}
                />
              ) : (
                <Disc3 className={cn('w-6 h-6 text-nsha-black', isPlaying && 'animate-spin')} />
              )}
              {isOurSong && (
                <span className="absolute -top-1 -right-1 text-[10px]" title="Our Song">
                  ❤️
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-heading font-bold text-nsha-black truncate group-hover:text-nsha-pink transition-colors">
                  {currentTrack.title}
                </p>
                {isOurSong && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-nsha-yellow font-heading font-bold border border-nsha-black shrink-0">
                    Our Song
                  </span>
                )}
              </div>
              <p className="text-[11px] text-nsha-text-secondary truncate">
                {currentTrack.artist || 'Our Relationship Soundtrack'}
              </p>
            </div>
          </div>

          {/* Mini Playback Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => toggleFavorite(currentTrack.id)}
              className="p-1.5 rounded-lg border-2 border-transparent hover:border-nsha-black transition-all"
              title="Favorite"
            >
              <Heart
                className={cn(
                  'w-4 h-4',
                  isFavorite ? 'fill-nsha-pink text-nsha-pink' : 'text-nsha-black'
                )}
              />
            </button>

            <button
              onClick={prevTrack}
              className="p-1.5 rounded-lg text-nsha-black hover:bg-nsha-yellow/30 transition-all hidden sm:flex"
              title="Previous"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-xl bg-nsha-yellow border-2 border-nsha-black flex items-center justify-center text-nsha-black shadow-[2px_2px_0_#090909] active:translate-y-0.5 transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 stroke-[2.5]" /> : <Play className="w-4 h-4 ml-0.5 stroke-[2.5]" />}
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 rounded-lg text-nsha-black hover:bg-nsha-yellow/30 transition-all"
              title="Next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ─── FULL PLAYER MODAL ─── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-nsha-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] shadow-nsha max-w-lg w-full p-6 sm:p-8 space-y-6 relative overflow-hidden max-h-[92vh] overflow-y-auto"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b-2 border-nsha-black/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-nsha-yellow border-2 border-nsha-black flex items-center justify-center">
                    <Disc3 className={cn('w-4 h-4', isPlaying && 'animate-spin')} />
                  </div>
                  <div>
                    <h3 className="text-sm font-heading font-bold text-nsha-black uppercase tracking-wider">
                      {isOurSong ? '❤️ Our Song' : 'Now Playing'}
                    </h3>
                    <p className="text-[11px] text-nsha-text-secondary">Couple Audio Space</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQueue(!showQueue)}
                    className={cn(
                      'p-2 rounded-xl border-2 border-nsha-black transition-all',
                      showQueue ? 'bg-nsha-yellow' : 'bg-white hover:bg-nsha-yellow/30'
                    )}
                    title="Queue"
                  >
                    <ListMusic className="w-4 h-4 text-nsha-black" />
                  </button>

                  <button
                    onClick={() => setExpanded(false)}
                    className="p-2 rounded-xl border-2 border-nsha-black bg-white hover:bg-nsha-pink hover:text-white transition-all"
                  >
                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Artwork & Visualizer Container */}
              <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl border-3 border-nsha-black shadow-nsha bg-nsha-yellow overflow-hidden flex items-center justify-center p-3">
                {currentTrack.coverPath ? (
                  <img
                    src={currentTrack.coverPath}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Disc3 className={cn('w-24 h-24 text-nsha-black mx-auto mb-2', isPlaying && 'animate-spin')} style={{ animationDuration: '8s' }} />
                    <p className="text-xs font-heading font-bold text-nsha-black">OUR SOUNDTRACK</p>
                  </div>
                )}

                {/* Subtle Visualizer Bar overlay */}
                {isPlaying && (
                  <div className="absolute bottom-4 left-6 right-6 h-6 flex items-end justify-center gap-1.5 bg-black/60 backdrop-blur-sm p-1.5 rounded-xl border border-white/20">
                    {[40, 70, 90, 60, 100, 80, 50, 85, 65, 95, 75, 50].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [`${h * 0.25}%`, `${h}%`, `${h * 0.35}%`] }}
                        transition={{ duration: 0.6 + (i % 4) * 0.15, repeat: Infinity }}
                        className="flex-1 bg-nsha-yellow rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Artist & Favorite */}
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-heading font-bold text-nsha-black truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-xs font-heading font-semibold text-nsha-text-secondary mt-0.5 truncate">
                    {currentTrack.artist || 'Couples Private Audio'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFavorite(currentTrack.id)}
                    className="p-2 rounded-xl border-2 border-nsha-black bg-white hover:bg-nsha-yellow/30 transition-all shadow-sm"
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5',
                        isFavorite ? 'fill-nsha-pink text-nsha-pink' : 'text-nsha-black'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack.duration || 100}
                  value={currentTime}
                  onChange={handleSliderSeek}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-nsha-black border-2 border-nsha-black"
                />
                <div className="flex justify-between text-xs font-mono font-bold text-nsha-text-secondary">
                  <span>{formatDuration(Math.floor(currentTime))}</span>
                  <span>{formatDuration(Math.floor(duration || currentTrack.duration || 0))}</span>
                </div>
              </div>

              {/* Main Controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
              <div className="flex items-center justify-around py-1">
                <button
                  onClick={toggleShuffle}
                  className={cn(
                    'p-2.5 rounded-xl border-2 border-nsha-black transition-all',
                    isShuffled ? 'bg-nsha-yellow shadow-sm' : 'bg-white text-nsha-text-secondary hover:text-nsha-black'
                  )}
                  title="Shuffle"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={prevTrack}
                  className="p-3 rounded-xl border-2 border-nsha-black bg-white hover:bg-nsha-yellow/40 transition-all shadow-sm"
                  title="Previous Track"
                >
                  <SkipBack className="w-5 h-5 stroke-[2.5]" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-2xl bg-nsha-yellow border-3 border-nsha-black shadow-nsha flex items-center justify-center text-nsha-black hover:translate-y-0.5 active:shadow-none transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-6 h-6 stroke-[2.5]" /> : <Play className="w-6 h-6 ml-0.5 stroke-[2.5]" />}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-3 rounded-xl border-2 border-nsha-black bg-white hover:bg-nsha-yellow/40 transition-all shadow-sm"
                  title="Next Track"
                >
                  <SkipForward className="w-5 h-5 stroke-[2.5]" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={cn(
                    'p-2.5 rounded-xl border-2 border-nsha-black transition-all',
                    repeatMode !== 'off' ? 'bg-nsha-yellow shadow-sm' : 'bg-white text-nsha-text-secondary hover:text-nsha-black'
                  )}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-nsha-black shadow-sm">
                <button onClick={toggleMute} className="text-nsha-black">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-nsha-black"
                />
              </div>

              {/* Romantic Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setOurSong(currentTrack.id)}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border-2 border-nsha-black font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm',
                    isOurSong
                      ? 'bg-nsha-pink text-white'
                      : 'bg-white text-nsha-black hover:bg-nsha-yellow'
                  )}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  {isOurSong ? 'Our Song ❤️' : 'Set as Our Song'}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-nsha-black font-heading font-bold text-xs bg-white text-nsha-black hover:bg-nsha-yellow flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Add to Playlist
                  </button>

                  {/* Playlist Dropdown */}
                  {showPlaylistMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-nsha-surface border-2 border-nsha-black rounded-xl p-2 shadow-nsha-sm z-50 space-y-1">
                      <p className="text-[10px] font-heading font-bold uppercase text-nsha-text-secondary px-2 py-1">Choose Playlist</p>
                      {playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            addTrackToPlaylist(pl.id, currentTrack.id);
                            setShowPlaylistMenu(false);
                          }}
                          className="w-full text-left text-xs font-heading font-bold text-nsha-black px-2 py-1.5 rounded-lg hover:bg-nsha-yellow transition-colors truncate"
                        >
                          {pl.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Queue view drawer */}
              {showQueue && (
                <div className="p-4 rounded-xl bg-white border-2 border-nsha-black shadow-sm space-y-2 mt-4 max-h-48 overflow-y-auto">
                  <p className="text-xs font-heading font-bold uppercase text-nsha-text-secondary">
                    Up Next ({queue.length} songs)
                  </p>
                  <div className="divide-y divide-nsha-black/10">
                    {queue.map((t, idx) => (
                      <div
                        key={`${t.id}-${idx}`}
                        className={cn(
                          'py-1.5 flex items-center justify-between text-xs',
                          idx === queueIndex && 'font-bold text-nsha-pink'
                        )}
                      >
                        <span className="truncate">{t.title}</span>
                        <span className="font-mono text-[10px] text-nsha-text-secondary">
                          {formatDuration(t.duration)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
