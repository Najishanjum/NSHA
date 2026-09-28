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

  return (
    <div className="py-6 lg:py-10 space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-green">
            <PhoneCall className="w-5 h-5 text-nsha-black" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / AUDIO CALLS</p>
            <h1 className="nsha-page-title">Voice Calls</h1>
            <p className="nsha-page-subtitle">
              Unlimited direct conversations with {partnerName || 'your partner'}
            </p>
          </div>
        </div>

        {/* Start Call CTA */}
        {!activeCall && (
          <button
            onClick={startCall}
            className="nsha-btn nsha-btn-primary"
          >
            <Phone className="w-4 h-4" />
            Call {partnerName || 'Partner'}
          </button>
        )}
      </div>

      {/* ACTIVE CALL CARD */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="nsha-card p-8 bg-[#EBF9F1] border-3 border-nsha-black flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            {/* Avatar */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-nsha-green border-3 border-nsha-black shadow-nsha flex items-center justify-center text-3xl font-heading font-bold text-nsha-black">
                {partnerName ? partnerName.charAt(0).toUpperCase() : '❤️'}
              </div>
            </div>

            {/* Status & duration */}
            <h2 className="text-2xl font-heading font-bold text-nsha-black mb-1">{partnerName}</h2>
            <p className="text-nsha-black font-mono text-xl font-bold tracking-wider mb-6 bg-white px-4 py-1 rounded-xl border-2 border-nsha-black shadow-sm">
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
                  className="flex-1 bg-nsha-black rounded-full"
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-6 z-10">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'w-14 h-14 rounded-2xl border-3 border-nsha-black flex items-center justify-center transition-all shadow-nsha-sm',
                  isMuted
                    ? 'bg-nsha-pink text-white'
                    : 'bg-nsha-surface text-nsha-black hover:bg-nsha-yellow'
                )}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={endCall}
                className="w-16 h-16 rounded-2xl bg-nsha-pink border-3 border-nsha-black text-white flex items-center justify-center shadow-nsha hover:translate-y-0.5 active:shadow-none transition-all"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  'w-14 h-14 rounded-2xl border-3 border-nsha-black flex items-center justify-center transition-all shadow-nsha-sm',
                  !isSpeakerOn
                    ? 'bg-[#E8E4DA] text-nsha-text-secondary'
                    : 'bg-nsha-surface text-nsha-black hover:bg-nsha-yellow'
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="nsha-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">Today's Talk Time</span>
            <div className="nsha-icon-box nsha-icon-box-green nsha-icon-box-sm">
              <Clock className="w-4 h-4 text-nsha-black" />
            </div>
          </div>
          <p className="text-2xl font-heading font-bold text-nsha-black">
            {formatDuration(stats.today?.duration || 0)}
          </p>
          <p className="text-xs text-nsha-text-secondary mt-1">{stats.today?.count || 0} calls today</p>
        </div>

        <div className="nsha-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">This Week</span>
            <div className="nsha-icon-box nsha-icon-box-lime nsha-icon-box-sm">
              <TrendingUp className="w-4 h-4 text-nsha-black" />
            </div>
          </div>
          <p className="text-2xl font-heading font-bold text-nsha-black">
            {formatDuration(stats.week?.duration || 0)}
          </p>
          <p className="text-xs text-nsha-text-secondary mt-1">{stats.week?.count || 0} calls this week</p>
        </div>

        <div className="nsha-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">All Time Together</span>
            <div className="nsha-icon-box nsha-icon-box-pink nsha-icon-box-sm">
              <Heart className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-heading font-bold text-nsha-pink">
            {formatDuration(stats.total?.duration || 0)}
          </p>
          <p className="text-xs text-nsha-text-secondary mt-1">{stats.total?.count || 0} total calls</p>
        </div>
      </div>

      {/* Call History */}
      <div className="nsha-card p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5 border-b-2 border-nsha-black/10 pb-4">
          <h2 className="text-lg font-heading font-bold text-nsha-black flex items-center gap-2">
            <Clock className="w-5 h-5 text-nsha-text-secondary" /> Call History
          </h2>
          <span className="text-xs font-heading font-bold text-nsha-text-secondary bg-nsha-surface px-2.5 py-1 rounded-lg border border-nsha-black/20">
            {callHistory.length} calls logged
          </span>
        </div>

        {callHistory.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-nsha-yellow border-2 border-nsha-black shadow-nsha-sm mx-auto flex items-center justify-center text-nsha-black mb-3">
              <Phone className="w-6 h-6" />
            </div>
            <p className="text-sm font-heading font-bold text-nsha-black">No calls yet</p>
            <p className="text-xs text-nsha-text-secondary mt-0.5">Tap "Call" above to start your first call together!</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-nsha-black/10">
            {callHistory.map((call) => {
              const isOutgoing = call.caller === partner;
              const callerName = call.caller === 1 ? couple?.partner1Name : couple?.partner2Name;

              return (
                <div key={call.id} className="py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl border-2 border-nsha-black flex items-center justify-center text-sm shadow-sm',
                        call.status === 'missed'
                          ? 'bg-nsha-pink text-white'
                          : isOutgoing
                          ? 'bg-nsha-green text-nsha-black'
                          : 'bg-nsha-yellow text-nsha-black'
                      )}
                    >
                      {call.status === 'missed' ? (
                        <PhoneMissed className="w-5 h-5 stroke-[2.5]" />
                      ) : isOutgoing ? (
                        <PhoneOutgoing className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <PhoneIncoming className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-heading font-bold text-nsha-black">
                        {isOutgoing ? `Called ${partnerName}` : `Call from ${callerName}`}
                      </p>
                      <p className="text-xs text-nsha-text-secondary">{formatRelativeDate(call.startedAt)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-nsha-black bg-white px-2.5 py-1 rounded-md border border-nsha-black/30">
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
