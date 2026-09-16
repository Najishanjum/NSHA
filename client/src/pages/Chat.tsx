import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image as ImageIcon, Smile, Reply, Trash2, X, Sparkles } from 'lucide-react';
import { cn, formatTime, generateId } from '@/lib/utils';
import { useCoupleStore } from '@/stores';
import { chatApi } from '@/services/api';
import type { Message } from '@/types';

export default function Chat() {
  const couple = useCoupleStore((s) => s.couple);
  const currentPartner = useCoupleStore((s) => s.currentPartner || s.partner);
  const myName = useCoupleStore((s) => s.getMyName());
  const partnerName = useCoupleStore((s) => s.getPartnerName());

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 3 seconds
    pollRef.current = setInterval(loadMessages, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [couple]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!couple) return;
    try {
      const res = await chatApi.getMessages(couple.id, undefined, 100);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!couple || !currentPartner || !newMessage.trim()) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const tempMsg: Message = {
      id: generateId(),
      coupleId: couple.id,
      partner: currentPartner,
      content,
      type: 'text',
      reactions: {},
      replyToId: replyTo?.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setReplyTo(null);

    try {
      await chatApi.send(couple.id, currentPartner, content, 'text', undefined, replyTo?.id);
      await loadMessages();
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!couple) return;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await chatApi.delete(id, couple.id);
    } catch {}
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isMyMessage = (msg: Message) => msg.partner === currentPartner;
  const getReplyMessage = (id?: string) => messages.find((m) => m.id === id);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-none lg:rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat header */}
      <div className="px-5 py-3.5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md shadow-rose-500/20">
              {partnerName ? partnerName.charAt(0).toUpperCase() : '❤️'}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm flex items-center gap-1.5">
              {partnerName}
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            </p>
            <p className="text-xs text-emerald-400 font-medium">Connected in couple space</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 no-scrollbar min-h-0">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 text-sm">Loading conversations...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 rounded-3xl bg-white/[0.02] border border-white/5 max-w-sm">
              <span className="text-5xl mb-3 block">💌</span>
              <h3 className="text-lg font-bold text-white mb-1">Start your private conversation</h3>
              <p className="text-xs text-slate-400">
                Send a sweet thought, inside joke, or check-in to {partnerName}!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const mine = isMyMessage(msg);
            const replyMsg = getReplyMessage(msg.replyToId);
            const showAvatar = i === 0 || messages[i - 1].partner !== msg.partner;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex items-end gap-2 group', mine ? 'justify-end' : 'justify-start')}
              >
                {!mine && showAvatar && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                )}
                {!mine && !showAvatar && <div className="w-7 shrink-0" />}

                <div className={cn('max-w-[78%] sm:max-w-[65%]', mine ? 'items-end' : 'items-start')}>
                  {replyMsg && (
                    <div
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-xl bg-slate-900/90 border-l-2 border-rose-500 mb-1 text-slate-400 max-w-full truncate',
                        mine ? 'ml-auto text-right' : ''
                      )}
                    >
                      <span className="italic">Replying to: {replyMsg.content.slice(0, 50)}</span>
                    </div>
                  )}

                  <div
                    className={cn(
                      'px-4 py-2.5 rounded-2xl relative shadow-md break-words text-sm',
                      mine
                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-br-sm shadow-rose-900/30'
                        : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-bl-sm'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70 text-[10px]">
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {mine && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-1"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-slate-900/90 border-t border-white/10 flex items-center justify-between"
          >
            <div className="text-xs">
              <span className="text-rose-400 font-medium">Replying to {replyTo.content.slice(0, 40)}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar - pinned cleanly at bottom */}
      <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-white/10 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-5xl mx-auto"
        >
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Message ${partnerName}...`}
            className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
          />

          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 shadow-lg shadow-rose-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
