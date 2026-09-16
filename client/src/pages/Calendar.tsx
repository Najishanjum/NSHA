import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Heart,
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
    <div className="space-y-5 max-w-5xl mx-auto w-full">
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CalendarIcon className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Consistency Calendar
            </h1>
            <p className="text-xs text-slate-400">
              Track your daily shared progress, streaks, and memories
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 backdrop-blur-xl">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-3 font-semibold text-white text-sm min-w-[130px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Month Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Completed</p>
            <p className="text-lg sm:text-xl font-bold text-white mt-0.5">{completedDaysCount} days</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Partial</p>
            <p className="text-lg sm:text-xl font-bold text-white mt-0.5">{partialDaysCount} days</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Rate</p>
            <p className="text-lg sm:text-xl font-bold text-rose-400 mt-0.5">{completionRate}%</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Full-view Calendar Container */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl">
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
            <div key={d} className="text-[11px] font-bold text-slate-400 tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Cells - Responsive height so all weeks fit cleanly */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty prefix cells for start of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[75px] md:min-h-[85px] rounded-2xl opacity-0 pointer-events-none" />
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectDay(dateStr)}
                className={cn(
                  'relative min-h-[60px] sm:min-h-[75px] md:min-h-[85px] rounded-2xl p-2 flex flex-col justify-between border transition-all text-left group',
                  isToday
                    ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/10 shadow-lg shadow-rose-500/10'
                    : 'border-white/5 bg-slate-950/60 hover:border-white/20',
                  isCompleted && 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400',
                  isPartial && 'bg-amber-950/20 border-amber-500/40 text-amber-400'
                )}
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-bold',
                      isToday
                        ? 'text-rose-400'
                        : isCompleted
                        ? 'text-emerald-400'
                        : isPartial
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    )}
                  >
                    {dayNum}
                  </span>

                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {isPartial && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                {/* Bottom streak indicator */}
                <div className="w-full flex items-center justify-center">
                  {calDay?.streakDay ? (
                    <span className="text-[10px] text-rose-400 font-mono flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 fill-rose-500" />
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
        <div className="flex flex-wrap items-center justify-center gap-4 mt-5 pt-4 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
            <span>Completed Challenge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500/20 border border-amber-500/40" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500/20 border border-rose-500" />
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{formatDate(selectedDay)}</h3>
                  <p className="text-xs text-slate-400">Challenge & Memory Details</p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingDayDetails ? (
                <div className="py-12 text-center text-slate-400 text-sm">Loading memories for this day...</div>
              ) : (
                <div className="space-y-4">
                  {/* Status Card */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Daily Challenge</span>
                      <p className="text-base font-bold capitalize mt-0.5 text-white">
                        {dayChallenge?.status || 'No entry logged'}
                      </p>
                    </div>
                    {dayChallenge?.status === 'completed' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                        Streak +1 🔥
                      </span>
                    )}
                  </div>

                  {/* Challenge Breakdown */}
                  {dayChallenge && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                        <p className="text-slate-400 font-medium">
                          {couple?.partner1Name || 'Partner 1'}
                        </p>
                        <p className="text-white">📸 {dayChallenge.partner1Photos}/5 Photos</p>
                        <p className="text-white">🎙️ {dayChallenge.partner1Vc ? 'Clip Sent' : 'No Clip'}</p>
                        <p className="text-white">💬 {dayChallenge.partner1Question ? 'Answered' : 'Not Answered'}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                        <p className="text-slate-400 font-medium">
                          {couple?.partner2Name || 'Partner 2'}
                        </p>
                        <p className="text-white">📸 {dayChallenge.partner2Photos}/5 Photos</p>
                        <p className="text-white">🎙️ {dayChallenge.partner2Vc ? 'Clip Sent' : 'No Clip'}</p>
                        <p className="text-white">💬 {dayChallenge.partner2Question ? 'Answered' : 'Not Answered'}</p>
                      </div>
                    </div>
                  )}

                  {/* Photos for this day */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-rose-400" />
                      Photos Exchanged ({dayPhotos.length})
                    </h4>
                    {dayPhotos.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No photos recorded on this date.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {dayPhotos.map((photo) => (
                          <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-slate-900">
                            <img src={photo.fileUrl} alt="Memory" className="w-full h-full object-contain" />
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
