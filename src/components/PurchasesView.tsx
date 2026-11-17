import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Clock, Plus, Search, Trash2, X } from 'lucide-react';
import { CurrencyCode, Product, Purchase, Supplier } from '../types';
import { apiRequest, formatDateTime, formatMoney } from '../lib/api';
import { appleAlertVariants } from '../lib/motion';
import { AppleModal, AppleSegmentedControl } from './AppleMotion';

interface PurchasesViewProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  products: Product[];
  currency: CurrencyCode;
  onRefresh: () => Promise<void>;
}

interface LineItemDraft {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

const inputCls =
  'w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85';

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  suppliers,
  products,
  currency,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState<'received' | 'pending'>('received');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((po) => {
      const matchesSearch =
        !q ||
        po.po_number.toLowerCase().includes(q) ||
        po.supplier_name.toLowerCase().includes(q) ||
        po.notes.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, search, statusFilter]);

  const openCreateModal = () => {
    setError(null);
    setSupplierId(suppliers[0] ? String(suppliers[0].id) : '');
    setStatus('received');
    setNotes('');
    const firstProd = products[0];
    setItems(
      firstProd
        ? [{ product_id: String(firstProd.id), quantity: 10, unit_cost: firstProd.cost_price }]
        : []
    );
    setShowCreateModal(true);
  };

  const addLineItem = () => {
    const prod = products[0];
    if (!prod) return;
    setItems((prev) => [...prev, { product_id: String(prod.id), quantity: 5, unit_cost: prod.cost_price }]);
  };

  const updateLineItem = (index: number, patch: Partial<LineItemDraft>) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const next = { ...item, ...patch };
        if (patch.product_id) {
          const matched = products.find((p) => String(p.id) === patch.product_id);
          if (matched) next.unit_cost = matched.cost_price;
        }
        return next;
      })
    );
  };

  const removeLineItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const draftTotal = items.reduce((acc, item) => acc + item.quantity * item.unit_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      setError('Select a supplier and add at least one product line item.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: Number(supplierId),
          status,
          notes,
          items: items.map((i) => ({
            product_id: Number(i.product_id),
            quantity: Number(i.quantity),
            unit_cost: Number(i.unit_cost),
          })),
        }),
      });
      setShowCreateModal(false);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReceived = async (poId: number) => {
    setError(null);
    try {
      await apiRequest(`/api/purchases/${poId}/receive`, { method: 'PATCH' });
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark order received.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[230px]">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO number or supplier..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3]"
            />
          </div>

          <AppleSegmentedControl
            layoutId="purchases-status-filter"
            value={statusFilter}
            onChange={setStatusFilter}
            buttonClassName="px-3 py-1.5 text-xs"
            options={[
              { id: 'all', label: 'All' },
              { id: 'received', label: 'Received' },
              { id: 'pending', label: 'Pending' },
            ]}
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="purchases-error"
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
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-[#5a5a60] dark:text-[#a1a1a6]">No purchase orders recorded yet.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium"
            >
              Create First Purchase Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                  <th className="py-3 px-4 font-medium">PO Number & Date</th>
                  <th className="py-3 px-4 font-medium">Supplier</th>
                  <th className="py-3 px-4 font-medium">Items Received</th>
                  <th className="py-3 px-4 font-medium text-right">Total Cost</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-medium text-[#1d1d1f] dark:text-white">{po.po_number}</div>
                      <div className="text-xs text-[#6e6e73] dark:text-[#8e8e93]">
                        {formatDateTime(po.purchase_date)} · {po.created_by_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{po.supplier_name}</div>
                      {po.notes && <div className="text-xs text-[#6e6e73] dark:text-[#8e8e93]">{po.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5a5a60] dark:text-[#a1a1a6] space-y-0.5">
                      {po.items.map((item, i) => (
                        <div key={i}>
                          <span className="font-mono font-medium">{item.quantity}x</span> {item.product_name}
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#1d1d1f] dark:text-white">
                      {formatMoney(po.total_amount, currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      {po.status === 'received' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#248a3d] dark:text-[#30d158] whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Received
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#c93400] dark:text-[#ff9f0a] whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {po.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReceived(po.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#248a3d] hover:bg-[#1f7a35] text-white text-xs font-medium whitespace-nowrap"
                        >
                          Receive Stock
                        </button>
                      ) : (
                        <span className="text-xs text-[#6e6e73]">Stocked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Purchase Order Modal */}
      <AppleModal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidthClass="max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
            New Stock-In Purchase Order
          </h3>
          <button type="button" onClick={() => setShowCreateModal(false)} className="text-[#86868b]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Supplier</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={inputCls}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                    Order Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'received' | 'pending')}
                    className={inputCls}
                  >
                    <option value="received">Received (Increment Stock & Log Expense)</option>
                    <option value="pending">Pending Transit (Await Delivery)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Line Items</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline"
                  >
                    + Add Product Line
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateLineItem(idx, { product_id: e.target.value })}
                        className="col-span-6 px-2.5 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                        placeholder="Qty"
                        className="col-span-2 px-2.5 py-2 text-xs font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost}
                        onChange={(e) => updateLineItem(idx, { unit_cost: Math.max(0, Number(e.target.value)) })}
                        placeholder="Cost"
                        className="col-span-3 px-2.5 py-2 text-xs font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        disabled={items.length === 1}
                        className="col-span-1 flex justify-center text-[#86868b] hover:text-[#d70015] disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional reference or delivery instruction"
                  className={inputCls}
                />
              </div>

              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Order Total:{' '}
                  <span className="font-mono font-semibold text-[#1d1d1f] dark:text-white">
                    {formatMoney(draftTotal, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-medium rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white"
                  >
                    {submitting ? 'Processing...' : 'Submit Purchase Order'}
                  </button>
                </div>
              </div>
            </form>
      </AppleModal>
    </div>
  );
};
