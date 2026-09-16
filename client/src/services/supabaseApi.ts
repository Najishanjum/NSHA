import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Couple,
  PartnerNumber,
  DailyChallenge,
  Photo,
  VoiceClip,
  Message,
  MoodValue,
  MoodEntry,
  QuestionAnswer,
  BucketListItem,
  LoveNote,
  Surprise,
  ImportantDate,
  StreakData,
  CoupleStatistics,
  ApiResponse,
} from '@/types';

export { isSupabaseConfigured };

function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/* ─── Storage Upload Helper ─── */

async function compressImage(dataUrl: string, maxWidth = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback: use original
    img.src = dataUrl;
  });
}

async function uploadFileToStorage(
  fileDataUrl: string,
  bucket: string,
  path: string
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  // If it's already a URL (not a dataURL), return as-is
  if (!fileDataUrl.startsWith('data:')) return fileDataUrl;

  try {
    // Compress images before upload for faster transfers
    let uploadData = fileDataUrl;
    if (fileDataUrl.startsWith('data:image/')) {
      uploadData = await compressImage(fileDataUrl);
    }

    // Convert dataURL to Blob
    const res = await fetch(uploadData);
    const blob = await res.blob();
    const isImage = blob.type.startsWith('image/');
    const ext = isImage ? 'jpg' : (blob.type.split('/')[1]?.split(';')[0] || 'bin');
    const filePath = `${path}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(filePath, blob, {
      contentType: blob.type,
      upsert: true,
    });

    if (error) {
      console.warn(`Storage upload failed (${error.message}), using base64 fallback`);
      // Fallback: return the original dataURL so the app still works
      return fileDataUrl;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (err) {
    console.warn('Storage upload error, using base64 fallback:', err);
    return fileDataUrl; // Fallback — app works, just stores base64 in DB
  }
}

function generateCoupleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'COUPLE-';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const QUESTIONS_POOL = [
  'What made you smile today?',
  'What is one thing you appreciate about me?',
  'Where should we travel together next?',
  'What is your favorite memory of us?',
  'What is one goal you want us to achieve this year?',
  'If we could do anything tomorrow, what would it be?',
  'What song reminds you of us?',
  'What is something new you learned today?',
  'What is one thing that always makes your day better?',
  'Describe our relationship in three words.',
];

/* ─── 1. Couple API ─── */

export const supabaseCoupleApi = {
  create: async (data: {
    partner1Name: string;
    partner2Name: string;
    coupleNickname: string;
    relationshipStartDate: string;
  }): Promise<ApiResponse<Couple>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const couple: Couple = {
      id: `cpl-${uuid()}`,
      code: generateCoupleCode(),
      partner1Name: data.partner1Name,
      partner2Name: data.partner2Name,
      coupleNickname: data.coupleNickname || `${data.partner1Name} & ${data.partner2Name}`,
      relationshipStartDate: data.relationshipStartDate || todayStr(),
      timezone: 'UTC',
      streakFreezesRemaining: 2,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('couples').insert({
      id: couple.id,
      code: couple.code,
      partner1_name: couple.partner1Name,
      partner2_name: couple.partner2Name,
      couple_nickname: couple.coupleNickname,
      relationship_start_date: couple.relationshipStartDate,
      timezone: couple.timezone,
      streak_freezes_remaining: couple.streakFreezesRemaining,
      created_at: couple.createdAt,
    });

    if (error) throw new Error(error.message);
    await supabaseChallengeApi.getToday(couple.id);
    return { success: true, data: couple };
  },

  get: async (code: string): Promise<ApiResponse<Couple>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .ilike('code', code.trim())
      .single();

    if (error || !data) throw new Error('Couple space not found. Please check code ❤️');

    const couple: Couple = {
      id: data.id,
      code: data.code,
      partner1Name: data.partner1_name,
      partner2Name: data.partner2_name,
      coupleNickname: data.couple_nickname,
      relationshipStartDate: data.relationship_start_date,
      timezone: data.timezone || 'UTC',
      streakFreezesRemaining: data.streak_freezes_remaining ?? 2,
      createdAt: data.created_at,
    };
    return { success: true, data: couple };
  },

  join: async (code: string, _partner: PartnerNumber): Promise<ApiResponse<Couple>> => {
    return supabaseCoupleApi.get(code);
  },

  update: async (code: string, data: Partial<Couple>): Promise<ApiResponse<Couple>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const updates: any = {};
    if (data.coupleNickname) updates.couple_nickname = data.coupleNickname;
    if (data.relationshipStartDate) updates.relationship_start_date = data.relationshipStartDate;
    if (data.streakFreezesRemaining !== undefined) updates.streak_freezes_remaining = data.streakFreezesRemaining;

    const { data: updated, error } = await supabase
      .from('couples')
      .update(updates)
      .ilike('code', code.trim())
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'Update failed');

    const couple: Couple = {
      id: updated.id,
      code: updated.code,
      partner1Name: updated.partner1_name,
      partner2Name: updated.partner2_name,
      coupleNickname: updated.couple_nickname,
      relationshipStartDate: updated.relationship_start_date,
      timezone: updated.timezone || 'UTC',
      streakFreezesRemaining: updated.streak_freezes_remaining ?? 2,
      createdAt: updated.created_at,
    };
    return { success: true, data: couple };
  },
};

/* ─── 2. Challenge API ─── */

export const supabaseChallengeApi = {
  getToday: async (coupleId: string): Promise<ApiResponse<DailyChallenge>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = todayStr();
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', today)
      .maybeSingle();

    if (!error && data) {
      return {
        success: true,
        data: {
          id: data.id,
          coupleId: data.couple_id,
          date: data.date,
          partner1Photos: data.partner1_photos || 0,
          partner2Photos: data.partner2_photos || 0,
          partner1Vc: data.partner1_vc || false,
          partner2Vc: data.partner2_vc || false,
          partner1Question: data.partner1_question || false,
          partner2Question: data.partner2_question || false,
          status: data.status || 'pending',
          streakAtDay: data.streak_at_day || 0,
          createdAt: data.created_at,
        },
      };
    }

    const newChallenge: DailyChallenge = {
      id: `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      coupleId,
      date: today,
      partner1Photos: 0,
      partner2Photos: 0,
      partner1Vc: false,
      partner2Vc: false,
      partner1Question: false,
      partner2Question: false,
      status: 'pending',
      streakAtDay: 0,
      createdAt: new Date().toISOString(),
    };

    await supabase.from('challenges').upsert({
      id: newChallenge.id,
      couple_id: newChallenge.coupleId,
      date: newChallenge.date,
      partner1_photos: 0,
      partner2_photos: 0,
      partner1_vc: false,
      partner2_vc: false,
      partner1_question: false,
      partner2_question: false,
      status: 'pending',
      streak_at_day: 0,
      created_at: newChallenge.createdAt,
    });

    return { success: true, data: newChallenge };
  },

  getByDate: async (coupleId: string, date: string): Promise<ApiResponse<DailyChallenge>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', date)
      .maybeSingle();

    if (data) {
      return {
        success: true,
        data: {
          id: data.id,
          coupleId: data.couple_id,
          date: data.date,
          partner1Photos: data.partner1_photos || 0,
          partner2Photos: data.partner2_photos || 0,
          partner1Vc: data.partner1_vc || false,
          partner2Vc: data.partner2_vc || false,
          partner1Question: data.partner1_question || false,
          partner2Question: data.partner2_question || false,
          status: data.status || 'pending',
          streakAtDay: data.streak_at_day || 0,
          createdAt: data.created_at,
        },
      };
    }

    return supabaseChallengeApi.getToday(coupleId);
  },

  getHistory: async (coupleId: string): Promise<ApiResponse<DailyChallenge[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    const challenges: DailyChallenge[] = (data || []).map((d) => ({
      id: d.id,
      coupleId: d.couple_id,
      date: d.date,
      partner1Photos: d.partner1_photos || 0,
      partner2Photos: d.partner2_photos || 0,
      partner1Vc: d.partner1_vc || false,
      partner2Vc: d.partner2_vc || false,
      partner1Question: d.partner1_question || false,
      partner2Question: d.partner2_question || false,
      status: d.status || 'pending',
      streakAtDay: d.streak_at_day || 0,
      createdAt: d.created_at,
    }));
    return { success: true, data: challenges };
  },
};

/* ─── 3. Photos API ─── */

export const supabasePhotoApi = {
  upload: async (
    fileDataUrl: string,
    coupleId: string,
    partner: PartnerNumber,
    caption?: string,
    isChallenge: boolean = true
  ): Promise<ApiResponse<Photo>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = todayStr();
    const photoId = `photo-${uuid()}`;

    // Upload to Supabase Storage (fast binary upload, CDN delivery)
    const publicUrl = await uploadFileToStorage(
      fileDataUrl,
      'photos',
      `${coupleId}/${today}/${photoId}`
    );

    const photo: Photo = {
      id: photoId,
      coupleId,
      partner,
      fileUrl: publicUrl,
      caption: caption || '',
      isFavorite: false,
      isChallenge,
      date: today,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('photos').insert({
      id: photo.id,
      couple_id: photo.coupleId,
      partner: photo.partner,
      file_url: photo.fileUrl,
      caption: photo.caption,
      is_favorite: photo.isFavorite,
      is_challenge: photo.isChallenge,
      date: photo.date,
      created_at: photo.createdAt,
    });

    if (error) throw new Error(error.message);

    if (isChallenge) {
      const field = partner === 1 ? 'partner1_photos' : 'partner2_photos';
      const { data: curr } = await supabase
        .from('challenges')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('date', today)
        .maybeSingle();

      const count = Math.min(5, ((curr && curr[field]) || 0) + 1);
      await supabase
        .from('challenges')
        .update({ [field]: count })
        .eq('couple_id', coupleId)
        .eq('date', today);
    }

    return { success: true, data: photo };
  },

  getToday: async (coupleId: string): Promise<ApiResponse<Photo[]>> => {
    return supabasePhotoApi.getAll(coupleId, { date: todayStr() });
  },

  getAll: async (
    coupleId: string,
    params?: { date?: string; partner?: string; filter?: string }
  ): Promise<ApiResponse<Photo[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    let query = supabase.from('photos').select('*').eq('couple_id', coupleId);
    if (params?.date) query = query.eq('date', params.date);
    if (params?.partner && params.partner !== 'all') query = query.eq('partner', Number(params.partner));
    if (params?.filter === 'favorites') query = query.eq('is_favorite', true);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const photos: Photo[] = (data || []).map((p) => ({
      id: p.id,
      coupleId: p.couple_id,
      partner: p.partner as PartnerNumber,
      fileUrl: p.file_url,
      caption: p.caption || '',
      isFavorite: p.is_favorite || false,
      isChallenge: p.is_challenge || false,
      date: p.date,
      createdAt: p.created_at,
    }));
    return { success: true, data: photos };
  },

  delete: async (id: string, coupleId: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('photos').delete().eq('id', id).eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  toggleFavorite: async (id: string, coupleId: string): Promise<ApiResponse<Photo>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: item } = await supabase.from('photos').select('*').eq('id', id).eq('couple_id', coupleId).single();
    if (!item) throw new Error('Photo not found');

    const nextFav = !item.is_favorite;
    const { data: updated, error } = await supabase
      .from('photos')
      .update({ is_favorite: nextFav })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) throw new Error('Failed to update favorite');

    return {
      success: true,
      data: {
        id: updated.id,
        coupleId: updated.couple_id,
        partner: updated.partner as PartnerNumber,
        fileUrl: updated.file_url,
        caption: updated.caption,
        isFavorite: updated.is_favorite,
        isChallenge: updated.is_challenge,
        date: updated.date,
        createdAt: updated.created_at,
      },
    };
  },
};

/* ─── 4. Voice API ─── */

export const supabaseVoiceApi = {
  upload: async (
    fileDataUrl: string,
    coupleId: string,
    partner: PartnerNumber,
    duration: number,
    type: 'voice' | 'video' = 'voice',
    isChallenge: boolean = true
  ): Promise<ApiResponse<VoiceClip>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = todayStr();
    const clipId = `vc-${uuid()}`;

    // Upload audio/video to Supabase Storage
    const publicUrl = await uploadFileToStorage(
      fileDataUrl,
      'voice-clips',
      `${coupleId}/${today}/${clipId}`
    );

    const clip: VoiceClip = {
      id: clipId,
      coupleId,
      partner,
      fileUrl: publicUrl,
      duration,
      type,
      isChallenge,
      date: today,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('voice_clips').insert({
      id: clip.id,
      couple_id: clip.coupleId,
      partner: clip.partner,
      file_url: clip.fileUrl,
      duration: clip.duration,
      type: clip.type,
      is_challenge: clip.isChallenge,
      date: clip.date,
      created_at: clip.createdAt,
    });

    if (error) throw new Error(error.message);

    if (isChallenge) {
      const field = partner === 1 ? 'partner1_vc' : 'partner2_vc';
      await supabase
        .from('challenges')
        .update({ [field]: true })
        .eq('couple_id', coupleId)
        .eq('date', today);
    }

    return { success: true, data: clip };
  },

  getToday: async (coupleId: string): Promise<ApiResponse<VoiceClip[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('voice_clips')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('date', todayStr());

    if (error) throw new Error(error.message);
    const clips: VoiceClip[] = (data || []).map((v) => ({
      id: v.id,
      coupleId: v.couple_id,
      partner: v.partner as PartnerNumber,
      fileUrl: v.file_url,
      duration: v.duration || 0,
      type: v.type || 'voice',
      isChallenge: v.is_challenge || false,
      date: v.date,
      createdAt: v.created_at,
    }));
    return { success: true, data: clips };
  },

  getAll: async (coupleId: string): Promise<ApiResponse<VoiceClip[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('voice_clips')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const clips: VoiceClip[] = (data || []).map((v) => ({
      id: v.id,
      coupleId: v.couple_id,
      partner: v.partner as PartnerNumber,
      fileUrl: v.file_url,
      duration: v.duration || 0,
      type: v.type || 'voice',
      isChallenge: v.is_challenge || false,
      date: v.date,
      createdAt: v.created_at,
    }));
    return { success: true, data: clips };
  },

  delete: async (id: string, coupleId: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('voice_clips').delete().eq('id', id).eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

/* ─── 5. Chat API ─── */

export const supabaseChatApi = {
  getMessages: async (coupleId: string, _before?: string, limit: number = 100): Promise<ApiResponse<Message[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(error.message);

    const messages: Message[] = (data || []).map((m) => ({
      id: m.id,
      coupleId: m.couple_id,
      partner: m.partner as PartnerNumber,
      content: m.content,
      type: m.type || 'text',
      mediaUrl: m.media_url,
      replyToId: m.reply_to_id,
      reactions: m.reactions || {},
      createdAt: m.created_at,
    }));
    return { success: true, data: messages };
  },

  send: async (
    coupleId: string,
    partner: PartnerNumber,
    content: string,
    type: 'text' | 'image' | 'voice' = 'text',
    mediaUrl?: string,
    replyToId?: string
  ): Promise<ApiResponse<Message>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const message: Message = {
      id: `msg-${uuid()}`,
      coupleId,
      partner,
      content,
      type,
      mediaUrl,
      replyToId,
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('messages').insert({
      id: message.id,
      couple_id: message.coupleId,
      partner: message.partner,
      content: message.content,
      type: message.type,
      media_url: message.mediaUrl,
      reply_to_id: message.replyToId,
      reactions: message.reactions,
      created_at: message.createdAt,
    });

    if (error) throw new Error(error.message);
    return { success: true, data: message };
  },

  delete: async (id: string, coupleId: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('messages').delete().eq('id', id).eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  react: async (id: string, coupleId: string, partner: PartnerNumber, emoji: string): Promise<ApiResponse<Message>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: msg } = await supabase.from('messages').select('*').eq('id', id).eq('couple_id', coupleId).single();
    if (!msg) throw new Error('Message not found');

    const reactions = msg.reactions || {};
    const partners: PartnerNumber[] = reactions[emoji] || [];
    const idx = partners.indexOf(partner);
    if (idx >= 0) {
      partners.splice(idx, 1);
      if (partners.length === 0) delete reactions[emoji];
      else reactions[emoji] = partners;
    } else {
      reactions[emoji] = [...partners, partner];
    }

    const { data: updated, error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) throw new Error('Reaction failed');

    return {
      success: true,
      data: {
        id: updated.id,
        coupleId: updated.couple_id,
        partner: updated.partner,
        content: updated.content,
        type: updated.type,
        mediaUrl: updated.media_url,
        replyToId: updated.reply_to_id,
        reactions: updated.reactions || {},
        createdAt: updated.created_at,
      },
    };
  },
};

/* ─── 6. Mood API ─── */

export const supabaseMoodApi = {
  set: async (coupleId: string, partner: PartnerNumber, mood: MoodValue, note?: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = todayStr();
    await supabase.from('moods').delete().eq('couple_id', coupleId).eq('partner', partner).eq('date', today);
    const { error } = await supabase.from('moods').insert({
      id: `mood-${uuid()}`,
      couple_id: coupleId,
      partner,
      mood,
      note: note || '',
      date: today,
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  getToday: async (coupleId: string): Promise<ApiResponse<{ partner1Mood?: MoodValue; partner2Mood?: MoodValue; partner1Note?: string; partner2Note?: string }>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data } = await supabase.from('moods').select('*').eq('couple_id', coupleId).eq('date', todayStr());
    const p1 = (data || []).find((m) => m.partner === 1);
    const p2 = (data || []).find((m) => m.partner === 2);
    return {
      success: true,
      data: {
        partner1Mood: p1?.mood,
        partner2Mood: p2?.mood,
        partner1Note: p1?.note,
        partner2Note: p2?.note,
      },
    };
  },

  getHistory: async (coupleId: string, _days: number = 30): Promise<ApiResponse<MoodEntry[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('moods')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
      .limit(60);

    if (error) throw new Error(error.message);
    const entries: MoodEntry[] = (data || []).map((m) => ({
      id: m.id,
      coupleId: m.couple_id,
      partner: m.partner as PartnerNumber,
      mood: m.mood as MoodValue,
      note: m.note,
      date: m.date,
      createdAt: m.created_at,
    }));
    return { success: true, data: entries };
  },
};

/* ─── 7. Questions API ─── */

export const supabaseQuestionApi = {
  getToday: async (coupleId: string): Promise<ApiResponse<{ question: string; partner1Answer?: string; partner2Answer?: string }>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = todayStr();
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const questionText = QUESTIONS_POOL[dayOfYear % QUESTIONS_POOL.length];

    const { data } = await supabase.from('questions').select('*').eq('couple_id', coupleId).eq('date', today);
    const p1 = (data || []).find((q) => q.partner === 1);
    const p2 = (data || []).find((q) => q.partner === 2);

    return {
      success: true,
      data: {
        question: questionText,
        partner1Answer: p1?.answer,
        partner2Answer: p2?.answer,
      },
    };
  },

  answer: async (coupleId: string, partner: PartnerNumber, answer: string): Promise<ApiResponse<QuestionAnswer>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const today = todayStr();
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const questionText = QUESTIONS_POOL[dayOfYear % QUESTIONS_POOL.length];

    await supabase.from('questions').delete().eq('couple_id', coupleId).eq('partner', partner).eq('date', today);

    const qa: QuestionAnswer = {
      id: `qa-${uuid()}`,
      coupleId,
      partner,
      questionId: `q-${dayOfYear}`,
      questionText,
      answer,
      date: today,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('questions').insert({
      id: qa.id,
      couple_id: qa.coupleId,
      partner: qa.partner,
      question_id: qa.questionId,
      question_text: qa.questionText,
      answer: qa.answer,
      date: qa.date,
      created_at: qa.createdAt,
    });

    if (error) throw new Error(error.message);

    const field = partner === 1 ? 'partner1_question' : 'partner2_question';
    await supabase
      .from('challenges')
      .update({ [field]: true })
      .eq('couple_id', coupleId)
      .eq('date', today);

    return { success: true, data: qa };
  },

  getHistory: async (coupleId: string): Promise<ApiResponse<QuestionAnswer[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('questions').select('*').eq('couple_id', coupleId).order('date', { ascending: false });
    if (error) throw new Error(error.message);
    const items: QuestionAnswer[] = (data || []).map((q) => ({
      id: q.id,
      coupleId: q.couple_id,
      partner: q.partner as PartnerNumber,
      questionId: q.question_id || '',
      questionText: q.question_text,
      answer: q.answer,
      date: q.date,
      createdAt: q.created_at,
    }));
    return { success: true, data: items };
  },
};

/* ─── 8. Bucket List API ─── */

export const supabaseBucketListApi = {
  getAll: async (coupleId: string): Promise<ApiResponse<BucketListItem[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('bucket_list').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    const items: BucketListItem[] = (data || []).map((b) => ({
      id: b.id,
      coupleId: b.couple_id,
      title: b.title,
      description: b.description,
      category: b.category || 'adventure',
      targetDate: b.target_date,
      completed: b.completed || false,
      completedAt: b.completed_at,
      createdBy: b.created_by as PartnerNumber,
      createdAt: b.created_at,
    }));
    return { success: true, data: items };
  },

  create: async (
    coupleId: string,
    title: string,
    createdBy: PartnerNumber,
    description?: string,
    category?: any,
    targetDate?: string
  ): Promise<ApiResponse<BucketListItem>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const item: BucketListItem = {
      id: `bl-${uuid()}`,
      coupleId,
      title,
      description,
      category: category || 'adventure',
      targetDate,
      completed: false,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('bucket_list').insert({
      id: item.id,
      couple_id: item.coupleId,
      title: item.title,
      description: item.description,
      category: item.category,
      target_date: item.targetDate,
      completed: item.completed,
      created_by: item.createdBy,
      created_at: item.createdAt,
    });

    if (error) throw new Error(error.message);
    return { success: true, data: item };
  },

  toggle: async (id: string, coupleId: string): Promise<ApiResponse<BucketListItem>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: item } = await supabase.from('bucket_list').select('*').eq('id', id).eq('couple_id', coupleId).single();
    if (!item) throw new Error('Item not found');

    const nextCompleted = !item.completed;
    const { data: updated, error } = await supabase
      .from('bucket_list')
      .update({
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) throw new Error('Update failed');
    return {
      success: true,
      data: {
        id: updated.id,
        coupleId: updated.couple_id,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        targetDate: updated.target_date,
        completed: updated.completed,
        completedAt: updated.completed_at,
        createdBy: updated.created_by,
        createdAt: updated.created_at,
      },
    };
  },

  delete: async (id: string, coupleId: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('bucket_list').delete().eq('id', id).eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

/* ─── 9. Love Notes API ─── */

export const supabaseLoveNoteApi = {
  send: async (coupleId: string, fromPartner: PartnerNumber, toPartner: PartnerNumber, message: string): Promise<ApiResponse<LoveNote>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const note: LoveNote = {
      id: `ln-${uuid()}`,
      coupleId,
      fromPartner,
      toPartner,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('love_notes').insert({
      id: note.id,
      couple_id: note.coupleId,
      from_partner: note.fromPartner,
      to_partner: note.toPartner,
      message: note.message,
      is_read: note.isRead,
      created_at: note.createdAt,
    });

    if (error) throw new Error(error.message);
    return { success: true, data: note };
  },

  getInbox: async (coupleId: string, partner: PartnerNumber): Promise<ApiResponse<LoveNote[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('love_notes')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('to_partner', partner)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const notes: LoveNote[] = (data || []).map((n) => ({
      id: n.id,
      coupleId: n.couple_id,
      fromPartner: n.from_partner as PartnerNumber,
      toPartner: n.to_partner as PartnerNumber,
      message: n.message,
      isRead: n.is_read || false,
      createdAt: n.created_at,
    }));
    return { success: true, data: notes };
  },

  markRead: async (id: string, coupleId: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    await supabase.from('love_notes').update({ is_read: true }).eq('id', id).eq('couple_id', coupleId);
    return { success: true };
  },
};

/* ─── 10. Surprises API ─── */

export const supabaseSurpriseApi = {
  create: async (coupleId: string, fromPartner: PartnerNumber, title: string, message: string, unlockAt: string): Promise<ApiResponse<Surprise>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const surprise: Surprise = {
      id: `sur-${uuid()}`,
      coupleId,
      fromPartner,
      title,
      message,
      unlockAt,
      isUnlocked: false,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('surprises').insert({
      id: surprise.id,
      couple_id: surprise.coupleId,
      from_partner: surprise.fromPartner,
      title: surprise.title,
      message: surprise.message,
      unlock_at: surprise.unlockAt,
      is_unlocked: surprise.isUnlocked,
      created_at: surprise.createdAt,
    });

    if (error) throw new Error(error.message);
    return { success: true, data: surprise };
  },

  getAll: async (coupleId: string): Promise<ApiResponse<Surprise[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('surprises')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    const list: Surprise[] = (data || []).map((s) => ({
      id: s.id,
      coupleId: s.couple_id,
      fromPartner: s.from_partner as PartnerNumber,
      title: s.title,
      message: s.message,
      unlockAt: s.unlock_at,
      isUnlocked: s.is_unlocked || false,
      unlockedAt: s.unlocked_at,
      createdAt: s.created_at,
    }));
    return { success: true, data: list };
  },

  unlock: async (id: string, coupleId: string): Promise<ApiResponse<Surprise>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: updated, error } = await supabase
      .from('surprises')
      .update({
        is_unlocked: true,
        unlocked_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('couple_id', coupleId)
      .select()
      .single();

    if (error || !updated) throw new Error('Unlock failed');
    return {
      success: true,
      data: {
        id: updated.id,
        coupleId: updated.couple_id,
        fromPartner: updated.from_partner,
        title: updated.title,
        message: updated.message,
        unlockAt: updated.unlock_at,
        isUnlocked: updated.is_unlocked,
        unlockedAt: updated.unlocked_at,
        createdAt: updated.created_at,
      },
    };
  },
};

/* ─── 11. Important Dates API ─── */

export const supabaseCalendarApi = {
  getEvents: async (coupleId: string): Promise<ApiResponse<ImportantDate[]>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.from('important_dates').select('*').eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    const dates: ImportantDate[] = (data || []).map((d) => ({
      id: d.id,
      coupleId: d.couple_id,
      title: d.title,
      date: d.date,
      type: d.type || 'anniversary',
      addedBy: d.added_by as PartnerNumber,
      createdAt: d.created_at,
    }));
    return { success: true, data: dates };
  },

  addEvent: async (coupleId: string, title: string, date: string, type: any, addedBy: PartnerNumber): Promise<ApiResponse<ImportantDate>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const item: ImportantDate = {
      id: `date-${uuid()}`,
      coupleId,
      title,
      date,
      type,
      addedBy,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('important_dates').insert({
      id: item.id,
      couple_id: item.coupleId,
      title: item.title,
      date: item.date,
      type: item.type,
      added_by: item.addedBy,
      created_at: item.createdAt,
    });

    if (error) throw new Error(error.message);
    return { success: true, data: item };
  },

  deleteEvent: async (id: string, coupleId: string): Promise<ApiResponse<void>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('important_dates').delete().eq('id', id).eq('couple_id', coupleId);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

/* ─── 12. Stats & Streak API ─── */

export const supabaseStatsApi = {
  get: async (coupleId: string): Promise<ApiResponse<CoupleStatistics>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: challenges } = await supabase.from('challenges').select('*').eq('couple_id', coupleId);
    const { data: photos } = await supabase.from('photos').select('*').eq('couple_id', coupleId);
    const { data: voice } = await supabase.from('voice_clips').select('*').eq('couple_id', coupleId);
    const { data: messages } = await supabase.from('messages').select('*').eq('couple_id', coupleId);

    const completedChallenges = (challenges || []).filter((c) => c.status === 'completed').length;
    const totalPhotos = (photos || []).length;
    const totalVoiceClips = (voice || []).length;
    const totalMessages = (messages || []).length;

    return {
      success: true,
      data: {
        totalDays: (challenges || []).length || 1,
        completedChallenges,
        totalPhotos,
        totalVoiceClips,
        totalCallMinutes: 0,
        totalMessages,
        currentStreak: completedChallenges,
        longestStreak: completedChallenges,
        streakHistory: [],
        partner1Contribution: 50,
        partner2Contribution: 50,
        activityByHour: {},
        challengesByCategory: {},
      },
    };
  },
};

export const supabaseStreakApi = {
  get: async (coupleId: string): Promise<ApiResponse<StreakData>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: challenges } = await supabase.from('challenges').select('*').eq('couple_id', coupleId);
    const { data: couple } = await supabase.from('couples').select('*').eq('id', coupleId).single();

    const streak = (challenges || []).filter((c) => c.status === 'completed').length;
    return {
      success: true,
      data: {
        currentStreak: streak,
        longestStreak: streak,
        freezesRemaining: couple?.streak_freezes_remaining ?? 2,
        isAtRisk: false,
        streakHistory: [],
      },
    };
  },

  useFreeze: async (coupleId: string): Promise<ApiResponse<StreakData>> => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data: couple } = await supabase.from('couples').select('*').eq('id', coupleId).single();
    if (!couple || (couple.streak_freezes_remaining || 0) <= 0) {
      throw new Error('No streak freezes remaining');
    }
    const nextFreezes = couple.streak_freezes_remaining - 1;
    await supabase.from('couples').update({ streak_freezes_remaining: nextFreezes }).eq('id', coupleId);
    return supabaseStreakApi.get(coupleId);
  },
};
