import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Category, CurrencyCode, Product, StockMovement, Supplier } from '../types';
import { apiRequest, downloadCsv, formatDateTime, formatMoney } from '../lib/api';
import { appleAlertVariants } from '../lib/motion';
import { AppleModal, AppleSegmentedControl, AppleViewTransition } from './AppleMotion';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  movements: StockMovement[];
  currency: CurrencyCode;
  onRefresh: () => Promise<void>;
}

interface ProductFormState {
  sku: string;
  name: string;
  category_id: string;
  supplier_id: string;
  cost_price: string;
  selling_price: string;
  stock_qty: string;
  reorder_level: string;
  unit: string;
  warehouse_location: string;
}

const inputCls =
  'w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85';

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  suppliers,
  movements,
  currency,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'movements'>('catalog');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>({
    sku: '',
    name: '',
    category_id: '',
    supplier_id: '',
    cost_price: '',
    selling_price: '',
    stock_qty: '0',
    reorder_level: '10',
    unit: 'pcs',
    warehouse_location: 'Rack A-01',
  });

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('1');
  const [adjustNote, setAdjustNote] = useState('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplier_name.toLowerCase().includes(q) ||
        p.warehouse_location.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'all' || String(p.category_id) === categoryFilter;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && p.stock_qty === 0) ||
        (stockFilter === 'low' && p.stock_qty > 0 && p.stock_qty <= p.reorder_level) ||
        (stockFilter === 'in_stock' && p.stock_qty > p.reorder_level);
      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setError(null);
    setForm({
      sku: `BD-AP-${Math.floor(1013 + Math.random() * 8900)}`,
      name: '',
      category_id: categories[0] ? String(categories[0].id) : '',
      supplier_id: suppliers[0] ? String(suppliers[0].id) : '',
      cost_price: '',
      selling_price: '',
      stock_qty: '0',
      reorder_level: '10',
      unit: 'pcs',
      warehouse_location: 'Banani Vault A-01',
    });
    setShowProductModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setError(null);
    setForm({
      sku: product.sku,
      name: product.name,
      category_id: String(product.category_id),
      supplier_id: String(product.supplier_id),
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
      stock_qty: String(product.stock_qty),
      reorder_level: String(product.reorder_level),
      unit: product.unit,
      warehouse_location: product.warehouse_location,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        category_id: Number(form.category_id),
        supplier_id: Number(form.supplier_id),
        cost_price: Number(form.cost_price),
        selling_price: Number(form.selling_price),
        stock_qty: Number(form.stock_qty),
        reorder_level: Number(form.reorder_level),
      };
      if (editingProduct) {
        await apiRequest(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowProductModal(false);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    setError(null);
    try {
      await apiRequest(`/api/products/${product.id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cannot delete product.');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/api/products/${adjustTarget.id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ delta: Number(adjustDelta), note: adjustNote }),
      });
      setAdjustTarget(null);
      setAdjustDelta('1');
      setAdjustNote('');
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Adjustment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName, description: newCategoryDesc }),
      });
      setNewCategoryName('');
      setNewCategoryDesc('');
      setShowCategoryModal(false);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      'stockpilot-inventory.csv',
      ['SKU', 'Name', 'Category', 'Supplier', 'Cost Price', 'Selling Price', 'Stock Qty', 'Reorder Level', 'Location'],
      filteredProducts.map((p) => [
        p.sku,
        p.name,
        p.category_name,
        p.supplier_name,
        p.cost_price,
        p.selling_price,
        p.stock_qty,
        p.reorder_level,
        p.warehouse_location,
      ])
    );
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <AppleSegmentedControl
          layoutId="products-main-tab"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { id: 'catalog', label: `Product Catalog (${products.length})` },
            { id: 'movements', label: `Stock Movement Audit (${movements.length})` },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] whitespace-nowrap transition-colors"
          >
            Add Category
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="products-error"
            variants={appleAlertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="alert"
            className="p-3.5 rounded-xl bg-[#ff3b30]/12 backdrop-blur-md border border-[#ff3b30]/25 text-xs text-[#d70015] dark:text-[#ff453a] flex items-center justify-between"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AppleViewTransition viewKey={activeTab}>
        {activeTab === 'catalog' ? (
          <div className="glass-surface rounded-2xl overflow-hidden">
          {/* Filter Toolbar */}
          <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU, product, supplier, or rack..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className="px-3 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>

              <AppleSegmentedControl
                layoutId="products-stock-filter"
                value={stockFilter}
                onChange={setStockFilter}
                buttonClassName="px-2.5 py-1 text-xs"
                options={[
                  { id: 'all', label: 'All' },
                  { id: 'in_stock', label: 'Optimal' },
                  { id: 'low', label: 'Low Stock' },
                  { id: 'out', label: 'Out' },
                ]}
              />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm text-[#6e6e73] dark:text-[#a1a1a6]">
                No products match your current search or filter criteria.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium"
              >
                Add First Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                    <th className="py-3 px-4 font-medium">Product & SKU</th>
                    <th className="py-3 px-4 font-medium">Category & Supplier</th>
                    <th className="py-3 px-4 font-medium text-right">Cost</th>
                    <th className="py-3 px-4 font-medium text-right">Selling</th>
                    <th className="py-3 px-4 font-medium text-right">Stock</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {filteredProducts.map((p) => {
                    const isOut = p.stock_qty === 0;
                    const isLow = p.stock_qty > 0 && p.stock_qty <= p.reorder_level;
                    return (
                      <tr key={p.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1d1d1f] dark:text-white">{p.name}</div>
                          <div className="text-xs text-[#86868b] dark:text-[#8e8e93] font-mono">
                            {p.sku} · {p.warehouse_location}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-medium">{p.category_name}</div>
                          <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{p.supplier_name}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                          {formatMoney(p.cost_price, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
                          {formatMoney(p.selling_price, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#1d1d1f] dark:text-white">
                          {p.stock_qty} <span className="text-xs font-normal text-[#86868b]">{p.unit}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#d70015] dark:text-[#ff453a] whitespace-nowrap">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#c93400] dark:text-[#ff9f0a] whitespace-nowrap">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#248a3d] dark:text-[#30d158] whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustTarget(p);
                                setAdjustDelta('5');
                                setAdjustNote('');
                              }}
                              title="Adjust Stock"
                              className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#0071e3] hover:bg-[#0071e3]/10 transition-colors"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p)}
                              title="Delete Product"
                              className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#d70015] hover:bg-[#ff3b30]/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Product</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Reference</th>
                  <th className="py-3 px-4 font-medium">Note</th>
                  <th className="py-3 px-4 font-medium text-right">Qty Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3 px-4 text-xs text-[#6e6e73] whitespace-nowrap">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1d1d1f] dark:text-white">{m.product_name}</div>
                      <div className="text-xs font-mono text-[#6e6e73]">{m.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#5a5a60] dark:text-[#a1a1a6]">{m.type}</td>
                    <td className="py-3 px-4 text-xs font-mono text-[#5a5a60] dark:text-[#a1a1a6]">{m.reference}</td>
                    <td className="py-3 px-4 text-xs text-[#6e6e73]">{m.note || '—'}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                        m.change_qty > 0 ? 'text-[#248a3d] dark:text-[#30d158]' : 'text-[#d70015] dark:text-[#ff453a]'
                      }`}
                    >
                      {m.change_qty > 0 ? `+${m.change_qty}` : m.change_qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </AppleViewTransition>

      {/* Create / Edit Product Modal */}
      <AppleModal open={showProductModal} onClose={() => setShowProductModal(false)} maxWidthClass="max-w-lg">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={() => setShowProductModal(false)}
            className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. MacBook Pro 14 M4"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Category</label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className={inputCls}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Supplier</label>
                  <select
                    required
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className={inputCls}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Cost (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Selling (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Reorder At</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.reorder_level}
                    onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                    Warehouse Rack / Bin
                  </label>
                  <input
                    type="text"
                    required
                    value={form.warehouse_location}
                    onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
      </AppleModal>

      {/* Quick Stock Adjustment Modal */}
      <AppleModal open={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} maxWidthClass="max-w-md">
        {adjustTarget && (
          <>
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                Adjust Stock · {adjustTarget.sku}
              </h3>
              <button type="button" onClick={() => setAdjustTarget(null)} className="text-[#86868b]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                Current stock for <strong className="text-[#1d1d1f] dark:text-white">{adjustTarget.name}</strong>:{' '}
                <span className="font-mono font-semibold">{adjustTarget.stock_qty} {adjustTarget.unit}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                  Quantity Change (use negative to deduct, e.g. -2 or +10)
                </label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                  Audit Reason
                </label>
                <input
                  type="text"
                  required
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Cycle count reconciliation or damaged unit"
                  className={inputCls}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="px-4 py-2 text-xs font-medium rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </>
        )}
      </AppleModal>

      {/* Add Category Modal */}
      <AppleModal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} maxWidthClass="max-w-md">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">New Category</h3>
          <button type="button" onClick={() => setShowCategoryModal(false)} className="text-[#86868b]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Category Name</label>
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Apple Display"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">Description</label>
            <input
              type="text"
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              placeholder="Optional scope description"
              className={inputCls}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="px-4 py-2 text-xs font-medium rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white"
            >
              Save Category
            </button>
          </div>
        </form>
      </AppleModal>
    </div>
  );
};
