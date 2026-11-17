import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Edit3, Mail, MapPin, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import { CurrencyCode, Supplier } from '../types';
import { apiRequest, formatMoney } from '../lib/api';
import { appleAlertVariants } from '../lib/motion';
import { AppleModal } from './AppleMotion';

interface SuppliersViewProps {
  suppliers: Supplier[];
  currency: CurrencyCode;
  onRefresh: () => Promise<void>;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ suppliers, currency, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contact_person.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setError(null);
    setForm({
      name: s.name,
      contact_person: s.contact_person,
      phone: s.phone,
      email: s.email,
      address: s.address,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await apiRequest(`/api/suppliers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/suppliers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: Supplier) => {
    setError(null);
    try {
      await apiRequest(`/api/suppliers/${s.id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cannot delete supplier.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers, contact person, or city..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] dark:focus:border-[#0a84ff]"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="suppliers-error"
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

      {filtered.length === 0 ? (
        <div className="glass-surface rounded-2xl p-12 text-center space-y-3">
          <p className="text-sm text-[#5a5a60] dark:text-[#a1a1a6]">No suppliers found.</p>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium transition-colors"
          >
            Add First Supplier
          </button>
        </div>
      ) : (
        <div className="glass-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                  <th className="py-3 px-4 font-medium">Supplier & Contact</th>
                  <th className="py-3 px-4 font-medium">Communication</th>
                  <th className="py-3 px-4 font-medium">Address</th>
                  <th className="py-3 px-4 font-medium text-right">SKUs</th>
                  <th className="py-3 px-4 font-medium text-right">Orders</th>
                  <th className="py-3 px-4 font-medium text-right">Total Volume</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#1d1d1f] dark:text-white">{s.name}</div>
                      <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{s.contact_person}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#86868b]" />
                        <span className="font-mono text-[#1d1d1f] dark:text-[#f5f5f7]">{s.phone}</span>
                      </div>
                      {s.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#86868b]" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                      <div className="flex items-start gap-1.5 max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-[#86868b] shrink-0 mt-0.5" />
                        <span>{s.address || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {s.product_count ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {s.order_count ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
                      {formatMoney(s.total_supplied_value ?? 0, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          title="Edit Supplier"
                          className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          title="Delete Supplier"
                          className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#d70015] dark:hover:text-[#ff453a] hover:bg-[#ff3b30]/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AppleModal open={showModal} onClose={() => setShowModal(false)} maxWidthClass="max-w-md">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
            {editing ? 'Edit Supplier' : 'Add New Supplier'}
          </h3>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    required
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Phone</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
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
                  {submitting ? 'Saving...' : editing ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
      </AppleModal>
    </div>
  );
};
