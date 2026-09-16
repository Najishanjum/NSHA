import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { Photo, PartnerNumber } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

export const photoRouter = Router();

photoRouter.post('/', upload.single('file'), (req, res) => {
  const { coupleId, partner, caption, isChallenge, fileData } = req.body;
  if (!req.file && !fileData) {
    return res.status(400).json({ success: false, error: 'File is required' });
  }

  const partnerNum = Number(partner) as PartnerNumber;
  const today = db.getTodayString();

  const photo: Photo = {
    id: `photo-${uuidv4()}`,
    coupleId,
    partner: partnerNum,
    fileUrl: req.file ? `/uploads/${req.file.filename}` : fileData,
    caption: caption || '',
    isFavorite: false,
    isChallenge: isChallenge === 'true' || isChallenge === true,
    date: today,
    createdAt: new Date().toISOString(),
  };

  db.get('photos').push(photo);

  // Update daily challenge if challenge photo
  if (photo.isChallenge) {
    const challenge = db.getOrCreateChallenge(coupleId, today);
    if (partnerNum === 1) {
      challenge.partner1Photos = Math.min(5, (challenge.partner1Photos || 0) + 1);
    } else {
      challenge.partner2Photos = Math.min(5, (challenge.partner2Photos || 0) + 1);
    }
    db.updateChallengeStatus(coupleId, today);
  }

  db.save();
  res.json({ success: true, data: photo });
});

photoRouter.get('/today', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const today = db.getTodayString();
  const photos = db.get('photos').filter((p) => p.coupleId === coupleId && p.date === today);
  res.json({ success: true, data: photos });
});

photoRouter.get('/', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const { date, partner, filter } = req.query;

  let photos = db.get('photos').filter((p) => p.coupleId === coupleId);

  if (date) {
    photos = photos.filter((p) => p.date === date);
  }
  if (partner && partner !== 'all') {
    photos = photos.filter((p) => p.partner === Number(partner));
  }
  if (filter === 'favorites') {
    photos = photos.filter((p) => p.isFavorite);
  }

  photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ success: true, data: photos });
});

photoRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const coupleId = req.query.coupleId as string;

  const list = db.get('photos');
  const index = list.findIndex((p) => p.id === id && p.coupleId === coupleId);
  if (index !== -1) {
    list.splice(index, 1);
    db.save();
  }

  res.json({ success: true });
});

photoRouter.patch('/:id/favorite', (req, res) => {
  const { id } = req.params;
  const { coupleId } = req.body;

  const photo = db.get('photos').find((p) => p.id === id && p.coupleId === coupleId);
  if (!photo) {
    return res.status(404).json({ success: false, error: 'Photo not found' });
  }

  photo.isFavorite = !photo.isFavorite;
  db.save();

  res.json({ success: true, data: photo });
});
