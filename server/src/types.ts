export type PartnerNumber = 1 | 2;

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

export type ChallengeStatus = 'pending' | 'partial' | 'completed';

export interface DailyChallenge {
  id: string;
  coupleId: string;
  date: string; // YYYY-MM-DD
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

export interface VoiceClip {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  fileUrl: string;
  duration: number;
  type: 'voice' | 'video';
  isChallenge: boolean;
  date: string;
  createdAt: string;
}

export interface Message {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  content: string;
  type: 'text' | 'image' | 'voice' | 'video';
  mediaUrl?: string;
  replyToId?: string;
  reactions: Record<string, PartnerNumber[]>;
  createdAt: string;
}

export interface Call {
  id: string;
  coupleId: string;
  caller: PartnerNumber;
  startedAt: string;
  endedAt?: string;
  duration: number;
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'missed';
}

export interface MoodEntry {
  id: string;
  coupleId: string;
  partner: PartnerNumber;
  mood: string;
  note?: string;
  date: string;
  createdAt: string;
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

export interface BucketListItem {
  id: string;
  coupleId: string;
  title: string;
  category: 'travel' | 'experiences' | 'food' | 'goals';
  isCompleted: boolean;
  addedBy: PartnerNumber;
  completedAt?: string;
  createdAt: string;
}

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

export interface ImportantDate {
  id: string;
  coupleId: string;
  title: string;
  date: string;
  type: string;
  addedBy: PartnerNumber;
  createdAt: string;
}
