import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import type { Message, PartnerNumber } from '../types.js';

export const chatRouter = Router();

chatRouter.get('/', (req, res) => {
  const coupleId = req.query.coupleId as string;
  const limit = Number(req.query.limit) || 50;

  if (!coupleId) {
    return res.status(400).json({ success: false, error: 'coupleId required' });
  }

  const messages = db.get('messages')
    .filter((m) => m.coupleId === coupleId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);

  res.json({ success: true, data: messages });
});

chatRouter.post('/', (req, res) => {
  const { coupleId, partner, content, type, mediaUrl, replyToId } = req.body;

  if (!coupleId || !partner || !content) {
    return res.status(400).json({ success: false, error: 'coupleId, partner, and content required' });
  }

  const message: Message = {
    id: `msg-${uuidv4()}`,
    coupleId,
    partner: Number(partner) as PartnerNumber,
    content,
    type: type || 'text',
    mediaUrl,
    replyToId,
    reactions: {},
    createdAt: new Date().toISOString(),
  };

  db.get('messages').push(message);
  db.save();

  res.json({ success: true, data: message });
});

chatRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const coupleId = req.query.coupleId as string;

  const messages = db.get('messages');
  const idx = messages.findIndex((m) => m.id === id && m.coupleId === coupleId);
  if (idx !== -1) {
    messages.splice(idx, 1);
    db.save();
  }

  res.json({ success: true });
});

chatRouter.post('/:id/react', (req, res) => {
  const { id } = req.params;
  const { coupleId, partner, emoji } = req.body;

  const msg = db.get('messages').find((m) => m.id === id && m.coupleId === coupleId);
  if (!msg) {
    return res.status(404).json({ success: false, error: 'Message not found' });
  }

  if (!msg.reactions[emoji]) {
    msg.reactions[emoji] = [];
  }

  const partnerNum = Number(partner) as PartnerNumber;
  const existsIdx = msg.reactions[emoji].indexOf(partnerNum);
  if (existsIdx > -1) {
    msg.reactions[emoji].splice(existsIdx, 1);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  } else {
    msg.reactions[emoji].push(partnerNum);
  }

  db.save();
  res.json({ success: true, data: msg });
});
