import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

import { coupleRouter } from './routes/couples.js';
import { challengeRouter } from './routes/challenges.js';
import { photoRouter } from './routes/photos.js';
import { voiceRouter } from './routes/voice.js';
import { chatRouter } from './routes/chat.js';
import { callRouter } from './routes/calls.js';
import { extrasRouter } from './routes/extras.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// API Routers
app.use('/api/couples', coupleRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/photos', photoRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/messages', chatRouter);
app.use('/api/calls', callRouter);
app.use('/api', extrasRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// WebSocket Server for Live Real-time Chat & WebRTC Call Signaling
const wss = new WebSocketServer({ server });
const clients = new Map<WebSocket, { coupleId?: string; partner?: number }>();

wss.on('connection', (ws) => {
  clients.set(ws, {});

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());

      if (data.type === 'join') {
        clients.set(ws, { coupleId: data.coupleId, partner: data.partner });
        return;
      }

      // Broadcast event to other member of the couple space
      const senderMeta = clients.get(ws);
      if (!senderMeta?.coupleId) return;

      for (const [clientWs, meta] of clients.entries()) {
        if (clientWs !== ws && meta.coupleId === senderMeta.coupleId && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify(data));
        }
      }
    } catch (e) {
      console.error('Error handling ws message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`CoupleSync Server running on http://localhost:${PORT}`);
});
