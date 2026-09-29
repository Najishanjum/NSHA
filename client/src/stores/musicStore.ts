import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MusicTrack, Playlist, Mashup, MusicMood } from '@/types';
import { generateRomanticWav } from '@/utils/audioSynthesizer';

// Lazy generated default tracks using safe synthesized offline audio
const getDefaultTracks = (): MusicTrack[] => {
  const acousticAudio = generateRomanticWav('acoustic');
  const pianoAudio = generateRomanticWav('piano');
  const lofiAudio = generateRomanticWav('lofi');

  return [
    {
      id: 'default-track-1',
      coupleId: 'default',
      uploadedBy: 1,
      title: 'Moonlight Serenade',
      artist: 'Our Little World',
      album: 'Love Chapters',
      storagePath: acousticAudio,
      coverPath: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&q=80',
      duration: 12,
      isOurSong: true,
      isFavorite: true,
      mood: 'romantic',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-track-2',
      coupleId: 'default',
      uploadedBy: 2,
      title: 'Sunday Morning Warmth',
      artist: 'You & Me',
      album: 'Quiet Mornings',
      storagePath: pianoAudio,
      coverPath: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=300&q=80',
      duration: 12,
      isOurSong: false,
      isFavorite: false,
      mood: 'chill',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-track-3',
      coupleId: 'default',
      uploadedBy: 1,
      title: 'Late Night Rooftop Chords',
      artist: 'Memories of Us',
      album: 'Midnight Stories',
      storagePath: lofiAudio,
      coverPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
      duration: 12,
      isOurSong: false,
      isFavorite: true,
      mood: 'latenight',
      createdAt: new Date().toISOString(),
    },
  ];
};

const getDefaultPlaylists = (): Playlist[] => [
  {
    id: 'pl-our-songs',
    coupleId: 'default',
    name: '❤️ Our Songs',
    description: 'The anthems of our journey together',
    mood: 'romantic',
    trackIds: ['default-track-1'],
    coverPath: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pl-memories',
    coupleId: 'default',
    name: '🥹 Memories',
    description: 'Songs attached to our favorite trips and days',
    mood: 'emotional',
    trackIds: ['default-track-1', 'default-track-2'],
    coverPath: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pl-late-night',
    coupleId: 'default',
    name: '🌙 Late Night',
    description: 'When the world is asleep and it is just us two',
    mood: 'latenight',
    trackIds: ['default-track-3'],
    coverPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pl-morning',
    coupleId: 'default',
    name: '☀️ Morning Vibes',
    description: 'Fresh coffee and sweet good mornings',
    mood: 'happy',
    trackIds: ['default-track-2'],
    coverPath: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pl-fun',
    coupleId: 'default',
    name: '🔥 Fun Together',
    description: 'Dancing in the kitchen and laughing at nonsense',
    mood: 'energetic',
    trackIds: [],
    coverPath: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pl-trips',
    coupleId: 'default',
    name: '🚗 Road Trips',
    description: 'Windows rolled down and singing out loud',
    mood: 'travel',
    trackIds: [],
    coverPath: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pl-missing',
    coupleId: 'default',
    name: '🫶 Missing You',
    description: 'When distance feels too long and I need your voice',
    mood: 'emotional',
    trackIds: ['default-track-3'],
    coverPath: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&q=80',
    createdAt: new Date().toISOString(),
  },
];

interface MusicState {
  tracks: MusicTrack[];
  playlists: Playlist[];
  mashups: Mashup[];
  memoryMusic: Record<string, string>; // memoryId -> trackId

  // Player state
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 - 1
  isMuted: boolean;
  queue: MusicTrack[];
  queueIndex: number;
  repeatMode: 'off' | 'all' | 'one';
  isShuffled: boolean;
  isExpanded: boolean;
  recentlyPlayed: MusicTrack[];

  // Actions
  playTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addToQueue: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (open: boolean) => void;

  // Music Library Actions
  toggleFavorite: (trackId: string) => void;
  setOurSong: (trackId: string) => void;
  getOurSong: () => MusicTrack | undefined;
  attachTrackToMemory: (memoryId: string, trackId: string) => void;
  detachTrackFromMemory: (memoryId: string) => void;
  getMemoryTrack: (memoryId: string) => MusicTrack | undefined;
  addTrack: (track: MusicTrack) => void;
  deleteTrack: (trackId: string) => void;

  // Playlists
  createPlaylist: (name: string, description?: string, mood?: MusicMood) => Playlist;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;

  // Mashups
  saveMashup: (mashup: Mashup) => void;
  deleteMashup: (mashupId: string) => void;
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      tracks: getDefaultTracks(),
      playlists: getDefaultPlaylists(),
      mashups: [],
      memoryMusic: {},

      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.85,
      isMuted: false,
      queue: [],
      queueIndex: -1,
      repeatMode: 'all',
      isShuffled: false,
      isExpanded: false,
      recentlyPlayed: [],

      playTrack: (track, newQueue) => {
        const queue = newQueue || (get().queue.length > 0 ? get().queue : [track]);
        const index = queue.findIndex((t) => t.id === track.id);
        const recently = [track, ...get().recentlyPlayed.filter((t) => t.id !== track.id)].slice(0, 30);

        set({
          currentTrack: track,
          isPlaying: true,
          currentTime: 0,
          duration: track.duration || 0,
          queue,
          queueIndex: index !== -1 ? index : 0,
          recentlyPlayed: recently,
        });
      },

      togglePlay: () => {
        const { isPlaying, currentTrack, tracks } = get();
        if (!currentTrack) {
          const first = tracks[0];
          if (first) get().playTrack(first);
          return;
        }
        set({ isPlaying: !isPlaying });
      },

      pause: () => set({ isPlaying: false }),
      resume: () => set({ isPlaying: true }),

      seek: (time) => set({ currentTime: time }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (dur) => set({ duration: dur }),

      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      nextTrack: () => {
        const { queue, queueIndex, repeatMode, isShuffled } = get();
        if (queue.length === 0) return;

        if (repeatMode === 'one') {
          set({ currentTime: 0, isPlaying: true });
          return;
        }

        let nextIdx = queueIndex + 1;
        if (isShuffled) {
          nextIdx = Math.floor(Math.random() * queue.length);
        } else if (nextIdx >= queue.length) {
          if (repeatMode === 'all') {
            nextIdx = 0;
          } else {
            set({ isPlaying: false });
            return;
          }
        }

        const next = queue[nextIdx];
        if (next) {
          get().playTrack(next, queue);
        }
      },

      prevTrack: () => {
        const { queue, queueIndex, currentTime } = get();
        if (queue.length === 0) return;

        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        const prevIdx = queueIndex - 1 < 0 ? queue.length - 1 : queueIndex - 1;
        const prev = queue[prevIdx];
        if (prev) {
          get().playTrack(prev, queue);
        }
      },

      addToQueue: (track) => {
        set((state) => ({
          queue: [...state.queue, track],
        }));
      },

      removeFromQueue: (index) => {
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
        }));
      },

      clearQueue: () => set({ queue: [], queueIndex: -1 }),

      toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),

      toggleRepeat: () =>
        set((state) => ({
          repeatMode: state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off',
        })),

      setExpanded: (open) => set({ isExpanded: open }),

      toggleFavorite: (trackId) =>
        set((state) => ({
          tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t)),
          currentTrack:
            state.currentTrack?.id === trackId
              ? { ...state.currentTrack, isFavorite: !state.currentTrack.isFavorite }
              : state.currentTrack,
        })),

      setOurSong: (trackId) =>
        set((state) => ({
          tracks: state.tracks.map((t) => ({ ...t, isOurSong: t.id === trackId })),
          currentTrack:
            state.currentTrack?.id === trackId
              ? { ...state.currentTrack, isOurSong: true }
              : state.currentTrack ? { ...state.currentTrack, isOurSong: false } : null,
        })),

      getOurSong: () => {
        const { tracks } = get();
        return tracks.find((t) => t.isOurSong) || tracks[0];
      },

      attachTrackToMemory: (memoryId, trackId) =>
        set((state) => ({
          memoryMusic: { ...state.memoryMusic, [memoryId]: trackId },
        })),

      detachTrackFromMemory: (memoryId) =>
        set((state) => {
          const updated = { ...state.memoryMusic };
          delete updated[memoryId];
          return { memoryMusic: updated };
        }),

      getMemoryTrack: (memoryId) => {
        const { memoryMusic, tracks } = get();
        const trackId = memoryMusic[memoryId];
        if (!trackId) return undefined;
        return tracks.find((t) => t.id === trackId);
      },

      addTrack: (track) =>
        set((state) => ({
          tracks: [track, ...state.tracks],
        })),

      deleteTrack: (trackId) =>
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id !== trackId),
          playlists: state.playlists.map((p) => ({
            ...p,
            trackIds: p.trackIds.filter((id) => id !== trackId),
          })),
          currentTrack: state.currentTrack?.id === trackId ? null : state.currentTrack,
        })),

      createPlaylist: (name, description, mood) => {
        const newPl: Playlist = {
          id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          coupleId: 'default',
          name,
          description,
          mood: mood || 'romantic',
          trackIds: [],
          coverPath: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&q=80',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          playlists: [...state.playlists, newPl],
        }));
        return newPl;
      },

      addTrackToPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId && !p.trackIds.includes(trackId)
              ? { ...p, trackIds: [...p.trackIds, trackId] }
              : p
          ),
        })),

      removeTrackFromPlaylist: (playlistId, trackId) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p
          ),
        })),

      deletePlaylist: (playlistId) =>
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== playlistId),
        })),

      saveMashup: (mashup) =>
        set((state) => ({
          mashups: [mashup, ...state.mashups.filter((m) => m.id !== mashup.id)],
        })),

      deleteMashup: (mashupId) =>
        set((state) => ({
          mashups: state.mashups.filter((m) => m.id !== mashupId),
        })),
    }),
    {
      name: 'couplesync-music',
      partialize: (state) => ({
        tracks: state.tracks,
        playlists: state.playlists,
        mashups: state.mashups,
        memoryMusic: state.memoryMusic,
        volume: state.volume,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
        recentlyPlayed: state.recentlyPlayed,
      }),
    }
  )
);
