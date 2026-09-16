import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { VoiceClip, PartnerNumber } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export const voiceRouter = Router();

voiceRouter.post('/', upload.single('file'), (req, res) => {
  const { coupleId, partner, duration, type, isChallenge, fileData } = req.body;
  if (!req.file && !fileData) {
    return res.status(400).json({ success: false, error: 'Audio/Video file is required' });
  }

  const partnerNum = Number(partner) as PartnerNumber;
  const today = db.getTodayString();

  const clip: VoiceClip = {
    id: `vc-${uuidv4()}`,
    coupleId,
    partner: partnerNum,
    fileUrl: req.file ? `/uploads/${req.file.filename}` : fileData,
    duration: Number(duration) || 0,
    type: type === 'video' ? 'video' : 'voice',
    isChallenge: isChallenge === 'true' || isChallenge === true,
    date: today,
    createdAt: new Date().toISOString(),
  };

  db.get('voiceClips').push(clip);

  if (clip.isChallenge) {
    const challenge = db.getOrCreateChallenge(coupleId, today);
    if (partnerNum === 1) {
      challenge.partner1Vc = true;
    } else {
      challenge.partner2Vc = true;
    }
    db.updateChallengeStatus(coupleId, today);
  }

  db.save();
  res.json({ success: true, data: clip });
});

voiceRouter.get('/today', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const today = db.getTodayString();
  const clips = db.get('voiceClips').filter((v) => v.coupleId === coupleId && v.date === today);
  res.json({ success: true, data: clips });
});

voiceRouter.get('/', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const clips = db.get('voiceClips')
    .filter((v) => v.coupleId === coupleId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ success: true, data: clips });
});

voiceRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const coupleId = req.query.coupleId as string;

  const list = db.get('voiceClips');
  const idx = list.findIndex((v) => v.id === id && v.coupleId === coupleId);
  if (idx !== -1) {
    list.splice(idx, 1);
    db.save();
  }

  res.json({ success: true });
});
