import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  Heart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { callApi } from '@/services/api';
import type { Call } from '@/types';
import { cn, formatCallDuration, formatDuration, formatRelativeDate } from '@/lib/utils';

export default function Calls() {
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.partner);

  const [callHistory, setCallHistory] = useState<Call[]>([]);
  const [stats, setStats] = useState({
    today: { count: 0, duration: 0 },
    week: { count: 0, duration: 0 },
    total: { count: 0, duration: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Active call state
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadCallData();
  }, [couple]);

  const loadCallData = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.all([
        callApi.getHistory(couple.id).catch(() => ({ data: [] })),
        callApi.getStats(couple.id).catch(() => ({
          data: {
            today: { count: 0, duration: 0 },
            week: { count: 0, duration: 0 },
            total: { count: 0, duration: 0 },
          },
        })),
      ]);

      if (historyRes.data) setCallHistory(historyRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    if (!couple || !partner) return;
    try {
      const res = await callApi.create(couple.id, partner);
      if (res.data) {
        setActiveCall(res.data);
        setCallDuration(0);

        // Start duration counter
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  const endCall = async () => {
    if (!activeCall) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await callApi.update(activeCall.id, {
        status: 'ended',
        duration: callDuration,
        endedAt: new Date().toISOString(),
      });
      setActiveCall(null);
      setCallDuration(0);
      loadCallData();
    } catch (err) {
      console.error('Failed to end call:', err);
      setActiveCall(null);
    }
  };

  const partnerName = partner === 1 ? couple?.partner2Name : couple?.partner1Name;
  const myName = partner === 1 ? couple?.partner1Name : couple?.partner2Name;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PhoneCall className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Voice Calls
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Unlimited crystal-clear voice conversations with {partnerName || 'your partner'}
            </p>
          </div>
        </div>

        {/* Start Call CTA */}
        {!activeCall && (
          <button
            onClick={startCall}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Phone className="w-5 h-5" />
            Call {partnerName || 'Partner'}
          </button>
        )}
      </div>

      {/* ACTIVE CALL MODAL / OVERLAY */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center"
          >
            {/* Animated aura rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.05, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-72 h-72 rounded-full bg-emerald-500/20 blur-xl"
              />
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="w-96 h-96 rounded-full bg-teal-500/10 blur-2xl"
              />
            </div>

            {/* Avatar with pulsing rings */}
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-3xl font-bold text-white">
                  {partnerName ? partnerName.charAt(0).toUpperCase() : '❤️'}
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 pointer-events-none"
              />
            </div>

            {/* Status & duration */}
            <h2 className="text-2xl font-bold text-white mb-1">{partnerName}</h2>
            <p className="text-emerald-400 font-mono text-lg font-medium tracking-wider mb-8">
              {formatCallDuration(callDuration)}
            </p>

            {/* Audio waveform */}
            <div className="flex items-center gap-1.5 h-10 mb-8 max-w-xs w-full">
              {[40, 60, 80, 50, 100, 75, 45, 90, 60, 80, 50, 70, 95, 40].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: isMuted ? '4px' : [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`],
                  }}
                  transition={{
                    duration: 0.8 + (i % 3) * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full"
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6 z-10">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg',
                  isMuted
                    ? 'bg-rose-500/20 border border-rose-500 text-rose-400'
                    : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white'
                )}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg',
                  !isSpeakerOn
                    ? 'bg-slate-800 border border-white/10 text-slate-400'
                    : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white'
                )}
                title="Speaker"
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Today's Talk Time</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatDuration(stats.today?.duration || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{stats.today?.count || 0} calls today</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">This Week</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatDuration(stats.week?.duration || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{stats.week?.count || 0} calls this week</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">All Time Together</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatDuration(stats.total?.duration || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{stats.total?.count || 0} total calls</p>
        </div>
      </div>

      {/* Call History */}
      <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" /> Call History
          </h2>
          <span className="text-xs text-slate-400">{callHistory.length} calls logged</span>
        </div>

        {callHistory.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 mx-auto flex items-center justify-center text-emerald-400 mb-3">
              <Phone className="w-6 h-6 opacity-60" />
            </div>
            <p className="text-sm text-slate-400">No calls yet. Tap "Call" above to start your first call!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {callHistory.map((call) => {
              const isOutgoing = call.caller === partner;
              const callerName = call.caller === 1 ? couple?.partner1Name : couple?.partner2Name;

              return (
                <div key={call.id} className="py-3.5 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-sm',
                        call.status === 'missed'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : isOutgoing
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      )}
                    >
                      {call.status === 'missed' ? (
                        <PhoneMissed className="w-4 h-4" />
                      ) : isOutgoing ? (
                        <PhoneOutgoing className="w-4 h-4" />
                      ) : (
                        <PhoneIncoming className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {isOutgoing ? `Called ${partnerName}` : `Call from ${callerName}`}
                      </p>
                      <p className="text-xs text-slate-400">{formatRelativeDate(call.startedAt)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-mono text-slate-300">
                      {call.status === 'missed' ? 'Missed' : formatDuration(call.duration || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
