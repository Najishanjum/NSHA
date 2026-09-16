import { Router } from 'express';
import { db } from '../db.js';

export const challengeRouter = Router();

challengeRouter.get('/today', (req, res) => {
  const coupleId = req.query.coupleId as string;
  if (!coupleId) {
    return res.status(400).json({ success: false, error: 'coupleId required' });
  }

  const challenge = db.getOrCreateChallenge(coupleId);
  res.json({ success: true, data: challenge });
});

challengeRouter.get('/history', (req, res) => {
  const coupleId = req.query.coupleId as string;
  if (!coupleId) {
    return res.status(400).json({ success: false, error: 'coupleId required' });
  }

  const challenges = db.get('challenges')
    .filter((c) => c.coupleId === coupleId)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json({ success: true, data: challenges });
});

challengeRouter.get('/:date', (req, res) => {
  const { date } = req.params;
  const coupleId = req.query.coupleId as string;

  if (!coupleId) {
    return res.status(400).json({ success: false, error: 'coupleId required' });
  }

  const challenge = db.getOrCreateChallenge(coupleId, date);
  res.json({ success: true, data: challenge });
});
