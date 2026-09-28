import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Heart,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { timelineApi } from '@/services/api';
import type { TimelineEvent } from '@/types';
import { formatDate } from '@/lib/utils';

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
    <div className="py-6 lg:py-10 space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="nsha-page-header">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box" style={{ background: '#FFE28A' }}>
            <Clock className="w-5 h-5 text-nsha-black" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / TIMELINE</p>
            <h1 className="nsha-page-title">Your Story</h1>
          </div>
        </div>
        <p className="nsha-page-subtitle mt-2">The beautiful journey and milestones you've built together</p>
      </div>

      {/* Relationship Start Hero Card */}
      <div
        className="nsha-card p-6 md:p-8"
        style={{ background: '#FFD21C' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-nsha-pink border-3 border-nsha-black flex items-center justify-center text-2xl" style={{ borderWidth: '3px' }}>
            ❤️
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-nsha-black">
              {couple?.coupleNickname || `${couple?.partner1Name} & ${couple?.partner2Name}`}
            </h3>
            <p className="text-sm text-nsha-text-secondary font-semibold">
              Together since {couple?.relationshipStartDate ? formatDate(couple.relationshipStartDate) : 'our first day'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-8 sm:pl-10 ml-4 sm:ml-6 my-8" style={{ borderLeft: '3px solid #090909' }}>
        {events.length === 0 ? (
          <div className="nsha-empty ml-4">
            <span className="nsha-empty-icon">📖</span>
            <p className="nsha-empty-title">Nothing here yet.</p>
            <p className="nsha-empty-text">
              Complete daily challenges and unlock achievements to fill your milestone timeline!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="relative group"
              >
                {/* Dot on the timeline line */}
                <div
                  className="absolute -left-[35px] sm:-left-[43px] top-5 w-8 h-8 rounded-xl bg-nsha-yellow flex items-center justify-center text-sm"
                  style={{ border: '3px solid #090909' }}
                >
                  <span>{event.emoji || '✨'}</span>
                </div>

                {/* Event Content Card */}
                <div className="nsha-card-sm p-5 ml-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="nsha-badge text-[10px]">
                      {formatDate(event.date)}
                    </span>
                    <span className="nsha-badge nsha-badge-outline text-[10px] capitalize">
                      {event.type.replace('-', ' ')}
                    </span>
                  </div>

                  <h4 className="font-heading font-bold text-base text-nsha-black mb-1 group-hover:text-nsha-pink transition-colors">
                    {event.title}
                  </h4>
                  <p className="text-sm text-nsha-text-secondary leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
