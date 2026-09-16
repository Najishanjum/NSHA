import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Couple,
  DailyChallenge,
  Photo,
  VoiceClip,
  Message,
  Call,
  MoodEntry,
  QuestionAnswer,
  BucketListItem,
  LoveNote,
  Surprise,
  ImportantDate,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export interface DatabaseSchema {
  couples: Couple[];
  challenges: DailyChallenge[];
  photos: Photo[];
  voiceClips: VoiceClip[];
  messages: Message[];
  calls: Call[];
  moods: MoodEntry[];
  questions: QuestionAnswer[];
  bucketList: BucketListItem[];
  loveNotes: LoveNote[];
  surprises: Surprise[];
  importantDates: ImportantDate[];
  achievementsUnlocked: { id: string; coupleId: string; achievementId: string; unlockedAt: string }[];
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading db.json, initializing fresh data', e);
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

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving db.json', e);
    }
  }

  public get<K extends keyof DatabaseSchema>(table: K): DatabaseSchema[K] {
    return this.data[table];
  }

  public getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  public getOrCreateChallenge(coupleId: string, dateStr?: string): DailyChallenge {
    const date = dateStr || this.getTodayString();
    let challenge = this.data.challenges.find((c) => c.coupleId === coupleId && c.date === date);

    if (!challenge) {
      // Calculate current streak
      const pastCompleted = this.data.challenges
        .filter((c) => c.coupleId === coupleId && c.status === 'completed' && c.date < date)
        .sort((a, b) => b.date.localeCompare(a.date));

      let currentStreak = pastCompleted.length;

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
        streakDay: currentStreak + 1,
        requiredPhotos: 5,
        requiredVcs: 1,
      };

      this.data.challenges.push(challenge);
      this.save();
    }

    return challenge;
  }

  public updateChallengeStatus(coupleId: string, dateStr?: string) {
    const challenge = this.getOrCreateChallenge(coupleId, dateStr);

    const p1Done = challenge.partner1Photos >= 5 && challenge.partner1Vc;
    const p2Done = challenge.partner2Photos >= 5 && challenge.partner2Vc;

    if (p1Done && p2Done) {
      challenge.status = 'completed';
      // Check for unlockable achievements
      this.checkAchievements(coupleId);
    } else if (
      challenge.partner1Photos > 0 ||
      challenge.partner2Photos > 0 ||
      challenge.partner1Vc ||
      challenge.partner2Vc
    ) {
      challenge.status = 'partial';
    } else {
      challenge.status = 'pending';
    }

    this.save();
    return challenge;
  }

  public checkAchievements(coupleId: string) {
    const coupleChallenges = this.data.challenges.filter((c) => c.coupleId === coupleId && c.status === 'completed');
    const totalPhotos = this.data.photos.filter((p) => p.coupleId === coupleId).length;
    const totalVcs = this.data.voiceClips.filter((v) => v.coupleId === coupleId).length;
    const totalCalls = this.data.calls.filter((c) => c.coupleId === coupleId).length;
    const totalCallDuration = this.data.calls
      .filter((c) => c.coupleId === coupleId)
      .reduce((acc, c) => acc + (c.duration || 0), 0);

    const unlock = (achId: string) => {
      if (!this.data.achievementsUnlocked.some((a) => a.coupleId === coupleId && a.achievementId === achId)) {
        this.data.achievementsUnlocked.push({
          id: `ach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          coupleId,
          achievementId: achId,
          unlockedAt: new Date().toISOString(),
        });
      }
    };

    if (coupleChallenges.length >= 1) unlock('first-day');
    if (coupleChallenges.length >= 7) unlock('seven-day-streak');
    if (coupleChallenges.length >= 14) unlock('fourteen-day-streak');
    if (coupleChallenges.length >= 30) {
      unlock('thirty-day-streak');
      unlock('thirty-days');
    }
    if (coupleChallenges.length >= 100) {
      unlock('hundred-day-streak');
      unlock('hundred-days');
    }
    if (coupleChallenges.length >= 365) unlock('year-streak');

    if (totalPhotos >= 100) unlock('hundred-photos');
    if (totalPhotos >= 500) unlock('five-hundred-photos');
    if (totalPhotos >= 1000) unlock('thousand-photos');

    if (totalVcs >= 50) unlock('fifty-vcs');
    if (totalVcs >= 100) unlock('hundred-vcs');

    if (totalCalls >= 100) unlock('hundred-calls');
    if (totalCallDuration >= 36000) unlock('ten-hours-calling');

    this.save();
  }
}

export const db = new Database();
