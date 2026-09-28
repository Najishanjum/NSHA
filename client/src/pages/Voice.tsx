import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
  Clock,
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
    <div className="py-6 lg:py-10 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-purple">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / AUDIO VAULT</p>
            <h1 className="nsha-page-title">Voice & Audio Notes</h1>
            <p className="nsha-page-subtitle">
              Record voice notes for each other and listen to your partner's voice anytime ❤️
            </p>
          </div>
        </div>

        {uploadSuccess && (
          <div className="px-4 py-2 rounded-xl bg-nsha-green text-nsha-black border-2 border-nsha-black text-xs font-heading font-bold flex items-center gap-1.5 shadow-nsha-sm animate-bounce">
            <CheckCircle className="w-4 h-4 stroke-[2.5]" /> Voice Note Saved & Sent!
          </div>
        )}
      </div>

      {/* RECORDING CONSOLE */}
      <div className="nsha-card p-6 sm:p-8 bg-nsha-surface relative overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center py-2">
          {/* Microphone Icon / Status */}
          <div className="relative mb-5">
            <div
              className={cn(
                'w-20 h-20 rounded-2xl border-3 border-nsha-black flex items-center justify-center text-white transition-all shadow-nsha-sm',
                isRecording
                  ? 'bg-nsha-pink shadow-nsha scale-110'
                  : recordedBlob
                  ? 'bg-nsha-green text-nsha-black'
                  : 'bg-nsha-yellow text-nsha-black hover:scale-105'
              )}
            >
              <Mic className="w-8 h-8 stroke-[2.5]" />
            </div>

            {/* Pulsing indicator while recording */}
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -inset-2 rounded-2xl border-2 border-nsha-pink pointer-events-none"
              />
            )}
          </div>

          {/* Recording Timer / Status Text */}
          {isRecording ? (
            <div className="space-y-2 mb-6">
              <span className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-pink animate-pulse">
                Recording your voice for {partnerName}...
              </span>
              <p className="text-3xl font-mono font-bold text-nsha-black tracking-wider bg-white px-5 py-1 rounded-xl border-2 border-nsha-black inline-block shadow-sm">
                {formatDuration(recordSeconds)}
              </p>

              {/* Dynamic waveform simulation */}
              <div className="flex items-center gap-1.5 h-8 max-w-xs mx-auto pt-3">
                {[40, 70, 90, 50, 100, 60, 80, 45, 95, 75, 55, 85, 40].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] }}
                    transition={{ duration: 0.5 + (i % 4) * 0.15, repeat: Infinity }}
                    className="flex-1 bg-nsha-black rounded-full"
                  />
                ))}
              </div>
            </div>
          ) : recordedBlob ? (
            /* Review & Listen Before Sending */
            <div className="space-y-4 mb-6 max-w-md w-full">
              <span className="text-xs font-heading font-bold text-nsha-black flex items-center justify-center gap-1 bg-[#E6F9EC] border-2 border-nsha-black py-1 px-3 rounded-lg shadow-sm">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Recording Complete ({formatDuration(recordSeconds)})
              </span>
              <p className="text-xs text-nsha-text-secondary">Listen to your note before saving it for {partnerName}:</p>

              <div className="flex items-center justify-center gap-3 p-3 bg-white rounded-xl border-2 border-nsha-black shadow-nsha-sm">
                <button
                  onClick={togglePreviewPlay}
                  className="w-10 h-10 rounded-xl bg-nsha-yellow border-2 border-nsha-black text-nsha-black flex items-center justify-center shadow-sm hover:bg-nsha-pink hover:text-white transition-all"
                >
                  {isPreviewPlaying ? <Pause className="w-4 h-4 stroke-[2.5]" /> : <Play className="w-4 h-4 ml-0.5 stroke-[2.5]" />}
                </button>
                <span className="text-xs font-mono font-bold text-nsha-black">
                  {isPreviewPlaying ? 'Playing preview...' : 'Tap to test audio playback'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-6 space-y-1">
              <h3 className="text-xl font-heading font-bold text-nsha-black">Record a Voice Note</h3>
              <p className="text-xs text-nsha-text-secondary max-w-md">
                Leave a sweet message, good morning wish, or romantic reminder that {partnerName} can listen to anytime.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="nsha-btn nsha-btn-pink"
              >
                <Square className="w-4 h-4 fill-white" />
                Done & Review
              </button>
            ) : recordedBlob ? (
              <>
                <button
                  onClick={handleDiscardRecording}
                  disabled={isUploading}
                  className="nsha-btn nsha-btn-secondary nsha-btn-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard
                </button>

                <button
                  onClick={handleSaveAndSend}
                  disabled={isUploading}
                  className="nsha-btn nsha-btn-primary"
                >
                  <Send className="w-4 h-4" />
                  {isUploading ? 'Saving...' : `Save & Share with ${partnerName}`}
                </button>
              </>
            ) : (
              <button
                onClick={handleStartRecording}
                className="nsha-btn nsha-btn-primary"
              >
                <Mic className="w-4 h-4" />
                Start Recording
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all border-2 whitespace-nowrap',
            activeTab === 'all'
              ? 'bg-nsha-yellow text-nsha-black border-nsha-black shadow-[2px_2px_0_#090909]'
              : 'bg-nsha-surface text-nsha-text-secondary border-transparent hover:border-nsha-black/20'
          )}
        >
          All Voice Notes ({clips.length})
        </button>
        <button
          onClick={() => setActiveTab('partner')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all border-2 whitespace-nowrap',
            activeTab === 'partner'
              ? 'bg-nsha-yellow text-nsha-black border-nsha-black shadow-[2px_2px_0_#090909]'
              : 'bg-nsha-surface text-nsha-text-secondary border-transparent hover:border-nsha-black/20'
          )}
        >
          🎙️ {partnerName}'s Voice ({partnerClipsCount})
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-heading font-bold transition-all border-2 whitespace-nowrap',
            activeTab === 'mine'
              ? 'bg-nsha-yellow text-nsha-black border-nsha-black shadow-[2px_2px_0_#090909]'
              : 'bg-nsha-surface text-nsha-text-secondary border-transparent hover:border-nsha-black/20'
          )}
        >
          My Notes ({myClipsCount})
        </button>
      </div>

      {/* VOICE NOTES VAULT GRID */}
      {loading ? (
        <div className="py-12 text-center text-nsha-text-secondary font-heading text-sm">Loading voice notes...</div>
      ) : filteredClips.length === 0 ? (
        <div className="nsha-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-nsha-yellow border-2 border-nsha-black shadow-nsha-sm mx-auto flex items-center justify-center text-nsha-black mb-3">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-heading font-bold text-nsha-black mb-1">No voice notes in this tab yet</h3>
          <p className="text-xs text-nsha-text-secondary max-w-sm mx-auto">
            Tap "Start Recording" above to preserve loving voice messages that both of you can listen to!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredClips.map((clip) => {
            const isPlaying = playingClipId === clip.id;
            const isPartnerNote = clip.partner !== partner;
            const authorName = clip.partner === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <motion.div
                key={clip.id}
                layout
                className={cn(
                  'nsha-card p-5 flex flex-col justify-between group transition-all',
                  isPartnerNote
                    ? 'bg-[#FFF9EA]'
                    : 'bg-nsha-surface'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl border-2 border-nsha-black shadow-sm flex items-center justify-center font-heading font-bold text-sm',
                          isPartnerNote
                            ? 'bg-nsha-pink text-white'
                            : 'bg-nsha-purple text-white'
                        )}
                      >
                        {authorName ? authorName.charAt(0).toUpperCase() : '❤️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-heading font-bold text-nsha-black">{authorName}</p>
                          {isPartnerNote && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-nsha-yellow text-nsha-black font-heading font-bold border border-nsha-black">
                              Partner
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-nsha-text-secondary flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatRelativeDate(clip.createdAt || clip.date)}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white border border-nsha-black/30 text-nsha-black">
                      {formatDuration(clip.duration || 0)}
                    </span>
                  </div>

                  {/* Interactive Audio Player Bar */}
                  <div className="p-3.5 rounded-xl bg-white border-2 border-nsha-black shadow-sm space-y-2 mt-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePlaySavedClip(clip)}
                        className={cn(
                          'w-10 h-10 rounded-xl border-2 border-nsha-black flex items-center justify-center text-nsha-black transition-all shadow-sm shrink-0',
                          isPlaying
                            ? 'bg-nsha-pink text-white'
                            : 'bg-nsha-yellow hover:bg-nsha-pink hover:text-white'
                        )}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 stroke-[2.5]" /> : <Play className="w-4 h-4 ml-0.5 stroke-[2.5]" />}
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
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-nsha-black border border-nsha-black"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-nsha-text-secondary font-bold">
                          <span>{isPlaying ? formatDuration(Math.floor(currentTime)) : '0s'}</span>
                          <span>{formatDuration(clip.duration || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-3 mt-3 border-t-2 border-nsha-black/10 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-heading font-semibold text-nsha-text-secondary italic">
                    {clip.isChallenge ? 'Daily Challenge Clip' : 'Voice Memory'}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={clip.fileUrl}
                      download={`voice-${clip.date}.webm`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg border border-nsha-black/20 hover:bg-nsha-yellow transition-colors text-nsha-black"
                      title="Download Audio"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    {!isPartnerNote && (
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="p-1.5 rounded-lg border border-nsha-black/20 hover:bg-nsha-pink hover:text-white transition-colors text-nsha-black"
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
