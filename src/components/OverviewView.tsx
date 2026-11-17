import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CurrencyCode, DashboardData, NavSection } from '../types';
import { formatDateTime, formatMoney } from '../lib/api';
import { APPLE_EASE, appleStaggerContainer, appleStaggerItem } from '../lib/motion';

interface OverviewViewProps {
  data: DashboardData | null;
  loading: boolean;
  currency: CurrencyCode;
  onNavigate: (section: NavSection) => void;
}

interface OverviewTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  currency: CurrencyCode;
}

const OverviewChartTooltip: React.FC<OverviewTooltipProps> = ({ active, payload, label, currency }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-2xl glass-modal px-3.5 py-2.5 text-xs">
      <div className="font-semibold text-[#1d1d1f] dark:text-white mb-1">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#5a5a60] dark:text-[#a1a1a6]">
            <span className="w-2 h-2 rounded-xs inline-block" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
            {formatMoney(Number(entry.value ?? 0), currency)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const OverviewView: React.FC<OverviewViewProps> = ({ data, loading, currency, onNavigate }) => {
  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 rounded-2xl glass-surface" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl glass-surface" />
          ))}
        </div>
        <div className="h-72 rounded-2xl glass-surface" />
      </div>
    );
  }

  const { kpis, lowStockItems, categoryBreakdown, dailySeries, recentMovements } = data;
  const maxCategoryValue = Math.max(1, ...categoryBreakdown.map((c) => c.value));
  const retailMarginPct =
    kpis.inventory_retail_value > 0
      ? (((kpis.inventory_retail_value - kpis.inventory_cost_value) / kpis.inventory_retail_value) * 100).toFixed(1)
      : '0.0';

  const formatAxisMoney = (value: number) => {
    const converted = currency === 'USD' ? value / 120 : value;
    const prefix = currency === 'USD' ? '$' : '৳';
    if (converted >= 1000000) return `${prefix}${(converted / 1000000).toFixed(1)}M`;
    if (converted >= 1000) return `${prefix}${(converted / 1000).toFixed(0)}k`;
    return `${prefix}${Math.round(converted)}`;
  };

  return (
    <motion.div variants={appleStaggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Executive Operational Summary Banner */}
      <motion.div
        variants={appleStaggerItem}
        className="glass-surface rounded-2xl px-6 py-5 flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-lg font-display font-semibold text-[#1d1d1f] dark:text-white">
            Bangladesh Tech Retail & Distribution Command Center
          </h2>
          <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6] mt-0.5">
            Live BDT inventory valuation, 30-day Dhaka retail & corporate ledger across{' '}
            {kpis.total_products} SKUs ({kpis.total_units.toLocaleString()} units on hand)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 rounded-full glass-inset hover:bg-white/75 dark:hover:bg-white/[0.12] text-xs font-medium text-[#1d1d1f] dark:text-white flex items-center gap-1.5 whitespace-nowrap transition-colors group"
          >
            <span>30-Day Sales Analytics</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
          >
            Inspect Stock
          </button>
        </div>
      </motion.div>

      {/* 4-Column KPI Strip */}
      <motion.div variants={appleStaggerContainer} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
            <span>Inventory Retail Value</span>
            <Boxes className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff]" />
          </div>
          <div className="mt-2.5 text-2xl font-display font-semibold text-[#1d1d1f] dark:text-white font-mono tabular-nums tracking-[-0.02em]">
            {formatMoney(kpis.inventory_retail_value, currency)}
          </div>
          <div className="mt-2 text-xs text-[#6e6e73] dark:text-[#8e8e93]">
            Cost: {formatMoney(kpis.inventory_cost_value, currency)} · {retailMarginPct}% margin
          </div>
        </motion.div>

        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
            <span>Cumulative Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-[#248a3d] dark:text-[#30d158]" />
          </div>
          <div className="mt-2.5 text-2xl font-display font-semibold text-[#1d1d1f] dark:text-white font-mono tabular-nums tracking-[-0.02em]">
            {formatMoney(kpis.total_income, currency)}
          </div>
          <div className="mt-2 text-xs text-[#6e6e73] dark:text-[#8e8e93]">
            {kpis.sales_count} completed Apple retail & B2B invoices
          </div>
        </motion.div>

        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
            <span>Procurement & Operating Costs</span>
            <DollarSign className="w-4 h-4 text-[#c93400] dark:text-[#ff9f0a]" />
          </div>
          <div className="mt-2.5 text-2xl font-display font-semibold text-[#1d1d1f] dark:text-white font-mono tabular-nums tracking-[-0.02em]">
            {formatMoney(kpis.total_expense, currency)}
          </div>
          <div className="mt-2 text-xs text-[#6e6e73] dark:text-[#8e8e93]">
            {kpis.purchases_count} purchase orders · {kpis.suppliers_count} channel partners
          </div>
        </motion.div>

        <motion.div
          variants={appleStaggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.16, ease: APPLE_EASE }}
          className="glass-surface rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
            <span>Net Cashflow Balance</span>
            <Users className="w-4 h-4 text-[#6e6e73] dark:text-[#8e8e93]" />
          </div>
          <div
            className={`mt-2.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] ${
              kpis.net_profit >= 0 ? 'text-[#248a3d] dark:text-[#30d158]' : 'text-[#d70015] dark:text-[#ff453a]'
            }`}
          >
            {kpis.net_profit >= 0 ? '+' : ''}
            {formatMoney(kpis.net_profit, currency)}
          </div>
          <div className="mt-2 text-xs text-[#6e6e73] dark:text-[#8e8e93]">
            {kpis.low_stock_count + kpis.out_of_stock_count} stock alerts · {kpis.active_employees_count} active staff
          </div>
        </motion.div>
      </motion.div>

      {/* Main Analytics Row: Recharts 7-Day Area Flow + Category Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-surface rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                7-Day Revenue vs Expense Cashflow
              </h2>
              <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6] mt-0.5">
                Daily financial flow across Apple sales invoices, restocks, and store operating expenses
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline whitespace-nowrap"
            >
              Open 30-Day Trend
            </button>
          </div>

          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailySeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0071e3" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#8e8e93" strokeOpacity={0.18} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#6e6e73' }}
                  tickLine={false}
                  axisLine={{ stroke: '#8e8e93', strokeOpacity: 0.25 }}
                />
                <YAxis
                  tickFormatter={formatAxisMoney}
                  tick={{ fontSize: 11, fill: '#6e6e73' }}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <Tooltip content={<OverviewChartTooltip currency={currency} />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Revenue"
                  stroke="#0071e3"
                  strokeWidth={2.25}
                  fill="url(#overviewIncomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#86868b"
                  strokeWidth={1.75}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Valuation Breakdown */}
        <div className="glass-surface rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
              Stock Value by Apple Lineup
            </h2>
            <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6] mt-0.5">
              Current retail valuation across product families
            </p>
            <div className="mt-5 space-y-3.5">
              {categoryBreakdown.map((cat, idx) => {
                const pct = Math.max(4, Math.round((cat.value / maxCategoryValue) * 100));
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                        {cat.category} ({cat.units} units)
                      </span>
                      <span className="font-mono tabular-nums text-[#5a5a60] dark:text-[#a1a1a6] shrink-0 ml-2">
                        {formatMoney(cat.value, currency)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.45, delay: 0.08 + idx * 0.04, ease: APPLE_EASE }}
                        className="h-full origin-left bg-[#0071e3] dark:bg-[#0a84ff] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="mt-6 w-full py-2 px-4 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-white hover:bg-white/75 dark:hover:bg-white/[0.12] transition-colors"
          >
            Manage Apple Catalog
          </button>
        </div>
      </div>

      {/* Bottom Row: Low Stock Reorder Alerts & Recent Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                Low Stock & Reorder Alerts
              </h2>
              <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
                Apple SKUs at or below configured reorder threshold
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('purchases')}
              className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium whitespace-nowrap shrink-0 shadow-[0_3px_10px_rgba(0,113,227,0.25)] transition-colors"
            >
              Restock PO
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#5a5a60] dark:text-[#a1a1a6] flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#248a3d] dark:text-[#30d158]" />
              <span>All Apple SKUs are above reorder thresholds.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                    <th className="py-2.5 px-4 font-medium">Product</th>
                    <th className="py-2.5 px-4 font-medium text-right">Stock</th>
                    <th className="py-2.5 px-4 font-medium text-right">Reorder</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                  {lowStockItems.map((item) => {
                    const isOut = item.stock_qty === 0;
                    return (
                      <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-[#1d1d1f] dark:text-white">{item.name}</div>
                          <div className="text-xs text-[#6e6e73] dark:text-[#8e8e93] font-mono">
                            {item.sku} · {item.supplier_name}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
                          {item.stock_qty} {item.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#6e6e73] dark:text-[#8e8e93]">
                          {item.reorder_level}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
                              isOut ? 'text-[#d70015] dark:text-[#ff453a]' : 'text-[#c93400] dark:text-[#ff9f0a]'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {isOut ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="glass-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                Recent Stock Movements
              </h2>
              <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
                Real-time audit trail across purchases, sales, and adjustments
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sales')}
              className="px-3.5 py-1.5 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-white hover:bg-white/75 dark:hover:bg-white/[0.12] whitespace-nowrap shrink-0 transition-colors"
            >
              New Sale
            </button>
          </div>

          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {recentMovements.map((move) => {
              const positive = move.change_qty > 0;
              return (
                <div
                  key={move.id}
                  className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-white/40 dark:hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate">{move.product_name}</div>
                    <div className="text-xs text-[#6e6e73] dark:text-[#8e8e93]">
                      {move.type} · <span className="font-mono">{move.reference}</span> ·{' '}
                      {formatDateTime(move.created_at)}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-mono tabular-nums text-sm font-semibold shrink-0 ${
                      positive ? 'text-[#248a3d] dark:text-[#30d158]' : 'text-[#d70015] dark:text-[#ff453a]'
                    }`}
                  >
                    {positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {positive ? `+${move.change_qty}` : move.change_qty}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
