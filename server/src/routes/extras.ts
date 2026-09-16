import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { PartnerNumber } from '../types.js';

export const extrasRouter = Router();

/* ─── Mood ─── */
extrasRouter.post('/mood', (req, res) => {
  const { coupleId, partner, mood, note } = req.body;
  const today = db.getTodayString();
  const partnerNum = Number(partner) as PartnerNumber;

  const entry = {
    id: `mood-${uuidv4()}`,
    coupleId,
    partner: partnerNum,
    mood,
    note,
    date: today,
    createdAt: new Date().toISOString(),
  };

  db.get('moods').push(entry);

  // Update challenge
  const challenge = db.getOrCreateChallenge(coupleId, today);
  if (partnerNum === 1) challenge.partner1Mood = mood;
  else challenge.partner2Mood = mood;

  db.save();
  res.json({ success: true, data: entry });
});

extrasRouter.get('/mood/history', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const moods = db.get('moods').filter((m) => m.coupleId === coupleId);

  // Group by date
  const map = new Map<string, { date: string; partner1Mood?: string; partner2Mood?: string }>();
  moods.forEach((m) => {
    if (!map.has(m.date)) map.set(m.date, { date: m.date });
    const item = map.get(m.date)!;
    if (m.partner === 1) item.partner1Mood = m.mood;
    else item.partner2Mood = m.mood;
  });

  res.json({ success: true, data: Array.from(map.values()) });
});

/* ─── Questions ─── */
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

extrasRouter.get('/questions/today', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const today = db.getTodayString();

  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const questionText = QUESTIONS_POOL[dayOfYear % QUESTIONS_POOL.length];

  const answers = db.get('questions').filter((q) => q.coupleId === coupleId && q.date === today);
  const p1 = answers.find((a) => a.partner === 1)?.answer;
  const p2 = answers.find((a) => a.partner === 2)?.answer;

  res.json({
    success: true,
    data: {
      question: questionText,
      partner1Answer: p1,
      partner2Answer: p2,
    },
  });
});

extrasRouter.post('/questions/answer', (req, res) => {
  const { coupleId, partner, answer } = req.body;
  const today = db.getTodayString();
  const partnerNum = Number(partner) as PartnerNumber;

  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const questionText = QUESTIONS_POOL[dayOfYear % QUESTIONS_POOL.length];

  let qa = db.get('questions').find((q) => q.coupleId === coupleId && q.date === today && q.partner === partnerNum);
  if (qa) {
    qa.answer = answer;
  } else {
    qa = {
      id: `qa-${uuidv4()}`,
      coupleId,
      partner: partnerNum,
      questionId: `q-${dayOfYear}`,
      questionText,
      answer,
      date: today,
      createdAt: new Date().toISOString(),
    };
    db.get('questions').push(qa);
  }

  const challenge = db.getOrCreateChallenge(coupleId, today);
  if (partnerNum === 1) challenge.partner1Question = true;
  else challenge.partner2Question = true;

  db.save();
  res.json({ success: true, data: qa });
});

/* ─── Memories & On This Day ─── */
extrasRouter.get('/memories', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const challenges = db.get('challenges').filter((c) => c.coupleId === coupleId);

  const memories = challenges.map((ch) => {
    const photos = db.get('photos').filter((p) => p.coupleId === coupleId && p.date === ch.date).length;
    const vcs = db.get('voiceClips').filter((v) => v.coupleId === coupleId && v.date === ch.date).length;
    const calls = db.get('calls').filter((c) => c.coupleId === coupleId && c.startedAt.startsWith(ch.date)).length;
    const messages = db.get('messages').filter((m) => m.coupleId === coupleId && m.createdAt.startsWith(ch.date)).length;

    return {
      date: ch.date,
      photos,
      voiceClips: vcs,
      calls,
      messages,
      challengeStatus: ch.status,
      streakDay: ch.streakDay,
    };
  });

  res.json({ success: true, data: memories });
});

extrasRouter.get('/memories/on-this-day', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const today = db.getTodayString();
  const [, month, day] = today.split('-');

  const pastChallenges = db.get('challenges').filter(
    (c) => c.coupleId === coupleId && c.date.endsWith(`-${month}-${day}`) && c.date !== today
  );

  const memories = pastChallenges.map((ch) => {
    const photos = db.get('photos').filter((p) => p.coupleId === coupleId && p.date === ch.date).length;
    const vcs = db.get('voiceClips').filter((v) => v.coupleId === coupleId && v.date === ch.date).length;
    const calls = db.get('calls').filter((c) => c.coupleId === coupleId && c.startedAt.startsWith(ch.date)).length;
    const messages = db.get('messages').filter((m) => m.coupleId === coupleId && m.createdAt.startsWith(ch.date)).length;

    return {
      date: ch.date,
      photos,
      voiceClips: vcs,
      calls,
      messages,
      challengeStatus: ch.status,
      streakDay: ch.streakDay,
    };
  });

  res.json({ success: true, data: memories });
});

/* ─── Calendar ─── */
extrasRouter.get('/calendar/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const coupleId = req.query.coupleId as string;
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  const challenges = db.get('challenges').filter((c) => c.coupleId === coupleId && c.date.startsWith(monthPrefix));

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const calendarDays = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    const ch = challenges.find((c) => c.date === dateStr);
    calendarDays.push({
      date: dateStr,
      status: ch ? ch.status : 'none',
      streakDay: ch?.streakDay,
    });
  }

  res.json({ success: true, data: calendarDays });
});

/* ─── Timeline ─── */
extrasRouter.get('/timeline', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const couple = db.get('couples').find((c) => c.id === coupleId);

  const events: any[] = [];
  if (couple?.relationshipStartDate) {
    events.push({
      id: 'event-start',
      date: couple.relationshipStartDate,
      type: 'relationship-start',
      title: 'Journey Began',
      description: 'The beautiful day our relationship story started.',
      emoji: '❤️',
    });
  }

  const completedChallenges = db.get('challenges')
    .filter((c) => c.coupleId === coupleId && c.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (completedChallenges.length > 0) {
    events.push({
      id: 'event-first-challenge',
      date: completedChallenges[0].date,
      type: 'first-challenge',
      title: 'First Challenge Conquered',
      description: 'Completed our very first shared daily challenge together!',
      emoji: '🎯',
    });
  }

  if (completedChallenges.length >= 7) {
    events.push({
      id: 'event-7-streak',
      date: completedChallenges[6].date,
      type: 'streak-milestone',
      title: '7-Day Streak Achieved',
      description: 'One full week of showing up for each other every single day.',
      emoji: '🔥',
    });
  }

  if (completedChallenges.length >= 30) {
    events.push({
      id: 'event-30-streak',
      date: completedChallenges[29].date,
      type: 'streak-milestone',
      title: '30-Day Milestone',
      description: 'A full month of memories, photos, and deep connection.',
      emoji: '🌟',
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  res.json({ success: true, data: events });
});

/* ─── Statistics ─── */
extrasRouter.get('/statistics', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const couple = db.get('couples').find((c) => c.id === coupleId);

  const completed = db.get('challenges').filter((c) => c.coupleId === coupleId && c.status === 'completed');
  const photos = db.get('photos').filter((p) => p.coupleId === coupleId);
  const voice = db.get('voiceClips').filter((v) => v.coupleId === coupleId);
  const calls = db.get('calls').filter((c) => c.coupleId === coupleId);
  const messages = db.get('messages').filter((m) => m.coupleId === coupleId);

  const totalCallDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

  let daysTogether = 1;
  if (couple?.relationshipStartDate) {
    const diffMs = Date.now() - new Date(couple.relationshipStartDate).getTime();
    daysTogether = Math.max(1, Math.floor(diffMs / 86400000));
  }

  const stats = {
    currentStreak: completed.length,
    longestStreak: completed.length,
    totalCompletedDays: completed.length,
    totalPhotos: photos.length,
    totalVoiceClips: voice.length,
    totalCalls: calls.length,
    totalCallDuration,
    totalMessages: messages.length,
    favoritePhotos: photos.filter((p) => p.isFavorite).length,
    daysTogether,
  };

  res.json({ success: true, data: stats });
});

/* ─── Achievements ─── */
extrasRouter.get('/achievements', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const unlocked = db.get('achievementsUnlocked').filter((a) => a.coupleId === coupleId);
  res.json({ success: true, data: { achievements: [], unlocked } });
});

/* ─── Streak ─── */
extrasRouter.get('/streak', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const couple = db.get('couples').find((c) => c.id === coupleId);
  const completed = db.get('challenges').filter((c) => c.coupleId === coupleId && c.status === 'completed');

  const streakData = {
    currentStreak: completed.length,
    longestStreak: completed.length,
    totalCompletedDays: completed.length,
    streakFreezesRemaining: couple?.streakFreezesRemaining ?? 2,
    streakFreezeUsedToday: false,
  };

  res.json({ success: true, data: streakData });
});

extrasRouter.post('/streak/freeze', (req, res) => {
  const { coupleId } = req.body;
  const couple = db.get('couples').find((c) => c.id === coupleId);

  if (!couple) return res.status(404).json({ success: false, error: 'Couple not found' });
  if (couple.streakFreezesRemaining <= 0) {
    return res.status(400).json({ success: false, error: 'No streak freezes remaining this month' });
  }

  couple.streakFreezesRemaining -= 1;
  db.save();

  const completed = db.get('challenges').filter((c) => c.coupleId === coupleId && c.status === 'completed');
  res.json({
    success: true,
    data: {
      currentStreak: completed.length,
      longestStreak: completed.length,
      totalCompletedDays: completed.length,
      streakFreezesRemaining: couple.streakFreezesRemaining,
      streakFreezeUsedToday: true,
    },
  });
});

/* ─── Bucket List ─── */
extrasRouter.get('/bucket-list', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const list = db.get('bucketList').filter((b) => b.coupleId === coupleId);
  res.json({ success: true, data: list });
});

extrasRouter.post('/bucket-list', (req, res) => {
  const { coupleId, partner, title, category } = req.body;
  const item = {
    id: `bucket-${uuidv4()}`,
    coupleId,
    title,
    category,
    isCompleted: false,
    addedBy: Number(partner) as PartnerNumber,
    createdAt: new Date().toISOString(),
  };
  db.get('bucketList').push(item);
  db.save();
  res.json({ success: true, data: item });
});

extrasRouter.patch('/bucket-list/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { coupleId } = req.body;
  const item = db.get('bucketList').find((b) => b.id === id && b.coupleId === coupleId);
  if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

  item.isCompleted = !item.isCompleted;
  item.completedAt = item.isCompleted ? new Date().toISOString() : undefined;
  db.save();

  res.json({ success: true, data: item });
});

extrasRouter.delete('/bucket-list/:id', (req, res) => {
  const { id } = req.params;
  const coupleId = req.query.coupleId as string;
  const list = db.get('bucketList');
  const idx = list.findIndex((b) => b.id === id && b.coupleId === coupleId);
  if (idx !== -1) {
    list.splice(idx, 1);
    db.save();
  }
  res.json({ success: true });
});

/* ─── Love Notes ─── */
extrasRouter.get('/love-notes', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const notes = db.get('loveNotes')
    .filter((n) => n.coupleId === coupleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ success: true, data: notes });
});

extrasRouter.post('/love-notes', (req, res) => {
  const { coupleId, partner, content } = req.body;
  const note = {
    id: `note-${uuidv4()}`,
    coupleId,
    partner: Number(partner) as PartnerNumber,
    content,
    isFavorite: false,
    createdAt: new Date().toISOString(),
  };
  db.get('loveNotes').push(note);
  db.save();
  res.json({ success: true, data: note });
});

extrasRouter.delete('/love-notes/:id', (req, res) => {
  const { id } = req.params;
  const coupleId = req.query.coupleId as string;
  const list = db.get('loveNotes');
  const idx = list.findIndex((n) => n.id === id && n.coupleId === coupleId);
  if (idx !== -1) {
    list.splice(idx, 1);
    db.save();
  }
  res.json({ success: true });
});

/* ─── Surprises ─── */
extrasRouter.get('/surprises', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const list = db.get('surprises')
    .filter((s) => s.coupleId === coupleId)
    .sort((a, b) => a.unlockAt.localeCompare(b.unlockAt));
  res.json({ success: true, data: list });
});

extrasRouter.post('/surprises', (req, res) => {
  const { coupleId, fromPartner, title, message, unlockAt } = req.body;
  const surprise = {
    id: `surp-${uuidv4()}`,
    coupleId,
    fromPartner: Number(fromPartner) as PartnerNumber,
    title,
    message,
    unlockAt,
    isUnlocked: false,
    createdAt: new Date().toISOString(),
  };
  db.get('surprises').push(surprise);
  db.save();
  res.json({ success: true, data: surprise });
});

extrasRouter.patch('/surprises/:id/unlock', (req, res) => {
  const { id } = req.params;
  const { coupleId } = req.body;
  const item = db.get('surprises').find((s) => s.id === id && s.coupleId === coupleId);
  if (!item) return res.status(404).json({ success: false, error: 'Surprise not found' });

  item.isUnlocked = true;
  item.unlockedAt = new Date().toISOString();
  db.save();

  res.json({ success: true, data: item });
});

/* ─── Important Dates ─── */
extrasRouter.get('/dates', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const dates = db.get('importantDates').filter((d) => d.coupleId === coupleId);
  res.json({ success: true, data: dates });
});

extrasRouter.post('/dates', (req, res) => {
  const { coupleId, addedBy, title, date, type } = req.body;
  const item = {
    id: `date-${uuidv4()}`,
    coupleId,
    title,
    date,
    type,
    addedBy: Number(addedBy) as PartnerNumber,
    createdAt: new Date().toISOString(),
  };
  db.get('importantDates').push(item);
  db.save();
  res.json({ success: true, data: item });
});

extrasRouter.delete('/dates/:id', (req, res) => {
  const { id } = req.params;
  const coupleId = req.query.coupleId as string;
  const list = db.get('importantDates');
  const idx = list.findIndex((d) => d.id === id && d.coupleId === coupleId);
  if (idx !== -1) {
    list.splice(idx, 1);
    db.save();
  }
  res.json({ success: true });
});
