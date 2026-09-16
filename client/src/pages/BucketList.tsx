import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Plus,
  CheckCircle,
  Circle,
  Trash2,
  Plane,
  Utensils,
  Target,
  Sparkles,
  Heart,
  Tag,
} from 'lucide-react';
import { useCoupleStore } from '@/stores';
import { bucketListApi } from '@/services/api';
import type { BucketListItem, BucketListCategory } from '@/types';
import { cn, formatDate } from '@/lib/utils';

export default function BucketList() {
  const couple = useCoupleStore((s) => s.couple);
  const partner = useCoupleStore((s) => s.partner);

  const [items, setItems] = useState<BucketListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | BucketListCategory>('all');
  const [loading, setLoading] = useState(true);

  // New item modal/form
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<BucketListCategory>('experiences');

  useEffect(() => {
    loadItems();
  }, [couple]);

  const loadItems = async () => {
    if (!couple) return;
    setLoading(true);
    try {
      const res = await bucketListApi.getAll(couple.id);
      if (res.data) setItems(res.data);
    } catch (err) {
      console.error('Failed to load bucket list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couple || !partner || !newTitle.trim()) return;

    try {
      const res = await bucketListApi.create(couple.id, partner, newTitle.trim(), newCategory);
      if (res.data) {
        setItems((prev) => [res.data!, ...prev]);
        setNewTitle('');
        setIsAdding(false);
      }
    } catch (err) {
      console.error('Failed to add bucket item:', err);
    }
  };

  const handleToggle = async (id: string) => {
    if (!couple) return;
    try {
      const res = await bucketListApi.toggle(id, couple.id);
      if (res.data) {
        setItems((prev) => prev.map((item) => (item.id === id ? res.data! : item)));
      }
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!couple) return;
    try {
      await bucketListApi.delete(id, couple.id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const categoryIcons: Record<BucketListCategory, any> = {
    travel: Plane,
    experiences: Sparkles,
    food: Utensils,
    goals: Target,
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    return true;
  });

  const completedCount = items.filter((i) => i.isCompleted).length;

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Compass className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-400 bg-clip-text text-transparent">
              Couple Bucket List
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Dream, plan, and check off adventures you want to experience together
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Dream
        </button>
      </div>

      {/* Progress overview */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400">Adventures Accomplished</span>
          <p className="text-xl font-bold text-white mt-0.5">
            {completedCount} of {items.length} completed
          </p>
        </div>
        <div className="w-32 sm:w-48">
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full"
              style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { id: 'all', label: 'All Adventures' },
            { id: 'travel', label: 'Travel ✈️' },
            { id: 'experiences', label: 'Experiences ✨' },
            { id: 'food', label: 'Food & Dining 🍽️' },
            { id: 'goals', label: 'Life Goals 🎯' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
              selectedCategory === cat.id
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/10'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Add Dream Modal / Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-3xl bg-slate-950 border border-indigo-500/30 shadow-2xl backdrop-blur-xl"
          >
            <h3 className="text-lg font-bold text-white mb-4">Add a New Shared Dream</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="e.g. Watch the northern lights together in Iceland"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(['travel', 'experiences', 'food', 'goals'] as BucketListCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs capitalize border transition-all',
                      newCategory === cat
                        ? 'bg-indigo-500 text-white border-indigo-400'
                        : 'bg-slate-900 border-white/10 text-slate-400'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  Save Dream
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/5">
            <Compass className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-400">No dreams added in this category yet.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = categoryIcons[item.category] || Sparkles;
            const addedByName = item.addedBy === 1 ? couple?.partner1Name : couple?.partner2Name;

            return (
              <motion.div
                key={item.id}
                layout
                className={cn(
                  'p-4 rounded-2xl border transition-all backdrop-blur-xl flex items-center justify-between gap-4 group',
                  item.isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                  >
                    {item.isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium transition-all truncate',
                        item.isCompleted ? 'line-through text-slate-500' : 'text-white'
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-400 flex items-center gap-1 capitalize">
                        <Icon className="w-2.5 h-2.5" />
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Added by {addedByName || 'Partner'}
                      </span>
                      {item.isCompleted && item.completedAt && (
                        <span className="text-[10px] text-emerald-400/80">
                          • Completed {formatDate(item.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-2 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
