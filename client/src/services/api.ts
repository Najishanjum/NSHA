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

const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Something went wrong ❤️' }));
    throw new Error(err.error || 'Something went wrong');
  }
  return res.json();
}

async function uploadFile(url: string, file: File | Blob, fields?: Record<string, string>): Promise<any> {
  // Convert to base64 Data URL for universal compatibility (Vercel Serverless & Node)
  let fileData = '';
  try {
    fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch {
    // If FileReader fails, continue with form data
  }

  // 1. Try JSON payload with base64 Data URL (guaranteed to work seamlessly on serverless)
  if (fileData) {
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          fileData,
        }),
      });
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fallback to FormData
    }
  }

  // 2. Fallback to multipart FormData
  const form = new FormData();
  form.append('file', file);
  if (fileData) form.append('fileData', fileData);
  if (fields) {
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  }
  const res = await fetch(`${API_BASE}${url}`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

/* ─── Couple ─── */

export const coupleApi = {
  create: (data: {
    partner1Name: string;
    partner2Name: string;
    coupleNickname: string;
    relationshipStartDate: string;
  }) => request<ApiResponse<Couple>>('/couples', { method: 'POST', body: JSON.stringify(data) }),

  get: (code: string) => request<ApiResponse<Couple>>(`/couples/${code}`),

  join: (code: string, partner: PartnerNumber) =>
    request<ApiResponse<Couple>>(`/couples/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ partner }),
    }),

  update: (code: string, data: Partial<Couple>) =>
    request<ApiResponse<Couple>>(`/couples/${code}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

/* ─── Challenge ─── */

export const challengeApi = {
  getToday: (coupleId: string) =>
    request<ApiResponse<DailyChallenge>>(`/challenges/today?coupleId=${coupleId}`),

  getByDate: (coupleId: string, date: string) =>
    request<ApiResponse<DailyChallenge>>(`/challenges/${date}?coupleId=${coupleId}`),

  getHistory: (coupleId: string) =>
    request<ApiResponse<DailyChallenge[]>>(`/challenges/history?coupleId=${coupleId}`),
};

/* ─── Photos ─── */

export const photoApi = {
  upload: (file: File, coupleId: string, partner: PartnerNumber, caption?: string, isChallenge: boolean = true) =>
    uploadFile('/photos', file, {
      coupleId,
      partner: String(partner),
      caption: caption || '',
      isChallenge: String(isChallenge),
    }),

  getToday: (coupleId: string) =>
    request<ApiResponse<Photo[]>>(`/photos/today?coupleId=${coupleId}`),

  getAll: (coupleId: string, params?: { date?: string; partner?: string; filter?: string; page?: number }) => {
    const searchParams = new URLSearchParams({ coupleId });
    if (params?.date) searchParams.set('date', params.date);
    if (params?.partner) searchParams.set('partner', params.partner);
    if (params?.filter) searchParams.set('filter', params.filter);
    if (params?.page) searchParams.set('page', String(params.page));
    return request<ApiResponse<Photo[]>>(`/photos?${searchParams}`);
  },

  delete: (id: string, coupleId: string) =>
    request<ApiResponse<void>>(`/photos/${id}?coupleId=${coupleId}`, { method: 'DELETE' }),

  toggleFavorite: (id: string, coupleId: string) =>
    request<ApiResponse<Photo>>(`/photos/${id}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ coupleId }),
    }),
};

/* ─── Voice/Video ─── */

export const voiceApi = {
  upload: (file: Blob, coupleId: string, partner: PartnerNumber, duration: number, type: 'voice' | 'video' = 'voice', isChallenge: boolean = true) =>
    uploadFile('/voice', file, {
      coupleId,
      partner: String(partner),
      duration: String(duration),
      type,
      isChallenge: String(isChallenge),
    }),

  getToday: (coupleId: string) =>
    request<ApiResponse<VoiceClip[]>>(`/voice/today?coupleId=${coupleId}`),

  getAll: (coupleId: string) =>
    request<ApiResponse<VoiceClip[]>>(`/voice?coupleId=${coupleId}`),

  delete: (id: string, coupleId: string) =>
    request<ApiResponse<void>>(`/voice/${id}?coupleId=${coupleId}`, { method: 'DELETE' }),
};

/* ─── Chat ─── */

export const chatApi = {
  getMessages: (coupleId: string, before?: string, limit: number = 50) => {
    const params = new URLSearchParams({ coupleId, limit: String(limit) });
    if (before) params.set('before', before);
    return request<ApiResponse<Message[]>>(`/messages?${params}`);
  },

  send: (coupleId: string, partner: PartnerNumber, content: string, type: 'text' | 'image' | 'voice' = 'text', mediaUrl?: string, replyToId?: string) =>
    request<ApiResponse<Message>>('/messages', {
      method: 'POST',
      body: JSON.stringify({ coupleId, partner, content, type, mediaUrl, replyToId }),
    }),

  delete: (id: string, coupleId: string) =>
    request<ApiResponse<void>>(`/messages/${id}?coupleId=${coupleId}`, { method: 'DELETE' }),

  react: (id: string, coupleId: string, partner: PartnerNumber, emoji: string) =>
    request<ApiResponse<Message>>(`/messages/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ coupleId, partner, emoji }),
    }),
};

/* ─── Calls ─── */

export const callApi = {
  create: (coupleId: string, caller: PartnerNumber) =>
    request<ApiResponse<Call>>('/calls', {
      method: 'POST',
      body: JSON.stringify({ coupleId, caller }),
    }),

  update: (id: string, data: Partial<Call>) =>
    request<ApiResponse<Call>>(`/calls/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getHistory: (coupleId: string) =>
    request<ApiResponse<Call[]>>(`/calls/history?coupleId=${coupleId}`),

  getStats: (coupleId: string) =>
    request<ApiResponse<{ today: { count: number; duration: number }; week: { count: number; duration: number }; total: { count: number; duration: number } }>>(`/calls/stats?coupleId=${coupleId}`),
};

/* ─── Mood ─── */

export const moodApi = {
  set: (coupleId: string, partner: PartnerNumber, mood: MoodValue, note?: string) =>
    request<ApiResponse<void>>('/mood', {
      method: 'POST',
      body: JSON.stringify({ coupleId, partner, mood, note }),
    }),

  getHistory: (coupleId: string) =>
    request<ApiResponse<{ date: string; partner1Mood?: MoodValue; partner2Mood?: MoodValue }[]>>(`/mood/history?coupleId=${coupleId}`),
};

/* ─── Questions ─── */

export const questionApi = {
  getToday: (coupleId: string) =>
    request<ApiResponse<{ question: string; partner1Answer?: string; partner2Answer?: string }>>(`/questions/today?coupleId=${coupleId}`),

  answer: (coupleId: string, partner: PartnerNumber, answer: string) =>
    request<ApiResponse<QuestionAnswer>>('/questions/answer', {
      method: 'POST',
      body: JSON.stringify({ coupleId, partner, answer }),
    }),
};

/* ─── Memories ─── */

export const memoryApi = {
  getAll: (coupleId: string) =>
    request<ApiResponse<DailyMemory[]>>(`/memories?coupleId=${coupleId}`),

  getByDate: (coupleId: string, date: string) =>
    request<ApiResponse<DailyMemory>>(`/memories/${date}?coupleId=${coupleId}`),

  getOnThisDay: (coupleId: string) =>
    request<ApiResponse<DailyMemory[]>>(`/memories/on-this-day?coupleId=${coupleId}`),
};

/* ─── Calendar ─── */

export const calendarApi = {
  getMonth: (coupleId: string, year: number, month: number) =>
    request<ApiResponse<CalendarDay[]>>(`/calendar/${year}/${month}?coupleId=${coupleId}`),
};

/* ─── Timeline ─── */

export const timelineApi = {
  get: (coupleId: string) =>
    request<ApiResponse<TimelineEvent[]>>(`/timeline?coupleId=${coupleId}`),
};

/* ─── Statistics ─── */

export const statsApi = {
  get: (coupleId: string) =>
    request<ApiResponse<CoupleStatistics>>(`/statistics?coupleId=${coupleId}`),
};

/* ─── Achievements ─── */

export const achievementApi = {
  getAll: (coupleId: string) =>
    request<ApiResponse<{ achievements: Achievement[]; unlocked: UserAchievement[] }>>(`/achievements?coupleId=${coupleId}`),
};

/* ─── Streak ─── */

export const streakApi = {
  get: (coupleId: string) =>
    request<ApiResponse<StreakData>>(`/streak?coupleId=${coupleId}`),

  useFreeze: (coupleId: string) =>
    request<ApiResponse<StreakData>>('/streak/freeze', {
      method: 'POST',
      body: JSON.stringify({ coupleId }),
    }),
};

/* ─── Bucket List ─── */

export const bucketListApi = {
  getAll: (coupleId: string) =>
    request<ApiResponse<BucketListItem[]>>(`/bucket-list?coupleId=${coupleId}`),

  create: (coupleId: string, partner: PartnerNumber, title: string, category: string) =>
    request<ApiResponse<BucketListItem>>('/bucket-list', {
      method: 'POST',
      body: JSON.stringify({ coupleId, partner, title, category }),
    }),

  toggle: (id: string, coupleId: string) =>
    request<ApiResponse<BucketListItem>>(`/bucket-list/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ coupleId }),
    }),

  delete: (id: string, coupleId: string) =>
    request<ApiResponse<void>>(`/bucket-list/${id}?coupleId=${coupleId}`, { method: 'DELETE' }),
};

/* ─── Love Notes ─── */

export const loveNoteApi = {
  getAll: (coupleId: string) =>
    request<ApiResponse<LoveNote[]>>(`/love-notes?coupleId=${coupleId}`),

  create: (coupleId: string, partner: PartnerNumber, content: string) =>
    request<ApiResponse<LoveNote>>('/love-notes', {
      method: 'POST',
      body: JSON.stringify({ coupleId, partner, content }),
    }),

  delete: (id: string, coupleId: string) =>
    request<ApiResponse<void>>(`/love-notes/${id}?coupleId=${coupleId}`, { method: 'DELETE' }),
};

/* ─── Surprises ─── */

export const surpriseApi = {
  getAll: (coupleId: string) =>
    request<ApiResponse<Surprise[]>>(`/surprises?coupleId=${coupleId}`),

  create: (coupleId: string, partner: PartnerNumber, data: { title: string; message: string; unlockAt: string }) =>
    request<ApiResponse<Surprise>>('/surprises', {
      method: 'POST',
      body: JSON.stringify({ coupleId, fromPartner: partner, ...data }),
    }),

  unlock: (id: string, coupleId: string) =>
    request<ApiResponse<Surprise>>(`/surprises/${id}/unlock`, {
      method: 'PATCH',
      body: JSON.stringify({ coupleId }),
    }),
};

/* ─── Important Dates ─── */

export const datesApi = {
  getAll: (coupleId: string) =>
    request<ApiResponse<ImportantDate[]>>(`/dates?coupleId=${coupleId}`),

  create: (coupleId: string, partner: PartnerNumber, data: { title: string; date: string; type: string }) =>
    request<ApiResponse<ImportantDate>>('/dates', {
      method: 'POST',
      body: JSON.stringify({ coupleId, addedBy: partner, ...data }),
    }),

  delete: (id: string, coupleId: string) =>
    request<ApiResponse<void>>(`/dates/${id}?coupleId=${coupleId}`, { method: 'DELETE' }),
};
