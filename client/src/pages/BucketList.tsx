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
    <div className="py-6 lg:py-10 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="nsha-icon-box nsha-icon-box-lime">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="nsha-page-eyebrow">NSHA / BUCKET LIST</p>
            <h1 className="nsha-page-title">Couple Bucket List</h1>
            <p className="nsha-page-subtitle">Dream, plan, and check off adventures together</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="nsha-btn nsha-btn-primary nsha-btn-sm"
        >
          <Plus className="w-4 h-4" />
          Add Dream
        </button>
      </div>

      {/* Progress */}
      <div className="nsha-card p-5 flex items-center justify-between">
        <div>
          <span className="text-xs font-heading font-bold text-nsha-text-secondary uppercase tracking-wider">Adventures Accomplished</span>
          <p className="font-heading font-bold text-xl text-nsha-black mt-0.5">
            {completedCount} of {items.length} completed
          </p>
        </div>
        <div className="w-32 sm:w-48">
          <div className="nsha-progress">
            <div
              className="nsha-progress-fill bg-nsha-green"
              style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
              'px-4 py-2 rounded-xl text-xs font-heading font-bold whitespace-nowrap transition-all',
              selectedCategory === cat.id
                ? 'bg-nsha-lime text-nsha-black border-2 border-nsha-black shadow-[3px_3px_0_#090909]'
                : 'bg-nsha-surface text-nsha-text-secondary border-2 border-transparent hover:border-nsha-black/20'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="nsha-card p-6"
          >
            <h3 className="font-heading font-bold text-lg text-nsha-black mb-4">Add a New Shared Dream</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <input
                type="text"
                placeholder="e.g. Watch the northern lights together in Iceland"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="nsha-input"
                autoFocus
              />

              <div className="flex flex-wrap gap-2">
                {(['travel', 'experiences', 'food', 'goals'] as BucketListCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-heading font-bold capitalize border-2 transition-all',
                      newCategory === cat
                        ? 'bg-nsha-lime border-nsha-black text-nsha-black shadow-[2px_2px_0_#090909]'
                        : 'bg-nsha-surface border-nsha-black/20 text-nsha-text-secondary'
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
                  className="nsha-btn nsha-btn-secondary nsha-btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="nsha-btn nsha-btn-green nsha-btn-sm"
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
          <div className="nsha-card">
            <div className="nsha-empty">
              <span className="nsha-empty-icon">🧭</span>
              <p className="nsha-empty-title">Nothing here yet.</p>
              <p className="nsha-empty-text">No dreams added in this category yet.</p>
            </div>
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
                  'nsha-card-sm p-4 flex items-center justify-between gap-4 group',
                  item.isCompleted ? 'bg-[#E8FFE8]' : ''
                )}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="text-nsha-text-secondary hover:text-nsha-green transition-colors flex-shrink-0"
                  >
                    {item.isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-nsha-green" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-heading font-semibold transition-all truncate',
                        item.isCompleted ? 'line-through text-nsha-text-secondary' : 'text-nsha-black'
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="nsha-badge nsha-badge-outline text-[10px] capitalize">
                        <Icon className="w-2.5 h-2.5" />
                        {item.category}
                      </span>
                      <span className="text-[10px] text-nsha-text-secondary font-semibold">
                        Added by {addedByName || 'Partner'}
                      </span>
                      {item.isCompleted && item.completedAt && (
                        <span className="text-[10px] text-nsha-green font-semibold">
                          • Completed {formatDate(item.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-nsha-text-secondary hover:text-red-500 p-2 transition-opacity"
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
