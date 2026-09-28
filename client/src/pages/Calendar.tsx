import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  Camera,
  X,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { calendarApi, challengeApi, photoApi } from '@/services/api';
import type { CalendarDay, DailyChallenge, Photo } from '@/types';
import { cn, formatDate, getDateString } from '@/lib/utils';

export default function CalendarPage() {
  const couple = useCoupleStore((s) => s.couple);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Day Details Modal
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayChallenge, setDayChallenge] = useState<DailyChallenge | null>(null);
  const [dayPhotos, setDayPhotos] = useState<Photo[]>([]);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  useEffect(() => {
    loadMonth();
  }, [couple, year, month]);

  const loadMonth = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const res = await calendarApi.getMonth(couple.id, year, month + 1);
      if (res.data) {
        setCalendarDays(res.data);
      }
    } catch (err) {
      console.error('Failed to load calendar month:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = async (dateStr: string) => {
    if (!couple) return;
    setSelectedDay(dateStr);
    setLoadingDayDetails(true);
    try {
      const [challengeRes, photosRes] = await Promise.all([
        challengeApi.getByDate(couple.id, dateStr).catch(() => ({ data: null })),
        photoApi.getAll(couple.id, { date: dateStr }).catch(() => ({ data: [] })),
      ]);

      setDayChallenge(challengeRes.data || null);
      setDayPhotos(photosRes.data || []);
    } catch (err) {
      console.error('Failed to load day details:', err);
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getDateString();

  const daysMap = new Map<string, CalendarDay>();
  calendarDays.forEach((d) => daysMap.set(d.date, d));

  const completedDaysCount = calendarDays.filter((d) => d.status === 'completed').length;
  const partialDaysCount = calendarDays.filter((d) => d.status === 'partial').length;
  const completionRate = daysInMonth > 0 ? Math.round((completedDaysCount / daysInMonth) * 100) : 0;

  return (
    <div className="py-6 lg:py-10 space-y-8 max-w-5xl mx-auto w-full">
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-purple">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / CONSISTENCY</p>
            <h1 className="nsha-page-title">Consistency Calendar</h1>
            <p className="nsha-page-subtitle">
              Track your daily shared progress, streaks, and memories
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-nsha-surface border-3 border-nsha-black rounded-2xl p-1.5 shadow-nsha-sm">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-nsha-black hover:bg-nsha-yellow transition-all"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-3 font-heading font-bold text-nsha-black text-sm min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-nsha-black hover:bg-nsha-yellow transition-all"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Month Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nsha-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">Completed</p>
            <p className="text-2xl font-heading font-bold text-nsha-black mt-1">{completedDaysCount} days</p>
          </div>
          <div className="nsha-icon-box nsha-icon-box-green">
            <CheckCircle2 className="w-5 h-5 text-nsha-black" />
          </div>
        </div>

        <div className="nsha-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">Partial</p>
            <p className="text-2xl font-heading font-bold text-nsha-black mt-1">{partialDaysCount} days</p>
          </div>
          <div className="nsha-icon-box nsha-icon-box-lime">
            <AlertCircle className="w-5 h-5 text-nsha-black" />
          </div>
        </div>

        <div className="nsha-card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">Monthly Rate</p>
            <p className="text-2xl font-heading font-bold text-nsha-pink mt-1">{completionRate}%</p>
          </div>
          <div className="nsha-icon-box nsha-icon-box-pink">
            <Flame className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Full-view Calendar Container */}
      <div className="nsha-card p-5 sm:p-7">
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-3 text-center">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
            <div key={d} className="text-xs font-heading font-bold text-nsha-text-secondary tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty prefix cells for start of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[82px] rounded-xl opacity-0 pointer-events-none" />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const calDay = daysMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const isCompleted = calDay?.status === 'completed';
            const isPartial = calDay?.status === 'partial';

            return (
              <motion.button
                key={dateStr}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                onClick={() => handleSelectDay(dateStr)}
                className={cn(
                  'relative min-h-[64px] sm:min-h-[82px] rounded-xl p-2 sm:p-2.5 flex flex-col justify-between border-2 transition-all text-left group',
                  isToday
                    ? 'border-nsha-black bg-nsha-yellow shadow-nsha-sm'
                    : isCompleted
                    ? 'border-nsha-black bg-[#E6F9EC] hover:bg-[#D5F5DF]'
                    : isPartial
                    ? 'border-nsha-black bg-[#FFF7DA] hover:bg-[#FFEFC0]'
                    : 'border-nsha-black/20 bg-nsha-surface hover:border-nsha-black'
                )}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-heading font-bold',
                      isToday
                        ? 'text-nsha-black'
                        : isCompleted
                        ? 'text-emerald-800'
                        : isPartial
                        ? 'text-amber-800'
                        : 'text-nsha-black'
                    )}
                  >
                    {dayNum}
                  </span>

                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />}
                  {isPartial && <AlertCircle className="w-4 h-4 text-amber-600 stroke-[2.5]" />}
                </div>

                {/* Bottom streak indicator */}
                <div className="w-full flex items-center justify-center">
                  {calDay?.streakDay ? (
                    <span className="text-[10px] font-heading font-bold text-nsha-pink flex items-center gap-0.5 bg-white/80 px-1.5 py-0.5 rounded-md border border-nsha-black/30">
                      <Flame className="w-2.5 h-2.5 fill-nsha-pink" />
                      {calDay.streakDay}
                    </span>
                  ) : (
                    <div className="h-2" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-5 border-t-2 border-nsha-black/10 text-xs font-heading font-bold text-nsha-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#E6F9EC] border-2 border-nsha-black" />
            <span>Completed Challenge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#FFF7DA] border-2 border-nsha-black" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-nsha-yellow border-2 border-nsha-black" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details Modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDay(null)}
            className="fixed inset-0 z-50 bg-nsha-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-nsha-surface border-3 border-nsha-black rounded-[24px] max-w-lg w-full p-6 sm:p-8 shadow-nsha space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b-2 border-nsha-black pb-4">
                <div>
                  <h3 className="text-xl font-heading font-bold text-nsha-black">{formatDate(selectedDay)}</h3>
                  <p className="text-xs text-nsha-text-secondary mt-0.5">Challenge & Memory Details</p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-xl border-2 border-nsha-black hover:bg-nsha-yellow transition-all"
                >
                  <X className="w-5 h-5 text-nsha-black" />
                </button>
              </div>

              {loadingDayDetails ? (
                <div className="py-12 text-center text-nsha-text-secondary font-heading text-sm">
                  Loading memories for this day...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Card */}
                  <div className="p-4 rounded-xl bg-nsha-surface border-2 border-nsha-black flex items-center justify-between shadow-nsha-sm">
                    <div>
                      <span className="text-xs font-heading font-bold uppercase tracking-wider text-nsha-text-secondary">Daily Challenge</span>
                      <p className="text-base font-heading font-bold capitalize mt-0.5 text-nsha-black">
                        {dayChallenge?.status || 'No entry logged'}
                      </p>
                    </div>
                    {dayChallenge?.status === 'completed' && (
                      <span className="px-3 py-1 rounded-lg bg-nsha-green text-nsha-black border-2 border-nsha-black text-xs font-heading font-bold">
                        Streak +1 🔥
                      </span>
                    )}
                  </div>

                  {/* Challenge Breakdown */}
                  {dayChallenge && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-nsha-surface border-2 border-nsha-black space-y-1.5 shadow-nsha-sm">
                        <p className="font-heading font-bold text-nsha-black">
                          {couple?.partner1Name || 'Partner 1'}
                        </p>
                        <p className="text-nsha-text-secondary">📸 {dayChallenge.partner1Photos}/5 Photos</p>
                        <p className="text-nsha-text-secondary">🎙️ {dayChallenge.partner1Vc ? 'Clip Sent' : 'No Clip'}</p>
                        <p className="text-nsha-text-secondary">💬 {dayChallenge.partner1Question ? 'Answered' : 'Not Answered'}</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-nsha-surface border-2 border-nsha-black space-y-1.5 shadow-nsha-sm">
                        <p className="font-heading font-bold text-nsha-black">
                          {couple?.partner2Name || 'Partner 2'}
                        </p>
                        <p className="text-nsha-text-secondary">📸 {dayChallenge.partner2Photos}/5 Photos</p>
                        <p className="text-nsha-text-secondary">🎙️ {dayChallenge.partner2Vc ? 'Clip Sent' : 'No Clip'}</p>
                        <p className="text-nsha-text-secondary">💬 {dayChallenge.partner2Question ? 'Answered' : 'Not Answered'}</p>
                      </div>
                    </div>
                  )}

                  {/* Photos for this day */}
                  <div>
                    <h4 className="text-sm font-heading font-bold text-nsha-black mb-3 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-nsha-pink" />
                      Photos Exchanged ({dayPhotos.length})
                    </h4>
                    {dayPhotos.length === 0 ? (
                      <div className="p-4 rounded-xl border-2 border-dashed border-nsha-black/20 text-center">
                        <p className="text-xs text-nsha-text-secondary italic">No photos recorded on this date.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {dayPhotos.map((photo) => (
                          <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border-2 border-nsha-black shadow-nsha-sm bg-nsha-surface">
                            <img src={photo.fileUrl} alt="Memory" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
