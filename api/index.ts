import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

/* ─── Database with /tmp persistence ─── */
type PartnerNumber = 1 | 2;

interface DbSchema {
  couples: any[];
  challenges: any[];
  photos: any[];
  voiceClips: any[];
  messages: any[];
  calls: any[];
  moods: any[];
  questions: any[];
  bucketList: any[];
  loveNotes: any[];
  surprises: any[];
  importantDates: any[];
  achievementsUnlocked: any[];
}

const TMP_DB = path.join('/tmp', 'couplesync-db.json');

function initDb(): DbSchema {
  try {
    if (fs.existsSync(TMP_DB)) {
      const content = fs.readFileSync(TMP_DB, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore read errors
  }
  return {
    couples: [],
    challenges: [],
    photos: [],
    voiceClips: [],
    messages: [],
    calls: [],
    moods: [],
    questions: [],
    bucketList: [],
    loveNotes: [],
    surprises: [],
    importantDates: [],
    achievementsUnlocked: [],
  };
}

// Global in-memory store (persists across warm invocations + backed by /tmp)
const globalDb: DbSchema = (globalThis as any).__COUPLESYNC_DB || initDb();
(globalThis as any).__COUPLESYNC_DB = globalDb;

function saveDb() {
  try {
    fs.writeFileSync(TMP_DB, JSON.stringify(globalDb));
  } catch {
    // Ignore write errors if /tmp is not available
  }
}

function syncDb() {
  try {
    if (fs.existsSync(TMP_DB)) {
      const fresh = JSON.parse(fs.readFileSync(TMP_DB, 'utf-8'));
      Object.assign(globalDb, fresh);
    }
  } catch {
    // Ignore
  }
}

function uuid() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function generateCoupleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'COUPLE-';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getOrCreateChallenge(coupleId: string, dateStr?: string) {
  const date = dateStr || todayStr();
  let challenge = globalDb.challenges.find((c: any) => c.coupleId === coupleId && c.date === date);
  if (!challenge) {
    const pastCompleted = globalDb.challenges
      .filter((c: any) => c.coupleId === coupleId && c.status === 'completed' && c.date < date)
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
    challenge = {
      id: `challenge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      coupleId,
      date,
      partner1Photos: 0,
      partner2Photos: 0,
      partner1Vc: false,
      partner2Vc: false,
      partner1Question: false,
      partner2Question: false,
      partner1Mood: null,
      partner2Mood: null,
      status: 'pending',
      streakDay: pastCompleted.length + 1,
      requiredPhotos: 5,
      requiredVcs: 1,
    };
    globalDb.challenges.push(challenge);
  }
  return challenge;
}

function updateChallengeStatus(coupleId: string, dateStr?: string) {
  const challenge = getOrCreateChallenge(coupleId, dateStr);
  const p1Done = challenge.partner1Photos >= 5 && challenge.partner1Vc;
  const p2Done = challenge.partner2Photos >= 5 && challenge.partner2Vc;
  if (p1Done && p2Done) challenge.status = 'completed';
  else if (challenge.partner1Photos > 0 || challenge.partner2Photos > 0 || challenge.partner1Vc || challenge.partner2Vc) challenge.status = 'partial';
  else challenge.status = 'pending';
  return challenge;
}

/* ─── Questions Pool ─── */
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

/* ─── Route Handler ─── */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Sync latest state from disk if available
  syncDb();

  const method = req.method || 'GET';

  // Automatically persist DB on any state mutating request
  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      saveDb();
    }
    return originalJson(body);
  };

  // Robust path resolution across Vercel rewrites & catch-all routes
  let path = '';
  if (req.query?.slug) {
    const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug;
    path = '/' + slug;
  } else if (req.query?.path) {
    const p = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    path = '/' + p;
  } else {
    const url = req.url || '';
    path = url.split('?')[0].replace(/^\/api/, '');
  }
  if (!path.startsWith('/')) path = '/' + path;

  try {
    // ─── Health ───
    if (path === '/health') {
      return res.json({ status: 'ok', time: new Date().toISOString() });
    }

    // ─── Couples ───
    if (path === '/couples' && method === 'POST') {
      const { partner1Name, partner2Name, coupleNickname, relationshipStartDate } = req.body;
      if (!partner1Name || !partner2Name) {
        return res.status(400).json({ success: false, error: 'Both partner names are required' });
      }
      const couple = {
        id: `cpl-${uuid()}`,
        code: generateCoupleCode(),
        partner1Name,
        partner2Name,
        coupleNickname: coupleNickname || `${partner1Name} & ${partner2Name}`,
        relationshipStartDate: relationshipStartDate || todayStr(),
        timezone: 'UTC',
        streakFreezesRemaining: 2,
        createdAt: new Date().toISOString(),
      };
      globalDb.couples.push(couple);
      getOrCreateChallenge(couple.id);
      return res.json({ success: true, data: couple });
    }

    const coupleJoinMatch = path.match(/^\/couples\/([^/]+)\/join$/);
    if (coupleJoinMatch && method === 'POST') {
      const code = coupleJoinMatch[1];
      const couple = globalDb.couples.find((c: any) => c.code.toUpperCase() === code.toUpperCase());
      if (!couple) return res.status(404).json({ success: false, error: 'Couple space not found' });
      getOrCreateChallenge(couple.id);
      return res.json({ success: true, data: couple });
    }

    const coupleCodeMatch = path.match(/^\/couples\/([^/]+)$/);
    if (coupleCodeMatch && method === 'GET') {
      const code = coupleCodeMatch[1];
      const couple = globalDb.couples.find((c: any) => c.code.toUpperCase() === code.toUpperCase());
      if (!couple) return res.status(404).json({ success: false, error: 'Couple space not found. Please check code.' });
      return res.json({ success: true, data: couple });
    }
    if (coupleCodeMatch && method === 'PATCH') {
      const code = coupleCodeMatch[1];
      const couple = globalDb.couples.find((c: any) => c.code.toUpperCase() === code.toUpperCase());
      if (!couple) return res.status(404).json({ success: false, error: 'Couple not found' });
      Object.assign(couple, req.body);
      return res.json({ success: true, data: couple });
    }

    // ─── Challenges ───
    if (path === '/challenges/today' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      if (!coupleId) return res.status(400).json({ success: false, error: 'coupleId required' });
      const challenge = getOrCreateChallenge(coupleId);
      return res.json({ success: true, data: challenge });
    }
    if (path === '/challenges/history' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      if (!coupleId) return res.status(400).json({ success: false, error: 'coupleId required' });
      const challenges = globalDb.challenges
        .filter((c: any) => c.coupleId === coupleId)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      return res.json({ success: true, data: challenges });
    }
    const challengeDateMatch = path.match(/^\/challenges\/(\d{4}-\d{2}-\d{2})$/);
    if (challengeDateMatch && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      if (!coupleId) return res.status(400).json({ success: false, error: 'coupleId required' });
      const challenge = getOrCreateChallenge(coupleId, challengeDateMatch[1]);
      return res.json({ success: true, data: challenge });
    }

    // ─── Photos ───
    if (path === '/photos' && method === 'POST') {
      // For serverless, handle base64 or skip file upload
      const { coupleId, partner, caption, isChallenge, fileData } = req.body;
      const partnerNum = Number(partner) as PartnerNumber;
      const today = todayStr();
      const photo = {
        id: `photo-${uuid()}`,
        coupleId,
        partner: partnerNum,
        fileUrl: fileData || '/placeholder-photo.jpg',
        caption: caption || '',
        isFavorite: false,
        isChallenge: isChallenge === 'true' || isChallenge === true,
        date: today,
        createdAt: new Date().toISOString(),
      };
      globalDb.photos.push(photo);
      if (photo.isChallenge) {
        const challenge = getOrCreateChallenge(coupleId, today);
        if (partnerNum === 1) challenge.partner1Photos = Math.min(5, (challenge.partner1Photos || 0) + 1);
        else challenge.partner2Photos = Math.min(5, (challenge.partner2Photos || 0) + 1);
        updateChallengeStatus(coupleId, today);
      }
      return res.json({ success: true, data: photo });
    }
    if (path === '/photos/today' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const today = todayStr();
      const photos = globalDb.photos.filter((p: any) => p.coupleId === coupleId && p.date === today);
      return res.json({ success: true, data: photos });
    }
    if (path === '/photos' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const { date, partner, filter } = req.query;
      let photos = globalDb.photos.filter((p: any) => p.coupleId === coupleId);
      if (date) photos = photos.filter((p: any) => p.date === date);
      if (partner && partner !== 'all') photos = photos.filter((p: any) => p.partner === Number(partner));
      if (filter === 'favorites') photos = photos.filter((p: any) => p.isFavorite);
      photos.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      return res.json({ success: true, data: photos });
    }
    const photoFavMatch = path.match(/^\/photos\/([^/]+)\/favorite$/);
    if (photoFavMatch && method === 'PATCH') {
      const { coupleId } = req.body;
      const photo = globalDb.photos.find((p: any) => p.id === photoFavMatch[1] && p.coupleId === coupleId);
      if (!photo) return res.status(404).json({ success: false, error: 'Photo not found' });
      photo.isFavorite = !photo.isFavorite;
      return res.json({ success: true, data: photo });
    }
    const photoDeleteMatch = path.match(/^\/photos\/([^/]+)$/);
    if (photoDeleteMatch && method === 'DELETE') {
      const coupleId = req.query.coupleId as string;
      const idx = globalDb.photos.findIndex((p: any) => p.id === photoDeleteMatch[1] && p.coupleId === coupleId);
      if (idx !== -1) globalDb.photos.splice(idx, 1);
      return res.json({ success: true });
    }

    // ─── Voice ───
    if (path === '/voice' && method === 'POST') {
      const { coupleId, partner, duration, type, isChallenge, fileData } = req.body;
      const partnerNum = Number(partner) as PartnerNumber;
      const today = todayStr();
      const clip = {
        id: `vc-${uuid()}`,
        coupleId,
        partner: partnerNum,
        fileUrl: fileData || '',
        duration: Number(duration) || 0,
        type: type === 'video' ? 'video' : 'voice',
        isChallenge: isChallenge === 'true' || isChallenge === true,
        date: today,
        createdAt: new Date().toISOString(),
      };
      globalDb.voiceClips.push(clip);
      if (clip.isChallenge) {
        const challenge = getOrCreateChallenge(coupleId, today);
        if (partnerNum === 1) challenge.partner1Vc = true;
        else challenge.partner2Vc = true;
        updateChallengeStatus(coupleId, today);
      }
      return res.json({ success: true, data: clip });
    }
    if (path === '/voice/today' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const today = todayStr();
      const clips = globalDb.voiceClips.filter((v: any) => v.coupleId === coupleId && v.date === today);
      return res.json({ success: true, data: clips });
    }
    if (path === '/voice' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const clips = globalDb.voiceClips
        .filter((v: any) => v.coupleId === coupleId)
        .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      return res.json({ success: true, data: clips });
    }
    const voiceDeleteMatch = path.match(/^\/voice\/([^/]+)$/);
    if (voiceDeleteMatch && method === 'DELETE') {
      const coupleId = req.query.coupleId as string;
      const idx = globalDb.voiceClips.findIndex((v: any) => v.id === voiceDeleteMatch[1] && v.coupleId === coupleId);
      if (idx !== -1) globalDb.voiceClips.splice(idx, 1);
      return res.json({ success: true });
    }

    // ─── Messages ───
    if (path === '/messages' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const limit = Number(req.query.limit) || 50;
      if (!coupleId) return res.status(400).json({ success: false, error: 'coupleId required' });
      const messages = globalDb.messages
        .filter((m: any) => m.coupleId === coupleId)
        .sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt))
        .slice(-limit);
      return res.json({ success: true, data: messages });
    }
    if (path === '/messages' && method === 'POST') {
      const { coupleId, partner, content, type, mediaUrl, replyToId } = req.body;
      if (!coupleId || !partner || !content) {
        return res.status(400).json({ success: false, error: 'coupleId, partner, and content required' });
      }
      const message = {
        id: `msg-${uuid()}`,
        coupleId,
        partner: Number(partner) as PartnerNumber,
        content,
        type: type || 'text',
        mediaUrl,
        replyToId,
        reactions: {},
        createdAt: new Date().toISOString(),
      };
      globalDb.messages.push(message);
      return res.json({ success: true, data: message });
    }
    const msgReactMatch = path.match(/^\/messages\/([^/]+)\/react$/);
    if (msgReactMatch && method === 'POST') {
      const { coupleId, partner, emoji } = req.body;
      const msg = globalDb.messages.find((m: any) => m.id === msgReactMatch[1] && m.coupleId === coupleId);
      if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      const partnerNum = Number(partner) as PartnerNumber;
      const idx = msg.reactions[emoji].indexOf(partnerNum);
      if (idx > -1) {
        msg.reactions[emoji].splice(idx, 1);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji].push(partnerNum);
      }
      return res.json({ success: true, data: msg });
    }
    const msgDeleteMatch = path.match(/^\/messages\/([^/]+)$/);
    if (msgDeleteMatch && method === 'DELETE') {
      const coupleId = req.query.coupleId as string;
      const idx = globalDb.messages.findIndex((m: any) => m.id === msgDeleteMatch[1] && m.coupleId === coupleId);
      if (idx !== -1) globalDb.messages.splice(idx, 1);
      return res.json({ success: true });
    }

    // ─── Calls ───
    if (path === '/calls' && method === 'POST') {
      const { coupleId, caller } = req.body;
      const call = {
        id: `call-${uuid()}`,
        coupleId,
        caller: Number(caller) as PartnerNumber,
        startedAt: new Date().toISOString(),
        duration: 0,
        status: 'connected',
      };
      globalDb.calls.push(call);
      return res.json({ success: true, data: call });
    }
    const callPatchMatch = path.match(/^\/calls\/([^/]+)$/);
    if (callPatchMatch && method === 'PATCH') {
      const call = globalDb.calls.find((c: any) => c.id === callPatchMatch[1]);
      if (!call) return res.status(404).json({ success: false, error: 'Call not found' });
      Object.assign(call, req.body);
      return res.json({ success: true, data: call });
    }
    if (path === '/calls/history' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const calls = globalDb.calls
        .filter((c: any) => c.coupleId === coupleId)
        .sort((a: any, b: any) => b.startedAt.localeCompare(a.startedAt));
      return res.json({ success: true, data: calls });
    }
    if (path === '/calls/stats' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const calls = globalDb.calls.filter((c: any) => c.coupleId === coupleId);
      const today = todayStr();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const todayCalls = calls.filter((c: any) => c.startedAt.startsWith(today));
      const weekCalls = calls.filter((c: any) => new Date(c.startedAt) >= weekAgo);
      return res.json({
        success: true,
        data: {
          today: { count: todayCalls.length, duration: todayCalls.reduce((s: number, c: any) => s + (c.duration || 0), 0) },
          week: { count: weekCalls.length, duration: weekCalls.reduce((s: number, c: any) => s + (c.duration || 0), 0) },
          total: { count: calls.length, duration: calls.reduce((s: number, c: any) => s + (c.duration || 0), 0) },
        },
      });
    }

    // ─── Mood ───
    if (path === '/mood' && method === 'POST') {
      const { coupleId, partner, mood, note } = req.body;
      const today = todayStr();
      const partnerNum = Number(partner) as PartnerNumber;
      const entry = {
        id: `mood-${uuid()}`,
        coupleId,
        partner: partnerNum,
        mood,
        note,
        date: today,
        createdAt: new Date().toISOString(),
      };
      globalDb.moods.push(entry);
      const challenge = getOrCreateChallenge(coupleId, today);
      if (partnerNum === 1) challenge.partner1Mood = mood;
      else challenge.partner2Mood = mood;
      return res.json({ success: true, data: entry });
    }
    if (path === '/mood/history' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const moods = globalDb.moods.filter((m: any) => m.coupleId === coupleId);
      const map = new Map<string, any>();
      moods.forEach((m: any) => {
        if (!map.has(m.date)) map.set(m.date, { date: m.date });
        const item = map.get(m.date)!;
        if (m.partner === 1) item.partner1Mood = m.mood;
        else item.partner2Mood = m.mood;
      });
      return res.json({ success: true, data: Array.from(map.values()) });
    }

    // ─── Questions ───
    if (path === '/questions/today' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const today = todayStr();
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const questionText = QUESTIONS_POOL[dayOfYear % QUESTIONS_POOL.length];
      const answers = globalDb.questions.filter((q: any) => q.coupleId === coupleId && q.date === today);
      return res.json({
        success: true,
        data: {
          question: questionText,
          partner1Answer: answers.find((a: any) => a.partner === 1)?.answer,
          partner2Answer: answers.find((a: any) => a.partner === 2)?.answer,
        },
      });
    }
    if (path === '/questions/answer' && method === 'POST') {
      const { coupleId, partner, answer } = req.body;
      const today = todayStr();
      const partnerNum = Number(partner) as PartnerNumber;
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const questionText = QUESTIONS_POOL[dayOfYear % QUESTIONS_POOL.length];
      let qa = globalDb.questions.find((q: any) => q.coupleId === coupleId && q.date === today && q.partner === partnerNum);
      if (qa) {
        qa.answer = answer;
      } else {
        qa = {
          id: `qa-${uuid()}`,
          coupleId,
          partner: partnerNum,
          questionId: `q-${dayOfYear}`,
          questionText,
          answer,
          date: today,
          createdAt: new Date().toISOString(),
        };
        globalDb.questions.push(qa);
      }
      const challenge = getOrCreateChallenge(coupleId, today);
      if (partnerNum === 1) challenge.partner1Question = true;
      else challenge.partner2Question = true;
      return res.json({ success: true, data: qa });
    }

    // ─── Memories ───
    if (path === '/memories/on-this-day' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const today = todayStr();
      const [, month, day] = today.split('-');
      const pastChallenges = globalDb.challenges.filter(
        (c: any) => c.coupleId === coupleId && c.date.endsWith(`-${month}-${day}`) && c.date !== today
      );
      const memories = pastChallenges.map((ch: any) => ({
        date: ch.date,
        photos: globalDb.photos.filter((p: any) => p.coupleId === coupleId && p.date === ch.date).length,
        voiceClips: globalDb.voiceClips.filter((v: any) => v.coupleId === coupleId && v.date === ch.date).length,
        calls: globalDb.calls.filter((c: any) => c.coupleId === coupleId && c.startedAt.startsWith(ch.date)).length,
        messages: globalDb.messages.filter((m: any) => m.coupleId === coupleId && m.createdAt.startsWith(ch.date)).length,
        challengeStatus: ch.status,
        streakDay: ch.streakDay,
      }));
      return res.json({ success: true, data: memories });
    }
    if (path === '/memories' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const challenges = globalDb.challenges.filter((c: any) => c.coupleId === coupleId);
      const memories = challenges.map((ch: any) => ({
        date: ch.date,
        photos: globalDb.photos.filter((p: any) => p.coupleId === coupleId && p.date === ch.date).length,
        voiceClips: globalDb.voiceClips.filter((v: any) => v.coupleId === coupleId && v.date === ch.date).length,
        calls: globalDb.calls.filter((c: any) => c.coupleId === coupleId && c.startedAt.startsWith(ch.date)).length,
        messages: globalDb.messages.filter((m: any) => m.coupleId === coupleId && m.createdAt.startsWith(ch.date)).length,
        challengeStatus: ch.status,
        streakDay: ch.streakDay,
      }));
      return res.json({ success: true, data: memories });
    }
    const memoryDateMatch = path.match(/^\/memories\/(\d{4}-\d{2}-\d{2})$/);
    if (memoryDateMatch && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const date = memoryDateMatch[1];
      const ch = globalDb.challenges.find((c: any) => c.coupleId === coupleId && c.date === date);
      if (!ch) return res.json({ success: true, data: null });
      return res.json({
        success: true,
        data: {
          date: ch.date,
          photos: globalDb.photos.filter((p: any) => p.coupleId === coupleId && p.date === date).length,
          voiceClips: globalDb.voiceClips.filter((v: any) => v.coupleId === coupleId && v.date === date).length,
          calls: globalDb.calls.filter((c: any) => c.coupleId === coupleId && c.startedAt.startsWith(date)).length,
          messages: globalDb.messages.filter((m: any) => m.coupleId === coupleId && m.createdAt.startsWith(date)).length,
          challengeStatus: ch.status,
          streakDay: ch.streakDay,
        },
      });
    }

    // ─── Calendar ───
    const calendarMatch = path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/);
    if (calendarMatch && method === 'GET') {
      const [, year, month] = calendarMatch;
      const coupleId = req.query.coupleId as string;
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      const challenges = globalDb.challenges.filter((c: any) => c.coupleId === coupleId && c.date.startsWith(monthPrefix));
      const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
      const calendarDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
        const ch = challenges.find((c: any) => c.date === dateStr);
        calendarDays.push({ date: dateStr, status: ch ? ch.status : 'none', streakDay: ch?.streakDay });
      }
      return res.json({ success: true, data: calendarDays });
    }

    // ─── Timeline ───
    if (path === '/timeline' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const couple = globalDb.couples.find((c: any) => c.id === coupleId);
      const events: any[] = [];
      if (couple?.relationshipStartDate) {
        events.push({ id: 'event-start', date: couple.relationshipStartDate, type: 'relationship-start', title: 'Journey Began', description: 'The beautiful day our relationship story started.', emoji: '❤️' });
      }
      events.sort((a, b) => a.date.localeCompare(b.date));
      return res.json({ success: true, data: events });
    }

    // ─── Statistics ───
    if (path === '/statistics' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const couple = globalDb.couples.find((c: any) => c.id === coupleId);
      const completed = globalDb.challenges.filter((c: any) => c.coupleId === coupleId && c.status === 'completed');
      const photos = globalDb.photos.filter((p: any) => p.coupleId === coupleId);
      const voice = globalDb.voiceClips.filter((v: any) => v.coupleId === coupleId);
      const calls = globalDb.calls.filter((c: any) => c.coupleId === coupleId);
      const messages = globalDb.messages.filter((m: any) => m.coupleId === coupleId);
      let daysTogether = 1;
      if (couple?.relationshipStartDate) {
        daysTogether = Math.max(1, Math.floor((Date.now() - new Date(couple.relationshipStartDate).getTime()) / 86400000));
      }
      return res.json({
        success: true,
        data: {
          currentStreak: completed.length,
          longestStreak: completed.length,
          totalCompletedDays: completed.length,
          totalPhotos: photos.length,
          totalVoiceClips: voice.length,
          totalCalls: calls.length,
          totalCallDuration: calls.reduce((s: number, c: any) => s + (c.duration || 0), 0),
          totalMessages: messages.length,
          favoritePhotos: photos.filter((p: any) => p.isFavorite).length,
          daysTogether,
        },
      });
    }

    // ─── Achievements ───
    if (path === '/achievements' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const unlocked = globalDb.achievementsUnlocked.filter((a: any) => a.coupleId === coupleId);
      return res.json({ success: true, data: { achievements: [], unlocked } });
    }

    // ─── Streak ───
    if (path === '/streak' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const couple = globalDb.couples.find((c: any) => c.id === coupleId);
      const completed = globalDb.challenges.filter((c: any) => c.coupleId === coupleId && c.status === 'completed');
      return res.json({
        success: true,
        data: {
          currentStreak: completed.length,
          longestStreak: completed.length,
          totalCompletedDays: completed.length,
          streakFreezesRemaining: couple?.streakFreezesRemaining ?? 2,
          streakFreezeUsedToday: false,
        },
      });
    }
    if (path === '/streak/freeze' && method === 'POST') {
      const { coupleId } = req.body;
      const couple = globalDb.couples.find((c: any) => c.id === coupleId);
      if (!couple) return res.status(404).json({ success: false, error: 'Couple not found' });
      if (couple.streakFreezesRemaining <= 0) return res.status(400).json({ success: false, error: 'No streak freezes remaining' });
      couple.streakFreezesRemaining -= 1;
      const completed = globalDb.challenges.filter((c: any) => c.coupleId === coupleId && c.status === 'completed');
      return res.json({
        success: true,
        data: {
          currentStreak: completed.length,
          longestStreak: completed.length,
          totalCompletedDays: completed.length,
          streakFreezesRemaining: couple.streakFreezesRemaining,
          streakFreezeUsedToday: true,
        },
      });
    }

    // ─── Bucket List ───
    if (path === '/bucket-list' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      return res.json({ success: true, data: globalDb.bucketList.filter((b: any) => b.coupleId === coupleId) });
    }
    if (path === '/bucket-list' && method === 'POST') {
      const { coupleId, partner, title, category } = req.body;
      const item = {
        id: `bucket-${uuid()}`,
        coupleId,
        title,
        category,
        isCompleted: false,
        addedBy: Number(partner) as PartnerNumber,
        createdAt: new Date().toISOString(),
      };
      globalDb.bucketList.push(item);
      return res.json({ success: true, data: item });
    }
    const bucketToggleMatch = path.match(/^\/bucket-list\/([^/]+)\/toggle$/);
    if (bucketToggleMatch && method === 'PATCH') {
      const { coupleId } = req.body;
      const item = globalDb.bucketList.find((b: any) => b.id === bucketToggleMatch[1] && b.coupleId === coupleId);
      if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
      item.isCompleted = !item.isCompleted;
      item.completedAt = item.isCompleted ? new Date().toISOString() : undefined;
      return res.json({ success: true, data: item });
    }
    const bucketDeleteMatch = path.match(/^\/bucket-list\/([^/]+)$/);
    if (bucketDeleteMatch && method === 'DELETE') {
      const coupleId = req.query.coupleId as string;
      const idx = globalDb.bucketList.findIndex((b: any) => b.id === bucketDeleteMatch[1] && b.coupleId === coupleId);
      if (idx !== -1) globalDb.bucketList.splice(idx, 1);
      return res.json({ success: true });
    }

    // ─── Love Notes ───
    if (path === '/love-notes' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const notes = globalDb.loveNotes
        .filter((n: any) => n.coupleId === coupleId)
        .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      return res.json({ success: true, data: notes });
    }
    if (path === '/love-notes' && method === 'POST') {
      const { coupleId, partner, content } = req.body;
      const note = {
        id: `note-${uuid()}`,
        coupleId,
        partner: Number(partner) as PartnerNumber,
        content,
        isFavorite: false,
        createdAt: new Date().toISOString(),
      };
      globalDb.loveNotes.push(note);
      return res.json({ success: true, data: note });
    }
    const noteDeleteMatch = path.match(/^\/love-notes\/([^/]+)$/);
    if (noteDeleteMatch && method === 'DELETE') {
      const coupleId = req.query.coupleId as string;
      const idx = globalDb.loveNotes.findIndex((n: any) => n.id === noteDeleteMatch[1] && n.coupleId === coupleId);
      if (idx !== -1) globalDb.loveNotes.splice(idx, 1);
      return res.json({ success: true });
    }

    // ─── Surprises ───
    if (path === '/surprises' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      const list = globalDb.surprises
        .filter((s: any) => s.coupleId === coupleId)
        .sort((a: any, b: any) => a.unlockAt.localeCompare(b.unlockAt));
      return res.json({ success: true, data: list });
    }
    if (path === '/surprises' && method === 'POST') {
      const { coupleId, fromPartner, title, message, unlockAt } = req.body;
      const surprise = {
        id: `surp-${uuid()}`,
        coupleId,
        fromPartner: Number(fromPartner) as PartnerNumber,
        title,
        message,
        unlockAt,
        isUnlocked: false,
        createdAt: new Date().toISOString(),
      };
      globalDb.surprises.push(surprise);
      return res.json({ success: true, data: surprise });
    }
    const surpriseUnlockMatch = path.match(/^\/surprises\/([^/]+)\/unlock$/);
    if (surpriseUnlockMatch && method === 'PATCH') {
      const { coupleId } = req.body;
      const item = globalDb.surprises.find((s: any) => s.id === surpriseUnlockMatch[1] && s.coupleId === coupleId);
      if (!item) return res.status(404).json({ success: false, error: 'Surprise not found' });
      item.isUnlocked = true;
      item.unlockedAt = new Date().toISOString();
      return res.json({ success: true, data: item });
    }

    // ─── Important Dates ───
    if (path === '/dates' && method === 'GET') {
      const coupleId = req.query.coupleId as string;
      return res.json({ success: true, data: globalDb.importantDates.filter((d: any) => d.coupleId === coupleId) });
    }
    if (path === '/dates' && method === 'POST') {
      const { coupleId, addedBy, title, date, type } = req.body;
      const item = {
        id: `date-${uuid()}`,
        coupleId,
        title,
        date,
        type,
        addedBy: Number(addedBy) as PartnerNumber,
        createdAt: new Date().toISOString(),
      };
      globalDb.importantDates.push(item);
      return res.json({ success: true, data: item });
    }
    const dateDeleteMatch = path.match(/^\/dates\/([^/]+)$/);
    if (dateDeleteMatch && method === 'DELETE') {
      const coupleId = req.query.coupleId as string;
      const idx = globalDb.importantDates.findIndex((d: any) => d.id === dateDeleteMatch[1] && d.coupleId === coupleId);
      if (idx !== -1) globalDb.importantDates.splice(idx, 1);
      return res.json({ success: true });
    }

    // ─── Notifications ───
    if (path === '/notifications' && method === 'GET') {
      return res.json({ success: true, data: [] });
    }

    // ─── Fallback ───
    return res.status(404).json({ success: false, error: `Route not found: ${method} ${path}` });

  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}
