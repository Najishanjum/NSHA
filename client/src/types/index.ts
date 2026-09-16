/* Couple Types */

export interface Couple {
  id: string;
  code: string;
  partner1Name: string;
  partner2Name: string;
  coupleNickname: string;
  relationshipStartDate: string;
  profileImageUrl?: string;
  timezone: string;
  streakFreezesRemaining: number;
  createdAt: string;
}

export type PartnerNumber = 1 | 2;

export interface Partner {
  number: PartnerNumber;
  name: string;
}

/* Challenge Types */

export type ChallengeStatus = 'pending' | 'partial' | 'completed';

export interface DailyChallenge {
  id: string;
  coupleId: string;
  date: string;
  partner1Photos: number;
  partner2Photos: number;
  partner1Vc: boolean;
  partner2Vc: boolean;
  partner1Question: boolean;
  partner2Question: boolean;
  partner1Mood: string | null;
  partner2Mood: string | null;
  status: ChallengeStatus;
  streakDay: number;
  requiredPhotos: number;
  requiredVcs: number;
}

export interface ChallengeProgress {
  photos: number;
  requiredPhotos: number;
  vc: boolean;
  question: boolean;
  mood: string | null;
  isComplete: boolean;
}

/* Photo Types */

export interface Photo {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  fileUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  isFavorite: boolean;
  isChallenge: boolean;
  promptIndex?: number;
  date: string;
  createdAt: string;
}

/* Voice/Video Types */

export type ClipType = 'voice' | 'video';

export interface VoiceClip {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  fileUrl: string;
  duration: number;
  type: ClipType;
  isChallenge: boolean;
  date: string;
  createdAt: string;
}

/* Chat Types */

export type MessageType = 'text' | 'image' | 'voice' | 'video';

export interface Message {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  replyToId?: string;
  reactions: Record<string, PartnerNumber[]>;
  createdAt: string;
}

/* Call Types */

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed' | 'failed' | 'cancelled';

export interface Call {
  id: string;
  coupleId: string;
  caller: PartnerNumber;
  startedAt: string;
  endedAt?: string;
  duration: number;
  status: CallStatus;
}

/* Mood Types */

export type MoodValue = 'great' | 'good' | 'okay' | 'not-great' | 'missing-you';

export const MOOD_OPTIONS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😊', label: 'Great' },
  { value: 'good', emoji: '😌', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'not-great', emoji: '😔', label: 'Not great' },
  { value: 'missing-you', emoji: '❤️', label: 'Missing you' },
];

export interface MoodEntry {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  mood: MoodValue;
  note?: string;
  date: string;
  createdAt: string;
}

/* Question Types */

export interface DailyQuestion {
  id: string;
  text: string;
  date: string;
}

export interface QuestionAnswer {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  questionId: string;
  questionText: string;
  answer: string;
  date: string;
  createdAt: string;
}

/* Memory Types */

export interface DailyMemory {
  date: string;
  photos: number;
  voiceClips: number;
  calls: number;
  messages: number;
  challengeStatus: ChallengeStatus;
  streakDay: number;
  partner1Mood?: MoodValue;
  partner2Mood?: MoodValue;
}

/* Achievement Types */

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  emoji: string;
  requirement: number;
  category: 'streak' | 'photos' | 'vcs' | 'calls' | 'days';
}

export interface UserAchievement {
  id: string;
  coupleId: string;
  achievementId: string;
  unlockedAt: string;
}

/* Streak Types */

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  streakFreezesRemaining: number;
  streakFreezeUsedToday: boolean;
}

/* Statistics Types */

export interface CoupleStatistics {
  currentStreak: number;
  longestStreak: number;
  totalCompletedDays: number;
  totalPhotos: number;
  totalVoiceClips: number;
  totalCalls: number;
  totalCallDuration: number;
  totalMessages: number;
  favoritePhotos: number;
  daysTogether: number;
}

/* Bucket List Types */

export type BucketListCategory = 'travel' | 'experiences' | 'food' | 'goals';

export interface BucketListItem {
  id: string;
  coupleId: string;
  title: string;
  category: BucketListCategory;
  isCompleted: boolean;
  addedBy: PartnerNumber;
  completedAt?: string;
  createdAt: string;
}

/* Love Note Types */

export interface LoveNote {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'voice';
  isFavorite: boolean;
  createdAt: string;
}

/* Surprise Types */

export interface Surprise {
  id: string;
  coupleId: string;
  fromPartner: PartnerNumber;
  title: string;
  message: string;
  mediaUrl?: string;
  unlockAt: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
}

/* Important Dates */

export interface ImportantDate {
  id: string;
  coupleId: string;
  title: string;
  date: string;
  type: 'anniversary' | 'birthday' | 'first-meeting' | 'first-date' | 'trip' | 'custom';
  addedBy: PartnerNumber;
  createdAt: string;
}

/* Notification Types */

export type NotificationType = 'challenge' | 'partner-activity' | 'streak' | 'achievement' | 'love-note' | 'surprise' | 'reminder';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/* API Types */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/* Calendar Types */

export interface CalendarDay {
  date: string;
  status: ChallengeStatus | 'none';
  streakDay?: number;
}

/* Timeline Types */

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'relationship-start' | 'first-challenge' | 'streak-milestone' | 'photo-milestone' | 'vc-milestone' | 'call-milestone' | 'days-milestone' | 'achievement';
  title: string;
  description: string;
  emoji: string;
}

/* Photo Prompts */

export const DAILY_PHOTO_PROMPTS: string[][] = [
  [
    'Something that made you smile today 😊',
    'Your current view 👀',
    'What you\'re eating 🍕',
    'Something you\'re working on 💻',
    'A photo for your partner ❤️',
  ],
  [
    'Your morning ☀️',
    'Something that reminded you of your partner 💭',
    'Your outfit today 👕',
    'Something beautiful you noticed 🌸',
    'Your current mood 😊',
  ],
  [
    'Something you\'re grateful for 🙏',
    'Your workspace 💼',
    'Something new you tried 🆕',
    'A small detail you love 🔍',
    'Your evening ✨',
  ],
  [
    'Something funny 😂',
    'Your favorite thing today ⭐',
    'Something you\'re looking forward to 🎯',
    'A color that caught your eye 🎨',
    'Something cozy 🧸',
  ],
  [
    'Your morning routine ☕',
    'Something unexpected 😮',
    'Your happy place 🏡',
    'Something you made ✨',
    'A sunset or sky shot 🌅',
  ],
  [
    'Your coffee/tea ☕',
    'Something that inspires you 💡',
    'Your current read or watch 📖',
    'A detail others might miss 👁️',
    'Something soft 🧣',
  ],
  [
    'First thing you saw today 👀',
    'Your lunch 🍜',
    'Something green 🌿',
    'Your favorite spot ❤️',
    'End of day vibes 🌙',
  ],
];

/* Daily Questions Pool */

export const DAILY_QUESTIONS: string[] = [
  'What made you smile today?',
  'What is one thing you appreciate about me?',
  'Where should we travel together?',
  'What\'s your favorite memory with me?',
  'What\'s one thing you want us to do this month?',
  'If we could do anything tomorrow, what would it be?',
  'What song reminds you of us?',
  'What\'s something new you learned today?',
  'What are you looking forward to this week?',
  'What\'s one thing that always makes your day better?',
  'If you could relive one day with me, which would it be?',
  'What\'s something you want to tell me right now?',
  'What\'s our best inside joke?',
  'What\'s a dream you haven\'t told me about?',
  'What do you love most about lazy days together?',
  'What\'s one thing you want to learn together?',
  'What\'s the best advice you\'ve ever received?',
  'What meal should we cook together next?',
  'What\'s something small that means a lot to you?',
  'If we had a theme song, what would it be?',
  'What\'s your favorite way to spend time together?',
  'What\'s one goal you want us to achieve together?',
  'What made you fall in love?',
  'What\'s something you admire about me?',
  'Describe our relationship in three words.',
  'What\'s your favorite season and why?',
  'What\'s the most thoughtful thing someone did for you?',
  'What\'s a place that feels like home?',
  'What\'s your current comfort show/movie?',
  'What would you name our autobiography?',
  'What\'s a tradition you\'d like us to start?',
];

/* Achievements Definition */

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-day', key: 'FIRST_DAY', title: 'First Day', description: 'Completed your first challenge', emoji: '🏆', requirement: 1, category: 'days' },
  { id: 'seven-day-streak', key: 'SEVEN_DAY_STREAK', title: '7-Day Streak', description: 'Completed seven consecutive days', emoji: '🔥', requirement: 7, category: 'streak' },
  { id: 'fourteen-day-streak', key: 'FOURTEEN_DAY_STREAK', title: 'Two Weeks Strong', description: 'Completed fourteen consecutive days', emoji: '💪', requirement: 14, category: 'streak' },
  { id: 'thirty-day-streak', key: 'THIRTY_DAY_STREAK', title: '30-Day Streak', description: 'Completed thirty consecutive days', emoji: '🌟', requirement: 30, category: 'streak' },
  { id: 'hundred-day-streak', key: 'HUNDRED_DAY_STREAK', title: 'Unstoppable', description: 'Completed one hundred consecutive days', emoji: '💎', requirement: 100, category: 'streak' },
  { id: 'year-streak', key: 'YEAR_STREAK', title: 'Forever Archive', description: 'Completed 365 consecutive days', emoji: '👑', requirement: 365, category: 'streak' },
  { id: 'hundred-photos', key: 'HUNDRED_PHOTOS', title: '100 Photos', description: 'Shared 100 photos together', emoji: '📸', requirement: 100, category: 'photos' },
  { id: 'five-hundred-photos', key: 'FIVE_HUNDRED_PHOTOS', title: 'Photo Machine', description: 'Shared 500 photos together', emoji: '📷', requirement: 500, category: 'photos' },
  { id: 'thousand-photos', key: 'THOUSAND_PHOTOS', title: 'Memory Vault', description: 'Shared 1000 photos together', emoji: '🏛️', requirement: 1000, category: 'photos' },
  { id: 'fifty-vcs', key: 'FIFTY_VCS', title: '50 Voice Clips', description: 'Sent 50 voice/video clips', emoji: '🎙️', requirement: 50, category: 'vcs' },
  { id: 'hundred-vcs', key: 'HUNDRED_VCS', title: 'Voice Diary', description: 'Sent 100 voice/video clips', emoji: '🎤', requirement: 100, category: 'vcs' },
  { id: 'hundred-calls', key: 'HUNDRED_CALLS', title: '100 Calls', description: 'Made 100 calls together', emoji: '📞', requirement: 100, category: 'calls' },
  { id: 'ten-hours-calling', key: 'TEN_HOURS_CALLING', title: '10 Hours Talking', description: 'Spent 10 hours on calls', emoji: '⏱️', requirement: 36000, category: 'calls' },
  { id: 'thirty-days', key: 'THIRTY_DAYS', title: '30 Days Together', description: 'Completed 30 daily challenges', emoji: '❤️', requirement: 30, category: 'days' },
  { id: 'hundred-days', key: 'HUNDRED_DAYS', title: 'Century', description: 'Completed 100 daily challenges', emoji: '💯', requirement: 100, category: 'days' },
];

/* Couple Level System */

export interface CoupleLevel {
  level: number;
  title: string;
  minDays: number;
  maxDays: number;
  emoji: string;
}

export const COUPLE_LEVELS: CoupleLevel[] = [
  { level: 1, title: 'Getting Started', minDays: 0, maxDays: 7, emoji: '🌱' },
  { level: 2, title: 'Building Memories', minDays: 8, maxDays: 30, emoji: '🌿' },
  { level: 3, title: 'Daily Duo', minDays: 31, maxDays: 100, emoji: '🌳' },
  { level: 4, title: 'Unstoppable', minDays: 101, maxDays: 365, emoji: '🏔️' },
  { level: 5, title: 'Forever Archive', minDays: 366, maxDays: Infinity, emoji: '👑' },
];
