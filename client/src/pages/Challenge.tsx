import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Mic, MessageCircle, Heart, Sparkles, Upload, X, Check, Play, Square, Pause,
  ChevronRight, Image as ImageIcon, Video, Plus, Smile, MicOff
} from 'lucide-react';
import { cn, getDateString } from '@/lib/utils';
import { useCoupleStore, useUIStore, useNotificationStore } from '@/stores';
import { challengeApi, photoApi, voiceApi, questionApi, moodApi } from '@/services/api';
import { DAILY_PHOTO_PROMPTS, DAILY_QUESTIONS, MOOD_OPTIONS } from '@/types';
import type { DailyChallenge, Photo, VoiceClip, MoodValue, PartnerNumber } from '@/types';

export default function Challenge() {
  const couple = useCoupleStore((s) => s.couple);
  const currentPartner = useCoupleStore((s) => s.currentPartner);
  const myName = useCoupleStore((s) => s.getMyName());
  const partnerName = useCoupleStore((s) => s.getPartnerName());
  const { setShowCompletionAnimation } = useUIStore();
  const { addNotification } = useNotificationStore();

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [todayPhotos, setTodayPhotos] = useState<Photo[]>([]);
  const [todayVCs, setTodayVCs] = useState<VoiceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVCModal, setShowVCModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [submittingMood, setSubmittingMood] = useState(false);
  const [caption, setCaption] = useState('');
  const [activePhotoModal, setActivePhotoModal] = useState<Photo | null>(null);
  const [playingVC, setPlayingVC] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = getDateString();
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const todayPrompts = DAILY_PHOTO_PROMPTS[dayOfYear % DAILY_PHOTO_PROMPTS.length];
  const todayQuestion = DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length];

  useEffect(() => {
    loadData();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [couple]);

  const loadData = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const [cRes, pRes, vRes] = await Promise.allSettled([
        challengeApi.getToday(couple.id),
        photoApi.getToday(couple.id),
        voiceApi.getToday(couple.id),
      ]);
      if (cRes.status === 'fulfilled' && cRes.value.data) setChallenge(cRes.value.data);
      if (pRes.status === 'fulfilled' && pRes.value.data) setTodayPhotos(pRes.value.data);
      if (vRes.status === 'fulfilled' && vRes.value.data) setTodayVCs(vRes.value.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  // Photo handling
  const myPhotos = todayPhotos.filter(p => p.partner === currentPartner && p.isChallenge);
  const partnerPhotosArr = todayPhotos.filter(p => p.partner !== currentPartner && p.isChallenge);
  const myPhotoCount = myPhotos.length;
  const partnerPhotoCount = partnerPhotosArr.length;
  const requiredPhotos = challenge?.requiredPhotos || 5;
  const photosRemaining = Math.max(0, requiredPhotos - myPhotoCount);

  // VC handling
  const myVC = todayVCs.find(v => v.partner === currentPartner && v.isChallenge);
  const partnerVC = todayVCs.find(v => v.partner !== currentPartner && v.isChallenge);

  // Question / Mood
  const myQuestion = challenge ? (currentPartner === 1 ? challenge.partner1Question : challenge.partner2Question) : false;
  const partnerQuestionDone = challenge ? (currentPartner === 1 ? challenge.partner2Question : challenge.partner1Question) : false;
  const myMoodVal = challenge ? (currentPartner === 1 ? challenge.partner1Mood : challenge.partner2Mood) : null;
  const partnerMoodVal = challenge ? (currentPartner === 1 ? challenge.partner2Mood : challenge.partner1Mood) : null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = Math.min(files.length, photosRemaining);
    const selected = files.slice(0, maxFiles);
    setSelectedFiles(selected);
    setPreviewUrls(selected.map(f => URL.createObjectURL(f)));
    setShowPhotoModal(true);
    e.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadPhotos = async () => {
    if (!couple || !currentPartner || selectedFiles.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (const file of selectedFiles) {
        await photoApi.upload(file, couple.id, currentPartner, caption, true);
      }
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      setShowPhotoModal(false);
      setCaption('');
      addNotification({ type: 'challenge', title: 'Photos uploaded ❤️', message: `${selectedFiles.length} photo(s) added to today's challenge` });
      await loadData();
    } catch (e: any) {
      addNotification({ type: 'challenge', title: 'Upload failed', message: e.message || 'Could not upload photos' });
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      addNotification({ type: 'challenge', title: 'Microphone access needed', message: 'Please allow microphone access to record a voice clip' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
    setShowVCModal(false);
  };

  const handleUploadVC = async () => {
    if (!couple || !currentPartner || !audioBlob) return;
    try {
      await voiceApi.upload(audioBlob, couple.id, currentPartner, recordingTime, 'voice', true);
      setAudioBlob(null);
      setRecordingTime(0);
      setShowVCModal(false);
      addNotification({ type: 'challenge', title: 'Voice clip sent ❤️', message: 'Your daily VC is complete!' });
      await loadData();
    } catch (e: any) {
      addNotification({ type: 'challenge', title: 'Upload failed', message: e.message });
    }
  };

  const handleAnswerQuestion = async () => {
    if (!couple || !currentPartner || !questionAnswer.trim()) return;
    setSubmittingAnswer(true);
    try {
      await questionApi.answer(couple.id, currentPartner, questionAnswer.trim());
      setQuestionAnswer('');
      addNotification({ type: 'challenge', title: 'Answer saved ❤️', message: 'Your response has been recorded' });
      await loadData();
    } catch {} finally {
      setSubmittingAnswer(false);
    }
  };

  const handleMoodSelect = async (mood: MoodValue) => {
    if (!couple || !currentPartner) return;
    setSelectedMood(mood);
    setSubmittingMood(true);
    try {
      await moodApi.set(couple.id, currentPartner, mood);
      addNotification({ type: 'challenge', title: 'Mood saved ❤️', message: '' });
      await loadData();
    } catch {} finally {
      setSubmittingMood(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handlePlayVC = (clip: VoiceClip) => {
    if (playingVC === clip.id) {
      activeAudioRef.current?.pause();
      setPlayingVC(null);
      return;
    }
    if (activeAudioRef.current) activeAudioRef.current.pause();
    const audio = new Audio(clip.fileUrl);
    audio.onended = () => setPlayingVC(null);
    audio.play();
    activeAudioRef.current = audio;
    setPlayingVC(clip.id);
  };

  const isComplete = challenge?.status === 'completed';

  return (
    <div className="px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            <span className="gradient-text">Today's Challenge</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Completion banner */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="gradient-primary rounded-2xl p-6 text-center text-white glow-primary-strong"
            >
              <span className="text-4xl mb-2 block">🎉</span>
              <h2 className="font-heading text-xl font-bold">Daily Challenge Complete!</h2>
              <p className="text-white/80 text-sm mt-1">You both showed up today. ❤️</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Photo Challenge ─── */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Photos</h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.min(myPhotoCount + partnerPhotoCount, requiredPhotos * 2)} / {requiredPhotos * 2}
            </span>
          </div>

          {/* Progress bars */}
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{myName}</span>
                <span className={cn(myPhotoCount >= requiredPhotos ? 'text-green-400' : 'text-muted-foreground')}>
                  {Math.min(myPhotoCount, requiredPhotos)}/{requiredPhotos} {myPhotoCount >= requiredPhotos ? '✅' : ''}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-primary rounded-full"
                  animate={{ width: `${Math.min(100, (myPhotoCount / requiredPhotos) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{partnerName}</span>
                <span className={cn(partnerPhotoCount >= requiredPhotos ? 'text-green-400' : 'text-muted-foreground')}>
                  {Math.min(partnerPhotoCount, requiredPhotos)}/{requiredPhotos} {partnerPhotoCount >= requiredPhotos ? '✅' : ''}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-secondary rounded-full"
                  animate={{ width: `${Math.min(100, (partnerPhotoCount / requiredPhotos) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Photo prompts */}
          {photosRemaining > 0 && (
            <div className="mb-4 space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Photo Prompts</p>
              {todayPrompts.slice(myPhotoCount, requiredPhotos).map((prompt, i) => (
                <p key={i} className="text-sm text-muted-foreground/80 pl-3 border-l-2 border-primary/30">
                  {prompt}
                </p>
              ))}
            </div>
          )}

          {/* Uploaded photos - Click to view full image */}
          {(myPhotos.length > 0 || partnerPhotosArr.length > 0) && (
            <div className="mb-4 space-y-3">
              {myPhotos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">My Photos (click to view full):</p>
                  <div className="grid grid-cols-5 gap-2">
                    {myPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setActivePhotoModal(photo)}
                        className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/10 relative cursor-pointer hover:border-rose-500/50 hover:scale-105 transition-all p-1 flex items-center justify-center"
                      >
                        <img src={photo.fileUrl} alt="" className="w-full h-full object-contain rounded-lg" />
                        <div className="absolute bottom-1 right-1 bg-black/70 rounded-full p-0.5">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {partnerPhotosArr.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">{partnerName}'s Photos:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {partnerPhotosArr.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setActivePhotoModal(photo)}
                        className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-white/10 relative cursor-pointer hover:border-pink-500/50 hover:scale-105 transition-all p-1 flex items-center justify-center"
                      >
                        <img src={photo.fileUrl} alt="" className="w-full h-full object-contain rounded-lg" />
                        <div className="absolute bottom-1 right-1 bg-black/70 rounded-full p-0.5">
                          <Check className="w-3 h-3 text-pink-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload button */}
          {photosRemaining > 0 && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 text-primary flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Photos ({photosRemaining} remaining)</span>
            </motion.button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            capture={undefined}
          />
        </div>

        {/* ─── VC Challenge ─── */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Daily Voice Clip</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {/* My VC with Listen button */}
            <div className={cn('p-3 rounded-xl border flex items-center justify-between', myVC ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-white/5')}>
              <div>
                <p className="text-xs font-semibold text-white">{myName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{myVC ? `✅ Sent (${formatTime(myVC.duration)})` : '⏳ Not sent yet'}</p>
              </div>
              {myVC && (
                <button
                  onClick={() => handlePlayVC(myVC)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-emerald-600 transition-all"
                >
                  {playingVC === myVC.id ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                  {playingVC === myVC.id ? 'Stop' : 'Listen'}
                </button>
              )}
            </div>

            {/* Partner VC with Listen button */}
            <div className={cn('p-3 rounded-xl border flex items-center justify-between', partnerVC ? 'bg-pink-500/10 border-pink-500/30' : 'bg-slate-900/50 border-white/5')}>
              <div>
                <p className="text-xs font-semibold text-white">{partnerName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{partnerVC ? `✅ Sent (${formatTime(partnerVC.duration)})` : '⏳ Waiting for partner'}</p>
              </div>
              {partnerVC && (
                <button
                  onClick={() => handlePlayVC(partnerVC)}
                  className="px-3 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-pink-600 transition-all"
                >
                  {playingVC === partnerVC.id ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                  {playingVC === partnerVC.id ? 'Stop' : 'Listen'}
                </button>
              )}
            </div>
          </div>

          {!myVC && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setShowVCModal(true)}
              className="w-full gradient-primary text-white font-semibold py-3 rounded-xl glow-primary flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Record Voice Clip
            </motion.button>
          )}
        </div>

        {/* ─── Daily Question ─── */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">Daily Question</h2>
          </div>
          <p className="text-foreground italic mb-4">"{todayQuestion}"</p>

          {!myQuestion ? (
            <div className="space-y-3">
              <textarea
                value={questionAnswer}
                onChange={(e) => setQuestionAnswer(e.target.value)}
                placeholder="Your answer..."
                rows={3}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAnswerQuestion}
                disabled={!questionAnswer.trim() || submittingAnswer}
                className="w-full gradient-primary text-white font-semibold py-3 rounded-xl glow-primary disabled:opacity-50"
              >
                {submittingAnswer ? 'Saving...' : 'Submit Answer ❤️'}
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>You've answered today's question</span>
            </div>
          )}

          {partnerQuestionDone && (
            <p className="text-xs text-muted-foreground mt-2">{partnerName} has also answered ✓</p>
          )}
        </div>

        {/* ─── Mood ─── */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smile className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-lg">How are you feeling?</h2>
          </div>

          <div className="flex items-center justify-around">
            {MOOD_OPTIONS.map(opt => (
              <motion.button
                key={opt.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => !myMoodVal && handleMoodSelect(opt.value)}
                disabled={!!myMoodVal || submittingMood}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
                  myMoodVal === opt.value && 'bg-primary/20 ring-2 ring-primary/50',
                  (selectedMood === opt.value && !myMoodVal) && 'bg-primary/10',
                  !myMoodVal && 'hover:bg-muted/50 cursor-pointer',
                  myMoodVal && myMoodVal !== opt.value && 'opacity-40',
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-xs text-muted-foreground">{opt.label}</span>
              </motion.button>
            ))}
          </div>

          {partnerMoodVal && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {partnerName} is feeling {MOOD_OPTIONS.find(m => m.value === partnerMoodVal)?.emoji} {MOOD_OPTIONS.find(m => m.value === partnerMoodVal)?.label}
            </p>
          )}
        </div>

      </motion.div>

      {/* ─── Photo Upload Modal ─── */}
      <AnimatePresence>
        {showPhotoModal && previewUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="glass rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-lg">Upload Photos</h3>
                <button onClick={() => { setShowPhotoModal(false); previewUrls.forEach(u => URL.revokeObjectURL(u)); setSelectedFiles([]); setPreviewUrls([]); }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeSelectedFile(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>

              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
              />

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleUploadPhotos}
                disabled={uploadingPhotos}
                className="w-full gradient-primary text-white font-semibold py-3 rounded-xl glow-primary disabled:opacity-60"
              >
                {uploadingPhotos ? 'Uploading...' : `Upload ${selectedFiles.length} Photo(s) ❤️`}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── VC Recording Modal ─── */}
      <AnimatePresence>
        {showVCModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass rounded-2xl w-full max-w-sm p-8 text-center"
            >
              <h3 className="font-heading font-semibold text-lg mb-6">
                {audioBlob ? 'Voice Clip Ready' : recording ? 'Recording...' : 'Record Voice Clip'}
              </h3>

              {/* Recording visualizer */}
              <div className="mb-6">
                {recording ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-24 h-24 rounded-full gradient-primary mx-auto flex items-center justify-center glow-primary-strong"
                  >
                    <Mic className="w-10 h-10 text-white" />
                  </motion.div>
                ) : audioBlob ? (
                  <div className="w-24 h-24 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <Mic className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <p className="font-mono text-2xl mb-6">{formatTime(recordingTime)}</p>

              <div className="flex items-center justify-center gap-4">
                {!recording && !audioBlob && (
                  <>
                    <button onClick={cancelRecording} className="px-6 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium">
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={startRecording}
                      className="px-6 py-2.5 rounded-xl gradient-primary text-white font-semibold glow-primary"
                    >
                      Start Recording
                    </motion.button>
                  </>
                )}
                {recording && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={stopRecording}
                    className="px-8 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop
                  </motion.button>
                )}
                {audioBlob && (
                  <>
                    <button onClick={cancelRecording} className="px-6 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium">
                      Redo
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleUploadVC}
                      className="px-6 py-2.5 rounded-xl gradient-primary text-white font-semibold glow-primary"
                    >
                      Send VC ❤️
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-view Photo Modal */}
      <AnimatePresence>
        {activePhotoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePhotoModal(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div onClick={(e) => e.stopPropagation()} className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl p-2 max-h-[80vh] flex items-center justify-center">
                <img src={activePhotoModal.fileUrl} alt="" className="max-h-[75vh] max-w-full object-contain rounded-xl" />
              </div>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="mt-3 px-6 py-2 rounded-xl bg-white/10 hover:bg-rose-500 text-white text-xs font-semibold transition-all"
              >
                Close Full Image
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
