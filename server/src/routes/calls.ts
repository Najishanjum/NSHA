import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { Call, PartnerNumber } from '../types.js';

export const callRouter = Router();

callRouter.post('/', (req, res) => {
  const { coupleId, caller } = req.body;

  const call: Call = {
    id: `call-${uuidv4()}`,
    coupleId,
    caller: Number(caller) as PartnerNumber,
    startedAt: new Date().toISOString(),
    duration: 0,
    status: 'connected',
  };

  db.get('calls').push(call);
  db.save();

  res.json({ success: true, data: call });
});

callRouter.patch('/:id', (req, res) => {
  const { id } = req.params;
  const call = db.get('calls').find((c) => c.id === id);

  if (!call) {
    return res.status(404).json({ success: false, error: 'Call not found' });
  }

  Object.assign(call, req.body);
  db.checkAchievements(call.coupleId);
  db.save();

  res.json({ success: true, data: call });
});

callRouter.get('/history', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const calls = db.get('calls')
    .filter((c) => c.coupleId === coupleId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  res.json({ success: true, data: calls });
});

callRouter.get('/stats', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const calls = db.get('calls').filter((c) => c.coupleId === coupleId);

  const todayStr = db.getTodayString();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayCalls = calls.filter((c) => c.startedAt.startsWith(todayStr));
  const weekCalls = calls.filter((c) => new Date(c.startedAt) >= weekAgo);

  const stats = {
    today: {
      count: todayCalls.length,
      duration: todayCalls.reduce((sum, c) => sum + (c.duration || 0), 0),
    },
    week: {
      count: weekCalls.length,
      duration: weekCalls.reduce((sum, c) => sum + (c.duration || 0), 0),
    },
    total: {
      count: calls.length,
      duration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
    },
  };

  res.json({ success: true, data: stats });
});
