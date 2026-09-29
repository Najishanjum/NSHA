import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Mic, Sparkles, X, Check, Play, Square,
  Plus, Smile, Music
} from 'lucide-react';
import { cn, getDateString } from '@/lib/utils';
import { useCoupleStore, useUIStore, useNotificationStore } from '@/stores';
import { challengeApi, photoApi, voiceApi, questionApi, moodApi } from '@/services/api';
import { DAILY_PHOTO_PROMPTS, DAILY_QUESTIONS, MOOD_OPTIONS } from '@/types';
import type { DailyChallenge, Photo, VoiceClip, MoodValue } from '@/types';
import { useLanguage } from '@/i18n';
import { generateRomanticWav } from '@/utils/audioSynthesizer';


export default function Challenge() {
  const { t } = useLanguage();
  const couple = useCoupleStore((s) => s.couple);
  const currentPartner = useCoupleStore((s) => s.currentPartner);
  const myName = useCoupleStore((s) => s.getMyName());
  const partnerName = useCoupleStore((s) => s.getPartnerName());
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
      addNotification({ type: 'challenge', title: t('photo.uploadSuccess'), message: `${selectedFiles.length} photo(s) added!` });
      await loadData();
    } catch (e: any) {
      addNotification({ type: 'challenge', title: t('common.error'), message: e.message || 'Could not upload photos' });
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
      addNotification({ type: 'challenge', title: 'Microphone access needed', message: 'Please allow microphone access' });
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
      addNotification({ type: 'challenge', title: t('voice.uploadSuccess'), message: t('challenge.clipDone') });
      await loadData();
    } catch (e: any) {
      addNotification({ type: 'challenge', title: t('common.error'), message: e.message });
    }
  };

  const handleAnswerQuestion = async () => {
    if (!couple || !currentPartner || !questionAnswer.trim()) return;
    setSubmittingAnswer(true);
    try {
      await questionApi.answer(couple.id, currentPartner, questionAnswer.trim());
      setQuestionAnswer('');
      addNotification({ type: 'challenge', title: t('question.answerSent'), message: '' });
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
      addNotification({ type: 'challenge', title: t('mood.moodSet'), message: '' });
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
    <div className="py-6 lg:py-10 max-w-4xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-pink">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / DAILY CHALLENGE</p>
            <h1 className="nsha-page-title">{t('challenge.title')}</h1>
            <p className="nsha-page-subtitle">{t('challenge.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="nsha-badge nsha-badge-purple">
            {isComplete ? 'Challenge Completed 🎉' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Completion banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="nsha-card p-6 text-center bg-nsha-yellow border-3 border-nsha-black shadow-nsha space-y-3"
          >
            <span className="text-4xl block">🎉</span>
            <h2 className="font-heading text-2xl font-bold text-nsha-black">{t('challenge.challengeCompleted')}</h2>
            <p className="font-heading font-medium text-nsha-black text-sm">{t('challenge.youAreOnFire')}</p>
            <button
              onClick={() => {
                const wav = generateRomanticWav('celebration');
                const audio = new Audio(wav);
                audio.play().catch(() => {});
              }}
              className="nsha-btn nsha-btn-black nsha-btn-sm inline-flex items-center gap-2"
            >
              <Music className="w-4 h-4" />
              {t('music.celebrationMusic')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Photo Challenge ─── */}
      <div className="nsha-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b-2 border-nsha-black/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="nsha-icon-box nsha-icon-box-lime nsha-icon-box-sm">
              <Camera className="w-4 h-4 text-nsha-black" />
            </div>
            <h2 className="font-heading font-bold text-xl text-nsha-black">{t('challenge.photosTitle')}</h2>
          </div>
          <span className="text-xs font-heading font-bold text-nsha-text-secondary bg-white px-3 py-1 rounded-lg border border-nsha-black/20">
            {Math.min(myPhotoCount + partnerPhotoCount, requiredPhotos * 2)} / {requiredPhotos * 2} photos
          </span>
        </div>

        {/* Progress bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border-2 border-nsha-black shadow-sm space-y-2">
            <div className="flex justify-between text-xs font-heading font-bold">
              <span className="text-nsha-black">{myName}</span>
              <span className={cn(myPhotoCount >= requiredPhotos ? 'text-emerald-700' : 'text-nsha-text-secondary')}>
                {myPhotoCount >= requiredPhotos ? t('challenge.missionComplete') : t('challenge.photosCount', { count: myPhotoCount })} {myPhotoCount >= requiredPhotos ? '✅' : ''}
              </span>
            </div>
            <div className="nsha-progress">
              <motion.div
                className="nsha-progress-fill bg-nsha-green"
                animate={{ width: `${Math.min(100, (myPhotoCount / requiredPhotos) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border-2 border-nsha-black shadow-sm space-y-2">
            <div className="flex justify-between text-xs font-heading font-bold">
              <span className="text-nsha-black">{partnerName}</span>
              <span className={cn(partnerPhotoCount >= requiredPhotos ? 'text-emerald-700' : 'text-nsha-text-secondary')}>
                {t('challenge.photosCount', { count: partnerPhotoCount })} {partnerPhotoCount >= requiredPhotos ? '✅' : ''}
              </span>
            </div>
            <div className="nsha-progress">
              <motion.div
                className="nsha-progress-fill bg-nsha-purple"
                animate={{ width: `${Math.min(100, (partnerPhotoCount / requiredPhotos) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Photo prompts */}
        {photosRemaining > 0 && (
          <div className="p-4 rounded-xl bg-[#FFF9E6] border-2 border-nsha-black space-y-2 shadow-sm">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">{t('photo.selectPrompt')}</p>
            <div className="space-y-1">
              {todayPrompts.slice(myPhotoCount, requiredPhotos).map((prompt, i) => (
                <p key={i} className="text-xs font-body font-medium text-nsha-black pl-3 border-l-2 border-nsha-black">
                  {prompt}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded photos */}
        {(myPhotos.length > 0 || partnerPhotosArr.length > 0) && (
          <div className="space-y-4">
            {myPhotos.length > 0 && (
              <div>
                <p className="text-xs font-heading font-bold text-nsha-black mb-2">{myName}'s Photos:</p>
                <div className="grid grid-cols-5 gap-3">
                  {myPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setActivePhotoModal(photo)}
                      className="aspect-square rounded-xl overflow-hidden bg-nsha-surface border-2 border-nsha-black relative cursor-pointer hover:-translate-y-1 transition-all p-1 flex items-center justify-center shadow-sm"
                    >
                      <img src={photo.fileUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute bottom-1.5 right-1.5 bg-nsha-green border border-nsha-black rounded-full p-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-nsha-black stroke-[3]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {partnerPhotosArr.length > 0 && (
              <div>
                <p className="text-xs font-heading font-bold text-nsha-black mb-2">{partnerName}'s Photos:</p>
                <div className="grid grid-cols-5 gap-3">
                  {partnerPhotosArr.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setActivePhotoModal(photo)}
                      className="aspect-square rounded-xl overflow-hidden bg-nsha-surface border-2 border-nsha-black relative cursor-pointer hover:-translate-y-1 transition-all p-1 flex items-center justify-center shadow-sm"
                    >
                      <img src={photo.fileUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      <div className="absolute bottom-1.5 right-1.5 bg-nsha-pink border border-nsha-black rounded-full p-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 rounded-xl border-3 border-dashed border-nsha-black hover:bg-nsha-yellow/20 flex items-center justify-center gap-2 font-heading font-bold text-sm text-nsha-black transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t('photo.sendPhoto')} ({t('challenge.photosRemaining', { count: photosRemaining })})</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* ─── VC Challenge ─── */}
      <div className="nsha-card p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b-2 border-nsha-black/10 pb-4">
          <div className="nsha-icon-box nsha-icon-box-purple nsha-icon-box-sm">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-heading font-bold text-xl text-nsha-black">{t('challenge.vcTitle')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* My VC with Listen button */}
          <div className={cn('p-4 rounded-xl border-2 border-nsha-black flex items-center justify-between shadow-sm', myVC ? 'bg-[#E6F9EC]' : 'bg-white')}>
            <div>
              <p className="text-xs font-heading font-bold text-nsha-black">{myName}</p>
              <p className="text-xs text-nsha-text-secondary mt-0.5">{myVC ? `✅ ${t('challenge.clipDone')} (${formatTime(myVC.duration)})` : `⏳ ${t('challenge.clipPending')}`}</p>
            </div>
            {myVC && (
              <button
                onClick={() => handlePlayVC(myVC)}
                className="nsha-btn nsha-btn-primary nsha-btn-sm"
              >
                {playingVC === myVC.id ? <Square className="w-3.5 h-3.5 fill-nsha-black" /> : <Play className="w-3.5 h-3.5 fill-nsha-black" />}
                {playingVC === myVC.id ? t('voice.pause') : t('voice.play')}
              </button>
            )}
          </div>

          {/* Partner VC with Listen button */}
          <div className={cn('p-4 rounded-xl border-2 border-nsha-black flex items-center justify-between shadow-sm', partnerVC ? 'bg-[#FBEBF1]' : 'bg-white')}>
            <div>
              <p className="text-xs font-heading font-bold text-nsha-black">{partnerName}</p>
              <p className="text-xs text-nsha-text-secondary mt-0.5">{partnerVC ? `✅ ${t('challenge.clipDone')} (${formatTime(partnerVC.duration)})` : `⏳ ${t('voice.recordForPartner')}`}</p>
            </div>
            {partnerVC && (
              <button
                onClick={() => handlePlayVC(partnerVC)}
                className="nsha-btn nsha-btn-pink nsha-btn-sm"
              >
                {playingVC === partnerVC.id ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                {playingVC === partnerVC.id ? t('voice.pause') : t('voice.play')}
              </button>
            )}
          </div>
        </div>

        {!myVC && (
          <button
            onClick={() => setShowVCModal(true)}
            className="nsha-btn nsha-btn-primary w-full"
          >
            <Mic className="w-5 h-5 stroke-[2.5]" />
            {t('voice.sendClip')}
          </button>
        )}
      </div>

      {/* ─── Daily Question ─── */}
      <div className="nsha-card p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3 border-b-2 border-nsha-black/10 pb-4">
          <div className="nsha-icon-box nsha-icon-box-yellow nsha-icon-box-sm">
            <Sparkles className="w-4 h-4 text-nsha-black" />
          </div>
          <h2 className="font-heading font-bold text-xl text-nsha-black">{t('question.title')}</h2>
        </div>

        <p className="font-heading font-bold text-lg text-nsha-black bg-[#FFF7DA] p-4 rounded-xl border-2 border-nsha-black shadow-sm">
          "{todayQuestion}"
        </p>

        {!myQuestion ? (
          <div className="space-y-3">
            <textarea
              value={questionAnswer}
              onChange={(e) => setQuestionAnswer(e.target.value)}
              placeholder={t('question.typeAnswer')}
              rows={3}
              className="nsha-input resize-none"
            />
            <button
              onClick={handleAnswerQuestion}
              disabled={!questionAnswer.trim() || submittingAnswer}
              className="nsha-btn nsha-btn-primary w-full"
            >
              {submittingAnswer ? t('common.loading') : t('question.submitAnswer')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-800 bg-[#E6F9EC] border-2 border-nsha-black p-3.5 rounded-xl font-heading font-bold text-sm shadow-sm">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{t('question.answerSent')}</span>
          </div>
        )}

        {partnerQuestionDone && (
          <p className="text-xs font-heading font-bold text-nsha-text-secondary mt-1">{t('question.bothAnswered')}</p>
        )}
      </div>

      {/* ─── Mood ─── */}
      <div className="nsha-card p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3 border-b-2 border-nsha-black/10 pb-4">
          <div className="nsha-icon-box nsha-icon-box-pink nsha-icon-box-sm">
            <Smile className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-heading font-bold text-xl text-nsha-black">{t('mood.title')}</h2>
        </div>

        <div className="flex items-center justify-around flex-wrap gap-3">
          {MOOD_OPTIONS.map(opt => (
            <motion.button
              key={opt.value}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => !myMoodVal && handleMoodSelect(opt.value)}
              disabled={!!myMoodVal || submittingMood}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all min-w-[70px]',
                myMoodVal === opt.value
                  ? 'bg-nsha-yellow border-nsha-black shadow-nsha-sm'
                  : selectedMood === opt.value && !myMoodVal
                  ? 'bg-nsha-yellow-soft border-nsha-black'
                  : !myMoodVal
                  ? 'bg-white border-nsha-black/20 hover:border-nsha-black cursor-pointer'
                  : 'bg-white border-transparent opacity-40'
              )}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-xs font-heading font-bold text-nsha-black">
                {t(`mood.options.${opt.value === 'missing-you' ? 'missingYou' : opt.value === 'not-great' ? 'notGreat' : opt.value}`)}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ─── Photo Upload Modal ─── */}
      <AnimatePresence>
        {showPhotoModal && previewUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-nsha-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] shadow-nsha w-full max-w-lg p-6 sm:p-8 max-h-[85vh] overflow-y-auto space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-nsha-black pb-3">
                <h3 className="font-heading font-bold text-lg text-nsha-black">{t('photo.uploadPhoto')}</h3>
                <button
                  onClick={() => { setShowPhotoModal(false); previewUrls.forEach(u => URL.revokeObjectURL(u)); setSelectedFiles([]); setPreviewUrls([]); }}
                  className="p-1.5 rounded-xl border-2 border-nsha-black hover:bg-nsha-yellow transition-all"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-nsha-black shadow-sm bg-white">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeSelectedFile(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-nsha-black text-white flex items-center justify-center hover:bg-nsha-pink transition-colors"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ))}
              </div>

              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="nsha-input"
              />

              <button
                onClick={handleUploadPhotos}
                disabled={uploadingPhotos}
                className="nsha-btn nsha-btn-primary w-full"
              >
                {uploadingPhotos ? t('common.loading') : t('photo.uploadSuccess')}
              </button>
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
            className="fixed inset-0 bg-nsha-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] shadow-nsha w-full max-w-sm p-8 text-center space-y-5"
            >
              <h3 className="font-heading font-bold text-lg text-nsha-black">
                {audioBlob ? t('voice.clipCompleted') : recording ? t('voice.recording') : t('voice.sendClip')}
              </h3>

              <div className="py-2">
                {recording ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-20 h-20 rounded-2xl bg-nsha-pink border-3 border-nsha-black shadow-nsha mx-auto flex items-center justify-center"
                  >
                    <Mic className="w-9 h-9 text-white stroke-[2.5]" />
                  </motion.div>
                ) : audioBlob ? (
                  <div className="w-20 h-20 rounded-2xl bg-nsha-green border-3 border-nsha-black shadow-nsha mx-auto flex items-center justify-center">
                    <Check className="w-9 h-9 text-nsha-black stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-nsha-yellow border-3 border-nsha-black shadow-nsha mx-auto flex items-center justify-center">
                    <Mic className="w-9 h-9 text-nsha-black stroke-[2.5]" />
                  </div>
                )}
              </div>

              <p className="font-mono font-bold text-2xl text-nsha-black">{formatTime(recordingTime)}</p>

              <div className="flex items-center justify-center gap-3 pt-2">
                {!recording && !audioBlob && (
                  <>
                    <button onClick={cancelRecording} className="nsha-btn nsha-btn-secondary nsha-btn-sm">
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={startRecording}
                      className="nsha-btn nsha-btn-primary nsha-btn-sm"
                    >
                      {t('voice.recordVoice')}
                    </button>
                  </>
                )}
                {recording && (
                  <button
                    onClick={stopRecording}
                    className="nsha-btn nsha-btn-pink w-full"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    {t('voice.stopRecording')}
                  </button>
                )}
                {audioBlob && (
                  <>
                    <button onClick={cancelRecording} className="nsha-btn nsha-btn-secondary nsha-btn-sm">
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleUploadVC}
                      className="nsha-btn nsha-btn-primary nsha-btn-sm"
                    >
                      {t('voice.sendClip')} ❤️
                    </button>
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
            className="fixed inset-0 z-50 bg-nsha-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div onClick={(e) => e.stopPropagation()} className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden bg-nsha-surface border-3 border-nsha-black shadow-nsha p-2 max-h-[80vh] flex items-center justify-center">
                <img src={activePhotoModal.fileUrl} alt="" className="max-h-[75vh] max-w-full object-contain rounded-xl" />
              </div>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="mt-4 nsha-btn nsha-btn-primary nsha-btn-sm"
              >
                {t('common.back')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
