import type {
  Couple,
  PartnerNumber,
  DailyChallenge,
  Photo,
  VoiceClip,
  Message,
  Call,
  MoodValue,
  QuestionAnswer,
  StreakData,
  CoupleStatistics,
  DailyMemory,
  CalendarDay,
  TimelineEvent,
  Achievement,
  UserAchievement,
  BucketListItem,
  LoveNote,
  Surprise,
  ImportantDate,
  AppNotification,
  ApiResponse,
} from '@/types';

import {
  isSupabaseConfigured,
  supabaseCoupleApi,
  supabaseChallengeApi,
  supabasePhotoApi,
  supabaseVoiceApi,
  supabaseChatApi,
  supabaseMoodApi,
  supabaseQuestionApi,
  supabaseBucketListApi,
  supabaseLoveNoteExtApi as supabaseLoveNoteApi,
  supabaseSurpriseExtApi as supabaseSurpriseApi,
  supabaseDatesApi,
  supabaseStreakApi,
  supabaseStatsApi,
} from './supabaseApi';


// ─── Couple ───

export const coupleApi = {
  create: (data: {
    partner1Name: string;
    partner2Name: string;
    coupleNickname: string;
    relationshipStartDate: string;
  }) => supabaseCoupleApi.create(data),

  get: (code: string) => supabaseCoupleApi.get(code),

  join: (code: string, partner: PartnerNumber) => supabaseCoupleApi.join(code, partner),

  update: (code: string, data: Partial<Couple>) => supabaseCoupleApi.update(code, data),
};

// ─── Challenge ───

export const challengeApi = {
  getToday: (coupleId: string) => supabaseChallengeApi.getToday(coupleId),
  getByDate: (coupleId: string, date: string) => supabaseChallengeApi.getByDate(coupleId, date),
  getHistory: (coupleId: string) => supabaseChallengeApi.getHistory(coupleId),
};

// ─── Photos ───

export const photoApi = {
  upload: async (
    file: File,
    coupleId: string,
    partner: PartnerNumber,
    caption?: string,
    isChallenge: boolean = true
  ) => {
    // Convert File to dataURL for Supabase Storage upload
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return supabasePhotoApi.upload(dataUrl, coupleId, partner, caption, isChallenge);
  },

  getToday: (coupleId: string) => supabasePhotoApi.getToday(coupleId),

  getAll: (coupleId: string, params?: { date?: string; partner?: string; filter?: string; page?: number }) =>
    supabasePhotoApi.getAll(coupleId, params),

  delete: (id: string, coupleId: string) => supabasePhotoApi.delete(id, coupleId),

  toggleFavorite: (id: string, coupleId: string) => supabasePhotoApi.toggleFavorite(id, coupleId),
};

// ─── Voice/Video ───

export const voiceApi = {
  upload: async (
    file: Blob,
    coupleId: string,
    partner: PartnerNumber,
    duration: number,
    type: 'voice' | 'video' = 'voice',
    isChallenge: boolean = true
  ) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return supabaseVoiceApi.upload(dataUrl, coupleId, partner, duration, type, isChallenge);
  },

  getToday: (coupleId: string) => supabaseVoiceApi.getToday(coupleId),
  getAll: (coupleId: string) => supabaseVoiceApi.getAll(coupleId),
  delete: (id: string, coupleId: string) => supabaseVoiceApi.delete(id, coupleId),
};

// ─── Chat ───

export const chatApi = {
  getMessages: (coupleId: string, before?: string, limit: number = 50) =>
    supabaseChatApi.getMessages(coupleId, before, limit),

  send: (
    coupleId: string,
    partner: PartnerNumber,
    content: string,
    type: 'text' | 'image' | 'voice' = 'text',
    mediaUrl?: string,
    replyToId?: string
  ) => supabaseChatApi.send(coupleId, partner, content, type, mediaUrl, replyToId),

  delete: (id: string, coupleId: string) => supabaseChatApi.delete(id, coupleId),

  react: (id: string, coupleId: string, partner: PartnerNumber, emoji: string) =>
    supabaseChatApi.react(id, coupleId, partner, emoji),
};

// ─── Calls (stubbed — not needed for core features) ───

export const callApi = {
  create: async (_coupleId: string, _caller: PartnerNumber): Promise<ApiResponse<Call>> => ({
    success: true,
    data: { id: '', coupleId: _coupleId, caller: _caller, status: 'ended', startedAt: new Date().toISOString() } as Call,
  }),
  update: async (_id: string, _data: Partial<Call>): Promise<ApiResponse<Call>> => ({ success: true, data: {} as Call }),
  getHistory: async (_coupleId: string): Promise<ApiResponse<Call[]>> => ({ success: true, data: [] }),
  getStats: async (_coupleId: string): Promise<ApiResponse<any>> => ({
    success: true,
    data: { today: { count: 0, duration: 0 }, week: { count: 0, duration: 0 }, total: { count: 0, duration: 0 } },
  }),
};

// ─── Mood ───

export const moodApi = {
  set: (coupleId: string, partner: PartnerNumber, mood: MoodValue, note?: string) =>
    supabaseMoodApi.set(coupleId, partner, mood, note),

  getHistory: async (coupleId: string): Promise<ApiResponse<{ date: string; partner1Mood?: MoodValue; partner2Mood?: MoodValue }[]>> => {
    const res = await supabaseMoodApi.getHistory(coupleId);
    // Group by date
    const grouped: Record<string, { date: string; partner1Mood?: MoodValue; partner2Mood?: MoodValue }> = {};
    for (const entry of res.data || []) {
      if (!grouped[entry.date]) grouped[entry.date] = { date: entry.date };
      if (entry.partner === 1) grouped[entry.date].partner1Mood = entry.mood;
      if (entry.partner === 2) grouped[entry.date].partner2Mood = entry.mood;
    }
    return { success: true, data: Object.values(grouped) };
  },
};

// ─── Questions ───

export const questionApi = {
  getToday: (coupleId: string) => supabaseQuestionApi.getToday(coupleId),
  answer: (coupleId: string, partner: PartnerNumber, answer: string) =>
    supabaseQuestionApi.answer(coupleId, partner, answer),
};

// ─── Memories (derived from photos) ───

export const memoryApi = {
  getAll: async (coupleId: string): Promise<ApiResponse<DailyMemory[]>> => {
    const photos = await supabasePhotoApi.getAll(coupleId);
    const grouped: Record<string, DailyMemory> = {};
    for (const p of photos.data || []) {
      if (!grouped[p.date]) {
        grouped[p.date] = { date: p.date, coupleId, photos: [], voiceClips: [], hasQuestion: false, totalPoints: 0 };
      }
      grouped[p.date].photos.push(p);
    }
    return { success: true, data: Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)) };
  },

  getByDate: async (coupleId: string, date: string): Promise<ApiResponse<DailyMemory>> => {
    const photos = await supabasePhotoApi.getAll(coupleId, { date });
    return {
      success: true,
      data: { date, coupleId, photos: photos.data || [], voiceClips: [], hasQuestion: false, totalPoints: 0 },
    };
  },

  getOnThisDay: async (coupleId: string): Promise<ApiResponse<DailyMemory[]>> => {
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const photos = await supabasePhotoApi.getAll(coupleId);
    const onThisDay = (photos.data || []).filter((p) => p.date.slice(5) === mmdd);
    const grouped: Record<string, DailyMemory> = {};
    for (const p of onThisDay) {
      if (!grouped[p.date]) grouped[p.date] = { date: p.date, coupleId, photos: [], voiceClips: [], hasQuestion: false, totalPoints: 0 };
      grouped[p.date].photos.push(p);
    }
    return { success: true, data: Object.values(grouped) };
  },
};

// ─── Calendar ───

export const calendarApi = {
  getMonth: async (coupleId: string, year: number, month: number): Promise<ApiResponse<CalendarDay[]>> => {
    const photos = await supabasePhotoApi.getAll(coupleId);
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const days: Record<string, CalendarDay> = {};
    for (const p of (photos.data || []).filter((ph) => ph.date.startsWith(prefix))) {
      if (!days[p.date]) days[p.date] = { date: p.date, hasPhotos: false, hasVoice: false, hasQuestion: false, photoCount: 0, isComplete: false };
      days[p.date].hasPhotos = true;
      days[p.date].photoCount = (days[p.date].photoCount || 0) + 1;
    }
    return { success: true, data: Object.values(days) };
  },
};

// ─── Timeline ───

export const timelineApi = {
  get: async (coupleId: string): Promise<ApiResponse<TimelineEvent[]>> => {
    const photos = await supabasePhotoApi.getAll(coupleId);
    const events: TimelineEvent[] = (photos.data || []).slice(0, 50).map((p) => ({
      id: p.id,
      coupleId,
      date: p.date,
      type: 'photo' as const,
      title: p.caption || 'Photo shared',
      description: '',
      mediaUrl: p.fileUrl,
      partner: p.partner,
      createdAt: p.createdAt,
    }));
    return { success: true, data: events };
  },
};

// ─── Statistics ───

export const statsApi = {
  get: (coupleId: string) => supabaseStatsApi.get(coupleId),
};

// ─── Achievements (stubbed) ───

export const achievementApi = {
  getAll: async (_coupleId: string): Promise<ApiResponse<{ achievements: Achievement[]; unlocked: UserAchievement[] }>> =>
    ({ success: true, data: { achievements: [], unlocked: [] } }),
};

// ─── Streak ───

export const streakApi = {
  get: (coupleId: string) => supabaseStreakApi.get(coupleId),
  useFreeze: (coupleId: string) => supabaseStreakApi.useFreeze(coupleId),
};

// ─── Bucket List ───

export const bucketListApi = {
  getAll: (coupleId: string) => supabaseBucketListApi.getAll(coupleId),

  create: (coupleId: string, partner: PartnerNumber, title: string, category: string) =>
    supabaseBucketListApi.create(coupleId, title, partner, undefined, category),

  toggle: (id: string, coupleId: string) => supabaseBucketListApi.toggle(id, coupleId),

  delete: (id: string, coupleId: string) => supabaseBucketListApi.delete(id, coupleId),
};

// ─── Love Notes ───

export const loveNoteApi = {
  getAll: (coupleId: string) => supabaseLoveNoteApi.getAll(coupleId),

  create: (coupleId: string, partner: PartnerNumber, content: string) =>
    supabaseLoveNoteApi.create(coupleId, partner, content),

  delete: (id: string, coupleId: string) => supabaseLoveNoteApi.delete(id, coupleId),
};

// ─── Surprises ───

export const surpriseApi = {
  getAll: (coupleId: string) => supabaseSurpriseApi.getAll(coupleId),

  create: (
    coupleId: string,
    partner: PartnerNumber,
    data: { title: string; message: string; unlockAt: string }
  ) => supabaseSurpriseApi.create(coupleId, partner, data),

  unlock: (id: string, coupleId: string) => supabaseSurpriseApi.unlock(id, coupleId),
};

// ─── Important Dates ───

export const datesApi = {
  getAll: (coupleId: string) => supabaseDatesApi.getAll(coupleId),

  create: (
    coupleId: string,
    partner: PartnerNumber,
    data: { title: string; date: string; type: string }
  ) => supabaseDatesApi.create(coupleId, partner, data),

  delete: (id: string, coupleId: string) => supabaseDatesApi.delete(id, coupleId),
};

// ─── Notifications (stubbed) ───

export const notificationApi = {
  getAll: async (_coupleId: string): Promise<ApiResponse<AppNotification[]>> =>
    ({ success: true, data: [] }),
  markRead: async (_id: string): Promise<ApiResponse<void>> => ({ success: true }),
};
