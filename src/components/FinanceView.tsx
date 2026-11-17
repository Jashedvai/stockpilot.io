import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, Download, Plus, Search, Trash2, X } from 'lucide-react';
import { CurrencyCode, FinancialRecord } from '../types';
import { apiRequest, downloadCsv, formatDateTime, formatMoney } from '../lib/api';
import { APPLE_EASE, appleAlertVariants, appleStaggerContainer, appleStaggerItem } from '../lib/motion';
import { AppleModal, AppleSegmentedControl } from './AppleMotion';

interface FinanceViewProps {
  records: FinancialRecord[];
  currency: CurrencyCode;
  onRefresh: () => Promise<void>;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ records, currency, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Income' | 'Expense'>('all');
  const [showModal, setShowModal] = useState(false);

  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [category, setCategory] = useState('Operating Expense');
  const [referenceCode, setReferenceCode] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        !q ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.reference_code.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [records, search, typeFilter]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of records) {
      if (r.type === 'Income') income += r.amount;
      else expense += r.amount;
    }
    return { income, expense, net: income - expense };
  }, [records]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/api/finances', {
        method: 'POST',
        body: JSON.stringify({
          type,
          category,
          reference_code: referenceCode,
          description,
          amount: Number(amount),
        }),
      });
      setShowModal(false);
      setDescription('');
      setAmount('');
      setReferenceCode('');
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log financial entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/api/finances/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry.');
    }
  };

  const handleExport = () => {
    downloadCsv(
      'stockpilot-financial-ledger.csv',
      ['Date', 'Type', 'Category', 'Reference', 'Description', 'Amount'],
      filtered.map((r) => [r.record_date, r.type, r.category, r.reference_code, r.description, r.amount])
    );
  };

  return (
    <div className="space-y-5">
      {/* 3-Column Financial Summary Strip */}
      <motion.div variants={appleStaggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6]">Total Recorded Income</div>
          <div className="mt-1.5 text-2xl font-display font-semibold tracking-tight font-mono tabular-nums text-[#248a3d] dark:text-[#30d158]">
            {formatMoney(totals.income, currency)}
          </div>
        </motion.div>
        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6]">Total Recorded Expenses</div>
          <div className="mt-1.5 text-2xl font-display font-semibold tracking-tight font-mono tabular-nums text-[#d70015] dark:text-[#ff453a]">
            {formatMoney(totals.expense, currency)}
          </div>
        </motion.div>
        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6]">Net Ledger Balance</div>
          <div
            className={`mt-1.5 text-2xl font-display font-semibold tracking-tight font-mono tabular-nums ${
              totals.net >= 0 ? 'text-[#1d1d1f] dark:text-white' : 'text-[#d70015] dark:text-[#ff453a]'
            }`}
          >
            {totals.net >= 0 ? '+' : ''}
            {formatMoney(totals.net, currency)}
          </div>
        </motion.div>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[230px]">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, category, description..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] dark:focus:border-[#0a84ff]"
            />
          </div>

          <AppleSegmentedControl
            layoutId="finance-type-filter"
            value={typeFilter}
            onChange={setTypeFilter}
            buttonClassName="px-3 py-1.5 text-xs"
            options={[
              { id: 'all', label: 'All Entries' },
              { id: 'Income', label: 'Income' },
              { id: 'Expense', label: 'Expense' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="finance-error"
            variants={appleAlertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-3.5 rounded-xl bg-[#ff3b30]/12 backdrop-blur-md border border-[#ff3b30]/25 text-xs text-[#d70015] dark:text-[#ff453a] flex items-center justify-between"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Category & Reference</th>
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {filtered.map((rec) => {
                const isInc = rec.type === 'Income';
                return (
                  <tr key={rec.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6] whitespace-nowrap">
                      {formatDateTime(rec.record_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          isInc ? 'text-[#248a3d] dark:text-[#30d158]' : 'text-[#d70015] dark:text-[#ff453a]'
                        }`}
                      >
                        {isInc ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {rec.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#1d1d1f] dark:text-white font-medium text-xs">{rec.category}</div>
                      <div className="text-xs font-mono text-[#86868b] dark:text-[#8e8e93]">
                        {rec.reference_code || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{rec.description}</td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                        isInc ? 'text-[#248a3d] dark:text-[#30d158]' : 'text-[#d70015] dark:text-[#ff453a]'
                      }`}
                    >
                      {isInc ? '+' : '-'}
                      {formatMoney(rec.amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        title="Delete record"
                        className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#d70015] dark:hover:text-[#ff453a] hover:bg-[#ff3b30]/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AppleModal open={showModal} onClose={() => setShowModal(false)} maxWidthClass="max-w-md">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
            Log Financial Entry
          </h3>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'Income' | 'Expense')}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Amount (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Category</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Salaries, Utilities"
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Reference Code
                  </label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="EXP-2026-12"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Monthly payroll or warehouse utility payment"
                  className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
      </AppleModal>
    </div>
  );
};
