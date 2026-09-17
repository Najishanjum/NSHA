import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
  Sparkles,
  Heart,
  Clock,
  Volume2,
  RefreshCw,
  Send,
  CheckCircle,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { voiceApi } from '@/services/api';
import type { VoiceClip } from '@/types';
import { cn, formatDuration, formatRelativeDate } from '@/lib/utils';

export default function Voice() {
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.currentPartner || s.partner);
  const partnerName = useCoupleStore((s) => s.getPartnerName());
  const myName = useCoupleStore((s) => s.getMyName());

  const [clips, setClips] = useState<VoiceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'partner' | 'mine'>('all');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Playback State for saved clips
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadClips();
  }, [couple]);

  const loadClips = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const res = await voiceApi.getAll(couple.id);
      if (res.data) {
        setClips(res.data);
      }
    } catch (err) {
      console.error('Failed to load voice clips:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start Recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewAudioUrl(url);
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes. Please grant microphone permission.');
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Cancel Recording
  const handleDiscardRecording = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setRecordedBlob(null);
    setPreviewAudioUrl(null);
    setIsPreviewPlaying(false);
    setRecordSeconds(0);
  };

  // Play/Pause Preview of newly recorded note
  const togglePreviewPlay = () => {
    if (!previewAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(previewAudioUrl);
      audio.onended = () => setIsPreviewPlaying(false);
      previewAudioRef.current = audio;
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  // Save & Upload Voice Note to Server
  const handleSaveAndSend = async () => {
    if (!recordedBlob || !couple || !partner) return;
    setIsUploading(true);

    try {
      const res = await voiceApi.upload(
        recordedBlob,
        couple.id,
        partner,
        recordSeconds || 1,
        'voice',
        true
      );

      if (res.data) {
        setClips((prev) => [res.data!, ...prev]);
        setUploadSuccess(true);
        handleDiscardRecording();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save voice note:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Play Saved Clip
  const handlePlaySavedClip = (clip: VoiceClip) => {
    if (playingClipId === clip.id) {
      activeAudioRef.current?.pause();
      setPlayingClipId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(clip.fileUrl);
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || clip.duration);
    };
    audio.onended = () => {
      setPlayingClipId(null);
      setCurrentTime(0);
    };
    audio.play();

    activeAudioRef.current = audio;
    setPlayingClipId(clip.id);
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeAudioRef.current) {
      const targetTime = Number(e.target.value);
      activeAudioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  // Delete clip
  const handleDeleteClip = async (id: string) => {
    if (!couple) return;
    if (!window.confirm('Delete this voice note?')) return;

    if (playingClipId === id && activeAudioRef.current) {
      activeAudioRef.current.pause();
      setPlayingClipId(null);
    }

    try {
      await voiceApi.delete(id, couple.id);
      setClips((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete clip:', err);
    }
  };

  // Filtered Clips
  const filteredClips = clips.filter((clip) => {
    if (activeTab === 'partner') return clip.partner !== partner;
    if (activeTab === 'mine') return clip.partner === partner;
    return true;
  });

  const partnerClipsCount = clips.filter((c) => c.partner !== partner).length;
  const myClipsCount = clips.filter((c) => c.partner === partner).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/30">
            <Mic className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">
              Voice & Audio Notes
            </h1>
            <p className="text-xs text-slate-400">
              Record voice notes for each other and listen to your partner's voice anytime ❤️
            </p>
          </div>
        </div>

        {uploadSuccess && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-bounce">
            <CheckCircle className="w-4 h-4" /> Voice Note Saved & Sent!
          </div>
        )}
      </div>

      {/* RECORDING CONSOLE */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-rose-950/20 border border-rose-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center py-4">
          {/* Microphone Icon / Status */}
          <div className="relative mb-5">
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-xl',
                isRecording
                  ? 'bg-rose-600 shadow-rose-600/50 scale-110'
                  : recordedBlob
                  ? 'bg-emerald-600 shadow-emerald-600/40'
                  : 'bg-gradient-to-tr from-rose-500 to-pink-600 shadow-rose-500/30 hover:scale-105'
              )}
            >
              <Mic className="w-9 h-9" />
            </div>

            {/* Pulsing rings while recording */}
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -inset-3 rounded-full border-2 border-rose-500 pointer-events-none"
              />
            )}
          </div>

          {/* Recording Timer / Status Text */}
          {isRecording ? (
            <div className="space-y-2 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 animate-pulse">
                Recording your voice for {partnerName}...
              </span>
              <p className="text-3xl font-mono font-bold text-white tracking-wider">
                {formatDuration(recordSeconds)}
              </p>

              {/* Dynamic waveform simulation */}
              <div className="flex items-center gap-1 h-8 max-w-xs mx-auto pt-2">
                {[40, 70, 90, 50, 100, 60, 80, 45, 95, 75, 55, 85, 40].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
                    transition={{ duration: 0.5 + (i % 4) * 0.15, repeat: Infinity }}
                    className="flex-1 bg-gradient-to-t from-rose-500 to-pink-400 rounded-full"
                  />
                ))}
              </div>
            </div>
          ) : recordedBlob ? (
            /* Review & Listen Before Sending */
            <div className="space-y-4 mb-6 max-w-md w-full">
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Recording Complete ({formatDuration(recordSeconds)})
              </span>
              <p className="text-xs text-slate-400">Listen to your note before saving it for {partnerName}:</p>

              <div className="flex items-center justify-center gap-3 p-3 bg-slate-900 rounded-2xl border border-white/10">
                <button
                  onClick={togglePreviewPlay}
                  className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-all"
                >
                  {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <span className="text-xs font-mono text-slate-300">
                  {isPreviewPlaying ? 'Playing preview...' : 'Tap to test audio playback'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-6 space-y-1">
              <h3 className="text-lg font-bold text-white">Record a Voice Note</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Leave a sweet message, good morning wish, or romantic reminder that {partnerName} can listen to anytime.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xl shadow-rose-600/30 transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                Done & Review
              </button>
            ) : recordedBlob ? (
              <>
                <button
                  onClick={handleDiscardRecording}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 text-xs font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard & Re-record
                </button>

                <button
                  onClick={handleSaveAndSend}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-sm shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isUploading ? 'Saving Voice Note...' : `Save & Share with ${partnerName}`}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'all'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            )}
          >
            All Voice Notes ({clips.length})
          </button>
          <button
            onClick={() => setActiveTab('partner')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'partner'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                : 'text-slate-400 hover:text-white'
            )}
          >
            🎙️ {partnerName}'s Voice ({partnerClipsCount})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'mine'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white'
            )}
          >
            My Notes ({myClipsCount})
          </button>
        </div>
      </div>

      {/* VOICE NOTES VAULT GRID */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Loading voice notes...</div>
      ) : filteredClips.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
          <Mic className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <h3 className="text-base font-semibold text-white mb-1">No voice notes in this tab yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tap "Start Recording" above to preserve loving voice messages that both of you can listen to!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClips.map((clip) => {
            const isPlaying = playingClipId === clip.id;
            const isPartnerNote = clip.partner !== partner;
            const authorName = clip.partner === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <motion.div
                key={clip.id}
                layout
                className={cn(
                  'p-5 rounded-3xl border transition-all backdrop-blur-xl shadow-xl flex flex-col justify-between group',
                  isPartnerNote
                    ? 'bg-gradient-to-br from-pink-950/20 via-slate-900/90 to-rose-950/20 border-pink-500/30'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md',
                          isPartnerNote
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        )}
                      >
                        {authorName ? authorName.charAt(0).toUpperCase() : '❤️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-white">{authorName}</p>
                          {isPartnerNote && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium">
                              Partner's Voice
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeDate(clip.createdAt || clip.date)}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
                      {formatDuration(clip.duration || 0)}
                    </span>
                  </div>

                  {/* Interactive Audio Player Bar */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePlaySavedClip(clip)}
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all shadow-md shrink-0',
                          isPlaying
                            ? 'bg-rose-500 shadow-rose-500/40'
                            : 'bg-white/10 hover:bg-rose-500'
                        )}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>

                      {/* Scrubber / Progress bar */}
                      <div className="flex-1 space-y-1">
                        <input
                          type="range"
                          min={0}
                          max={duration || clip.duration || 100}
                          value={isPlaying ? currentTime : 0}
                          onChange={handleSeek}
                          disabled={!isPlaying}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{isPlaying ? formatDuration(Math.floor(currentTime)) : '0s'}</span>
                          <span>{formatDuration(clip.duration || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 italic">
                    {clip.isChallenge ? 'Daily Challenge Clip' : 'Voice Memory'}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={clip.fileUrl}
                      download={`voice-${clip.date}.webm`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Download Audio"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    {!isPartnerNote && (
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
