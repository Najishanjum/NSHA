import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { Couple } from '../types.js';

export const coupleRouter = Router();

function generateCoupleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'COUPLE-';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

coupleRouter.post('/', (req, res) => {
  const { partner1Name, partner2Name, coupleNickname, relationshipStartDate } = req.body;

  if (!partner1Name || !partner2Name) {
    return res.status(400).json({ success: false, error: 'Both partner names are required' });
  }

  const couple: Couple = {
    id: `cpl-${uuidv4()}`,
    code: generateCoupleCode(),
    partner1Name,
    partner2Name,
    coupleNickname: coupleNickname || `${partner1Name} & ${partner2Name}`,
    relationshipStartDate: relationshipStartDate || new Date().toISOString().split('T')[0],
    timezone: 'UTC',
    streakFreezesRemaining: 2,
    createdAt: new Date().toISOString(),
  };

  db.get('couples').push(couple);
  db.getOrCreateChallenge(couple.id);
  db.save();

  res.json({ success: true, data: couple });
});

coupleRouter.get('/:code', (req, res) => {
  const { code } = req.params;
  const couple = db.get('couples').find((c) => c.code.toUpperCase() === code.toUpperCase());

  if (!couple) {
    return res.status(404).json({ success: false, error: 'Couple space not found. Please check code.' });
  }

  res.json({ success: true, data: couple });
});

coupleRouter.post('/:code/join', (req, res) => {
  const { code } = req.params;
  const { partner } = req.body;
  const couple = db.get('couples').find((c) => c.code.toUpperCase() === code.toUpperCase());

  if (!couple) {
    return res.status(404).json({ success: false, error: 'Couple space not found' });
  }

  db.getOrCreateChallenge(couple.id);
  res.json({ success: true, data: couple });
});

coupleRouter.patch('/:code', (req, res) => {
  const { code } = req.params;
  const couple = db.get('couples').find((c) => c.code.toUpperCase() === code.toUpperCase());

  if (!couple) {
    return res.status(404).json({ success: false, error: 'Couple not found' });
  }

  Object.assign(couple, req.body);
  db.save();

  res.json({ success: true, data: couple });
});
