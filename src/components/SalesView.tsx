import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, Plus, Printer, Search, Trash2, X } from 'lucide-react';
import { CurrencyCode, Product, Sale } from '../types';
import { apiRequest, formatDateTime, formatMoney } from '../lib/api';
import { appleAlertVariants } from '../lib/motion';
import { AppleModal } from './AppleMotion';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  currency: CurrencyCode;
  onRefresh: () => Promise<void>;
}

interface SaleDraftItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

const inputCls =
  'w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85';

export const SalesView: React.FC<SalesViewProps> = ({ sales, products, currency, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [items, setItems] = useState<SaleDraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inStockProducts = useMemo(() => products.filter((p) => p.stock_qty > 0), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter(
      (s) =>
        !q ||
        s.invoice_number.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.payment_method.toLowerCase().includes(q)
    );
  }, [sales, search]);

  const openCreateModal = () => {
    setError(null);
    setCustomerName('');
    setCustomerPhone('');
    setDiscount('0');
    setPaymentMethod('bKash');
    const first = inStockProducts[0];
    setItems(first ? [{ product_id: String(first.id), quantity: 1, unit_price: first.selling_price }] : []);
    setShowCreateModal(true);
  };

  const addLineItem = () => {
    const first = inStockProducts[0];
    if (!first) return;
    setItems((prev) => [...prev, { product_id: String(first.id), quantity: 1, unit_price: first.selling_price }]);
  };

  const updateLineItem = (idx: number, patch: Partial<SaleDraftItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const next = { ...item, ...patch };
        if (patch.product_id) {
          const matched = products.find((p) => String(p.id) === patch.product_id);
          if (matched) next.unit_price = matched.selling_price;
        }
        return next;
      })
    );
  };

  const removeLineItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const draftSubtotal = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const draftTotal = Math.max(0, draftSubtotal - (Number(discount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) {
      setError('Customer name and at least one product are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiRequest<Sale>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          discount: Number(discount) || 0,
          payment_method: paymentMethod,
          items: items.map((i) => ({
            product_id: Number(i.product_id),
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
          })),
        }),
      });
      setShowCreateModal(false);
      setActiveInvoice(created);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create sales invoice.');
    } finally {
      setSubmitting(false);
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
            placeholder="Search invoice #, customer, or payment method..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3]"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sales Invoice</span>
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="sales-error"
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
            <p className="text-sm text-[#5a5a60] dark:text-[#a1a1a6]">No sales invoices found.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium"
            >
              Issue First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                  <th className="py-3 px-4 font-medium">Invoice # & Date</th>
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Items Sold</th>
                  <th className="py-3 px-4 font-medium">Payment</th>
                  <th className="py-3 px-4 font-medium text-right">Total</th>
                  <th className="py-3 px-4 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-medium text-[#1d1d1f] dark:text-white">{s.invoice_number}</div>
                      <div className="text-xs text-[#6e6e73] dark:text-[#8e8e93]">
                        {formatDateTime(s.sale_date)} · {s.cashier_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">{s.customer_name}</div>
                      {s.customer_phone && (
                        <div className="text-xs font-mono text-[#6e6e73] dark:text-[#8e8e93]">{s.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5a5a60] dark:text-[#a1a1a6] space-y-0.5">
                      {s.items.map((item, i) => (
                        <div key={i}>
                          <span className="font-mono font-medium">{item.quantity}x</span> {item.product_name}
                        </div>
                      ))}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5a5a60] dark:text-[#a1a1a6]">{s.payment_method}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#248a3d] dark:text-[#30d158]">
                      {formatMoney(s.total_amount, currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveInvoice(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-white hover:bg-white/75 dark:hover:bg-white/[0.12] transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Sales Invoice Modal */}
      <AppleModal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidthClass="max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
            New Stock-Out Sales Invoice
          </h3>
          <button type="button" onClick={() => setShowCreateModal(false)} className="text-[#86868b]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                    Customer / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Summit Retail Co."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+880 17..."
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Invoice Line Items</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline"
                  >
                    + Add Product
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const matched = products.find((p) => String(p.id) === item.product_id);
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateLineItem(idx, { product_id: e.target.value })}
                          className="col-span-6 px-2.5 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
                        >
                          {inStockProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Avail: {p.stock_qty})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          max={matched?.stock_qty ?? 9999}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                          className="col-span-2 px-2.5 py-2 text-xs font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
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
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                    Discount (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={inputCls}
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <div className="text-sm text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Net Payable:{' '}
                  <span className="font-mono font-semibold text-[#248a3d] dark:text-[#30d158]">
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
                    disabled={submitting || inStockProducts.length === 0}
                    className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white disabled:opacity-60"
                  >
                    {submitting ? 'Processing...' : 'Complete Sale & Deduct Stock'}
                  </button>
                </div>
              </div>
            </form>
      </AppleModal>

      {/* Printable Invoice Receipt Modal */}
      <AppleModal open={Boolean(activeInvoice)} onClose={() => setActiveInvoice(null)} maxWidthClass="max-w-lg">
        {activeInvoice && (
          <>
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between no-print">
              <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                Sales Invoice · {activeInvoice.invoice_number}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0071e3] text-white text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button type="button" onClick={() => setActiveInvoice(null)} className="text-[#86868b]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold text-lg text-[#1d1d1f] dark:text-white">StockPilot</div>
                  <div className="text-xs text-[#6e6e73]">Inventory Management System</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-[#1d1d1f] dark:text-white">
                    {activeInvoice.invoice_number}
                  </div>
                  <div className="text-xs text-[#6e6e73]">{formatDateTime(activeInvoice.sale_date)}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl glass-inset flex justify-between text-xs">
                <div>
                  <div className="text-[#6e6e73]">Billed To</div>
                  <div className="font-medium text-[#1d1d1f] dark:text-white mt-0.5">{activeInvoice.customer_name}</div>
                  {activeInvoice.customer_phone && (
                    <div className="font-mono text-[#6e6e73]">{activeInvoice.customer_phone}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[#6e6e73]">Payment Method</div>
                  <div className="font-medium text-[#1d1d1f] dark:text-white mt-0.5">{activeInvoice.payment_method}</div>
                  <div className="text-[#6e6e73]">Issued by {activeInvoice.cashier_name}</div>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[#6e6e73]">
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 font-medium text-right">Qty</th>
                    <th className="py-2 font-medium text-right">Price</th>
                    <th className="py-2 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {activeInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-[#1d1d1f] dark:text-white">{item.product_name}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{item.quantity}</td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {formatMoney(item.unit_price, currency)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums font-medium">
                        {formatMoney(item.subtotal, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] space-y-1 text-xs">
                <div className="flex justify-between text-[#6e6e73]">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatMoney(activeInvoice.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-[#6e6e73]">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{formatMoney(activeInvoice.discount, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#1d1d1f] dark:text-white pt-1">
                  <span>Total Paid</span>
                  <span className="font-mono tabular-nums">{formatMoney(activeInvoice.total_amount, currency)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </AppleModal>
    </div>
  );
};
