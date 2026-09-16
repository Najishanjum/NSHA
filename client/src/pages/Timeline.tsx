import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Heart,
  Sparkles,
  Flame,
  Award,
  Camera,
  Phone,
  Calendar,
  Plus,
  Flag,
  CheckCircle,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { timelineApi } from '@/services/api';
import type { TimelineEvent } from '@/types';
import { cn, formatDate } from '@/lib/utils';

export default function Timeline() {
  const couple = useCoupleStore((s) => s.couple);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [couple]);

  const loadTimeline = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const res = await timelineApi.get(couple.id);
      if (res.data) {
        setEvents(res.data);
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 via-rose-400 to-pink-400 bg-clip-text text-transparent">
              Relationship Timeline
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              The beautiful journey and milestones you've built together
            </p>
          </div>
        </div>
      </div>

      {/* Relationship Start Hero Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-amber-500/10 border border-white/10 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/20">
            ❤️
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {couple?.coupleNickname || `${couple?.partner1Name} & ${couple?.partner2Name}`}
            </h3>
            <p className="text-xs text-slate-400">
              Together since {couple?.relationshipStartDate ? formatDate(couple.relationshipStartDate) : 'our first day'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-rose-500/20 space-y-8 my-8 ml-4 sm:ml-6">
        {events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Complete daily challenges and unlock achievements to fill your milestone timeline!
          </div>
        ) : (
          events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative group"
            >
              {/* Dot on the timeline line */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-4 w-7 h-7 rounded-full bg-slate-950 border-2 border-rose-400 flex items-center justify-center text-xs shadow-md shadow-rose-500/30 group-hover:scale-125 transition-transform">
                <span>{event.emoji || '✨'}</span>
              </div>

              {/* Event Content Card */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-500/30 backdrop-blur-xl transition-all shadow-lg hover:shadow-rose-500/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                    {formatDate(event.date)}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 capitalize">
                    {event.type.replace('-', ' ')}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white mb-1 group-hover:text-rose-300 transition-colors">
                  {event.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
