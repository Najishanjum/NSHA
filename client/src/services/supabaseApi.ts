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
  ApiResponse,
} from '@/types';

export { isSupabaseConfigured };

function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
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

/* ─── Supabase API Implementations ─── */

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
};
