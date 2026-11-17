import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Truck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Category, CurrencyCode, ReportPeriod, ReportsData, Supplier } from '../types';
import { apiRequest, downloadCsv, formatDateTime, formatMoney } from '../lib/api';
import { APPLE_EASE } from '../lib/motion';
import { AppleSegmentedControl, AppleViewTransition } from './AppleMotion';

interface ReportsViewProps {
  categories: Category[];
  suppliers: Supplier[];
  currency: CurrencyCode;
}

type ReportTab = 'sales' | 'stock' | 'purchases' | 'pnl';

interface ChartTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  currency: CurrencyCode;
}

const ReportChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, currency }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-2xl glass-modal px-3.5 py-2.5 text-xs">
      <div className="font-mono font-semibold text-[#1d1d1f] dark:text-white mb-1">{label}</div>
      <div className="space-y-0.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#6e6e73] dark:text-[#a1a1a6]">
              <span className="w-2 h-2 rounded-xs inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
              {formatMoney(Number(entry.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReportsView: React.FC<ReportsViewProps> = ({ categories, suppliers, currency }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');

  const [reportData, setReportData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (categoryId !== 'all') params.set('category_id', categoryId);
      if (supplierId !== 'all') params.set('supplier_id', supplierId);

      const res = await apiRequest<ReportsData>(`/api/reports?${params.toString()}`);
      setReportData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics report.');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, categoryId, supplierId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResetFilters = () => {
    setPeriod('daily');
    setStartDate('');
    setEndDate('');
    setCategoryId('all');
    setSupplierId('all');
  };

  const hasActiveFilters =
    period !== 'daily' || startDate !== '' || endDate !== '' || categoryId !== 'all' || supplierId !== 'all';

  const formatAxisMoney = (value: number) => {
    const converted = currency === 'USD' ? value / 120 : value;
    const prefix = currency === 'USD' ? '$' : '৳';
    if (converted >= 1000000) return `${prefix}${(converted / 1000000).toFixed(1)}M`;
    if (converted >= 1000) return `${prefix}${(converted / 1000).toFixed(0)}k`;
    return `${prefix}${Math.round(converted)}`;
  };

  const convertMoneyValue = (amount: number) => {
    const val = currency === 'USD' ? amount / 120 : amount;
    return Number(val.toFixed(currency === 'USD' ? 2 : 0));
  };

  const currencyLabel = currency === 'USD' ? 'USD' : 'BDT';

  const exportSalesSummaryCsv = () => {
    if (!reportData) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `stockpilot-sales-summary-${period}-${todayIso}.csv`,
      [
        'Period',
        'Orders',
        'Units Sold',
        `Revenue (${currencyLabel})`,
        `COGS (${currencyLabel})`,
        `Gross Profit (${currencyLabel})`,
      ],
      reportData.salesPerformance.series.map((row) => [
        row.period_label,
        row.order_count,
        row.units_sold,
        convertMoneyValue(row.revenue),
        convertMoneyValue(row.cogs),
        convertMoneyValue(row.gross_profit),
      ])
    );
  };

  const exportInventoryStatusCsv = () => {
    if (!reportData) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `stockpilot-inventory-status-${todayIso}.csv`,
      [
        'SKU',
        'Product',
        'Category',
        'Supplier',
        'Location',
        'Stock Qty',
        'Reorder Level',
        'Unit',
        `Cost Value (${currencyLabel})`,
        `Retail Value (${currencyLabel})`,
        'Status',
      ],
      reportData.stockReport.items.map((item) => [
        item.sku,
        item.name,
        item.category_name,
        item.supplier_name,
        item.warehouse_location,
        item.stock_qty,
        item.reorder_level,
        item.unit,
        convertMoneyValue(item.cost_valuation),
        convertMoneyValue(item.retail_valuation),
        item.stock_status,
      ])
    );
  };

  const exportLowStockAlertsCsv = () => {
    if (!reportData) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `stockpilot-low-stock-alerts-${todayIso}.csv`,
      [
        'SKU',
        'Product',
        'Category',
        'Supplier',
        'On Hand',
        'Reorder Level',
        'Suggested Restock Qty',
        `Est. Restock Cost (${currencyLabel})`,
        'Status',
      ],
      reportData.lowStockAlerts.map((item) => [
        item.sku,
        item.name,
        item.category_name,
        item.supplier_name,
        item.stock_qty,
        item.reorder_level,
        item.suggested_restock_qty,
        convertMoneyValue(item.estimated_restock_cost),
        item.stock_status,
      ])
    );
  };

  const exportTopProductsCsv = () => {
    if (!reportData) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `stockpilot-top-products-${todayIso}.csv`,
      ['SKU', 'Product', 'Category', 'Units Sold', `Revenue (${currencyLabel})`, `Gross Profit (${currencyLabel})`],
      reportData.salesPerformance.topProducts.map((tp) => [
        tp.sku,
        tp.name,
        tp.category_name,
        tp.units_sold,
        convertMoneyValue(tp.revenue),
        convertMoneyValue(tp.gross_profit),
      ])
    );
  };

  const handleExportActiveCsv = () => {
    if (!reportData) return;
    const todayIso = new Date().toISOString().slice(0, 10);

    if (activeTab === 'stock') {
      exportInventoryStatusCsv();
    } else if (activeTab === 'sales') {
      exportSalesSummaryCsv();
    } else if (activeTab === 'purchases') {
      downloadCsv(
        `stockpilot-supplier-purchase-summary-${todayIso}.csv`,
        [
          'Supplier',
          'Contact',
          'Phone',
          'Linked SKUs',
          'Total Orders',
          'Received',
          'Pending',
          `Total Spend (${currencyLabel})`,
          `Avg Order (${currencyLabel})`,
        ],
        reportData.supplierPerformance.map((sup) => [
          sup.name,
          sup.contact_person,
          sup.phone,
          sup.linked_skus,
          sup.total_orders,
          sup.received_orders,
          sup.pending_orders,
          convertMoneyValue(sup.total_spend),
          convertMoneyValue(sup.avg_order_value),
        ])
      );
    } else {
      const fs = reportData.financialStatement;
      downloadCsv(
        `stockpilot-profit-loss-statement-${todayIso}.csv`,
        ['Line Item', `Amount (${currencyLabel})`],
        [
          ['Gross Sales', convertMoneyValue(fs.gross_sales)],
          ['Discounts Given', -convertMoneyValue(fs.discounts_given)],
          ['Net Sales Revenue', convertMoneyValue(fs.net_sales_revenue)],
          ['Cost of Goods Sold (COGS)', -convertMoneyValue(fs.cogs)],
          ['Gross Profit', convertMoneyValue(fs.gross_profit)],
          ['Other Income', convertMoneyValue(fs.other_income)],
          ['Operating Expenses', -convertMoneyValue(fs.operating_expenses)],
          ['Net Profit / Loss', convertMoneyValue(fs.net_profit)],
          ['Inventory Procurement Outflow (Asset Purchases)', convertMoneyValue(fs.inventory_purchases)],
        ]
      );
    }
  };

  const activeCategoryLabel =
    categoryId === 'all'
      ? 'All Categories'
      : categories.find((c) => String(c.id) === categoryId)?.name ?? 'Selected Category';
  const activeSupplierLabel =
    supplierId === 'all'
      ? 'All Suppliers'
      : suppliers.find((s) => String(s.id) === supplierId)?.name ?? 'Selected Supplier';

  return (
    <div className="space-y-6">
      {/* Print-Only Formal Report Header */}
      <div className="hidden print:block border-b border-slate-300 pb-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900">
              StockPilot —{' '}
              {activeTab === 'sales'
                ? 'Sales Performance Summary'
                : activeTab === 'stock'
                  ? 'Inventory Status & Alerts Report'
                  : activeTab === 'purchases'
                    ? 'Purchases & Supplier Performance Report'
                    : 'Profit & Loss Statement'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Granularity: {period.toUpperCase()} · Range: {startDate || 'All Time'} to {endDate || 'Present'} ·{' '}
              {activeCategoryLabel} · {activeSupplierLabel}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Generated: {new Date().toLocaleString('en-US')}</div>
            <div>Currency: {currencyLabel}</div>
          </div>
        </div>
      </div>

      {/* Report Section Tabs & Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <AppleSegmentedControl
          layoutId="reports-main-tab"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { id: 'sales', label: 'Sales Trends & Analytics', icon: BarChart3 },
            { id: 'stock', label: 'Stock & Alerts', icon: Boxes },
            { id: 'purchases', label: 'Purchases & Suppliers', icon: Truck },
            { id: 'pnl', label: 'Profit & Loss', icon: FileSpreadsheet },
          ]}
        />

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportActiveCsv}
            disabled={!reportData}
            className="px-4 py-2 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Global Analytics Filter Bar */}
      <div className="glass-surface rounded-2xl p-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6] mb-1">
              Period Breakdown
            </label>
            <AppleSegmentedControl
              layoutId="reports-period-tab"
              value={period}
              onChange={setPeriod}
              buttonClassName="flex-1 py-1 text-xs capitalize"
              options={[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6] mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6] mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6] mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5a5a60] dark:text-[#a1a1a6] mb-1">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              className="w-full py-1.5 px-3 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#ff3b30]/12 backdrop-blur-md border border-[#ff3b30]/25 text-xs text-[#d70015] dark:text-[#ff453a]">
          {error}
        </div>
      )}

      {loading || !reportData ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl glass-surface" />
            ))}
          </div>
          <div className="h-80 rounded-2xl glass-surface" />
        </div>
      ) : (
        <AppleViewTransition viewKey={activeTab}>
          {/* TAB 1: SALES TRENDS & PERFORMANCE (RECHARTS 30-DAY LINE CHART + PERIOD BREAKDOWN) */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {(() => {
                const last30 = reportData.salesPerformance.last30Days || [];
                const total30Rev = last30.reduce((sum, d) => sum + d.revenue, 0);
                const total30Profit = last30.reduce((sum, d) => sum + d.gross_profit, 0);
                const total30Orders = last30.reduce((sum, d) => sum + d.order_count, 0);
                const dailyAvg = last30.length > 0 ? total30Rev / last30.length : 0;
                const peakDay = last30.reduce(
                  (best, cur) => (cur.revenue > best.revenue ? cur : best),
                  last30[0] || { label: '—', revenue: 0 }
                );

                const series = reportData.salesPerformance.series;

                return (
                  <>
                    {/* 30-Day Executive KPI Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:break-inside-avoid">
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.16, ease: APPLE_EASE }}
                        className="glass-surface rounded-2xl p-5"
                      >
                        <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">30-Day Total Revenue</div>
                        <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
                          {formatMoney(total30Rev, currency)}
                        </div>
                        <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">
                          {total30Orders} completed invoices
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.16, ease: APPLE_EASE }}
                        className="glass-surface rounded-2xl p-5"
                      >
                        <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">30-Day Daily Average</div>
                        <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#0071e3] dark:text-[#0a84ff]">
                          {formatMoney(dailyAvg, currency)}
                        </div>
                        <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">Mean daily revenue run rate</div>
                      </motion.div>
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.16, ease: APPLE_EASE }}
                        className="glass-surface rounded-2xl p-5"
                      >
                        <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Peak Day Revenue</div>
                        <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
                          {formatMoney(peakDay.revenue, currency)}
                        </div>
                        <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">Recorded on {peakDay.label}</div>
                      </motion.div>
                      <motion.div
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.16, ease: APPLE_EASE }}
                        className="glass-surface rounded-2xl p-5"
                      >
                        <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">30-Day Gross Profit</div>
                        <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#248a3d] dark:text-[#30d158]">
                          {formatMoney(total30Profit, currency)}
                        </div>
                        <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">
                          Margin: {total30Rev > 0 ? ((total30Profit / total30Rev) * 100).toFixed(1) : '0.0'}%
                        </div>
                      </motion.div>
                    </div>

                    {/* Primary Recharts 30-Day Daily Revenue Line Chart */}
                    <div className="glass-surface rounded-2xl p-6 print:break-inside-avoid">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                        <div>
                          <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                            Daily Revenue Trend — Last 30 Days
                          </h2>
                          <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                            Continuous 30-day Apple retail & enterprise revenue trajectory with gross profit overlay
                          </p>
                        </div>
                        <span className="text-xs font-mono text-[#86868b] dark:text-[#8e8e93]">
                          {last30[0]?.label} — {last30[last30.length - 1]?.label}
                        </span>
                      </div>

                      <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={last30} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#8e8e93" strokeOpacity={0.18} vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11, fill: '#86868b' }}
                              tickLine={false}
                              axisLine={{ stroke: '#8e8e93', strokeOpacity: 0.25 }}
                              minTickGap={22}
                            />
                            <YAxis
                              tickFormatter={formatAxisMoney}
                              tick={{ fontSize: 11, fill: '#86868b' }}
                              tickLine={false}
                              axisLine={false}
                              width={56}
                            />
                            <Tooltip content={<ReportChartTooltip currency={currency} />} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              name="Daily Revenue"
                              stroke="#0071e3"
                              strokeWidth={2.5}
                              dot={{ r: 2.5, fill: '#0071e3', strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: '#0071e3', stroke: '#ffffff', strokeWidth: 2 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="gross_profit"
                              name="Gross Profit"
                              stroke="#248a3d"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              dot={false}
                              activeDot={{ r: 4, fill: '#248a3d' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Period Comparison Recharts Bar Chart (Daily / Weekly / Monthly) */}
                    <div className="glass-surface rounded-2xl p-6 print:break-inside-avoid">
                      <div className="mb-5">
                        <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white capitalize">
                          {period} Revenue vs Gross Profit Comparison
                        </h2>
                        <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                          Aggregated across {series.length} {period} period{series.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      {series.length === 0 ? (
                        <div className="py-12 text-center text-sm text-[#86868b]">
                          No sales transactions found for the selected filter range.
                        </div>
                      ) : (
                        <div className="w-full h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={series} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#8e8e93" strokeOpacity={0.18} vertical={false} />
                              <XAxis
                                dataKey="period_label"
                                tick={{ fontSize: 11, fill: '#86868b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#8e8e93', strokeOpacity: 0.25 }}
                              />
                              <YAxis
                                tickFormatter={formatAxisMoney}
                                tick={{ fontSize: 11, fill: '#86868b' }}
                                tickLine={false}
                                axisLine={false}
                                width={56}
                              />
                              <Tooltip content={<ReportChartTooltip currency={currency} />} />
                              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                              <Bar dataKey="revenue" name="Revenue" fill="#0071e3" radius={[5, 5, 0, 0]} maxBarSize={36} />
                              <Bar
                                dataKey="gross_profit"
                                name="Gross Profit"
                                fill="#34c759"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={36}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Period Breakdown Table & Top Selling Apple Products */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="glass-surface rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                          <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white capitalize">
                            {period} Sales Breakdown
                          </h3>
                          <button
                            type="button"
                            onClick={exportSalesSummaryCsv}
                            className="no-print text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>CSV</span>
                          </button>
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead className="sticky top-0 bg-white/75 dark:bg-[#1c1c1e]/75 backdrop-blur-md">
                              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#86868b] dark:text-[#8e8e93]">
                                <th className="py-2.5 px-4 font-medium">Period</th>
                                <th className="py-2.5 px-4 font-medium text-right">Orders</th>
                                <th className="py-2.5 px-4 font-medium text-right">Units</th>
                                <th className="py-2.5 px-4 font-medium text-right">Revenue</th>
                                <th className="py-2.5 px-4 font-medium text-right">Gross Profit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                              {series.map((row) => (
                                <tr key={row.period_label} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                                  <td className="py-2.5 px-4 font-mono text-xs font-medium text-[#1d1d1f] dark:text-white">
                                    {row.period_label}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                                    {row.order_count}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                                    {row.units_sold}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">
                                    {formatMoney(row.revenue, currency)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#248a3d] dark:text-[#30d158]">
                                    {formatMoney(row.gross_profit, currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="glass-surface rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                          <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                            Top Performing Apple Products
                          </h3>
                          <button
                            type="button"
                            onClick={exportTopProductsCsv}
                            className="no-print text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>CSV</span>
                          </button>
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead className="sticky top-0 bg-white/75 dark:bg-[#1c1c1e]/75 backdrop-blur-md">
                              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#86868b] dark:text-[#8e8e93]">
                                <th className="py-2.5 px-4 font-medium">Product</th>
                                <th className="py-2.5 px-4 font-medium text-right">Units</th>
                                <th className="py-2.5 px-4 font-medium text-right">Revenue</th>
                                <th className="py-2.5 px-4 font-medium text-right">Profit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                              {reportData.salesPerformance.topProducts.map((tp) => (
                                <tr key={tp.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                                  <td className="py-2.5 px-4">
                                    <div className="font-medium text-[#1d1d1f] dark:text-white text-xs">{tp.name}</div>
                                    <div className="text-xs font-mono text-[#86868b] dark:text-[#8e8e93]">
                                      {tp.sku} · {tp.category_name}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                                    {tp.units_sold}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-medium">
                                    {formatMoney(tp.revenue, currency)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-medium text-[#248a3d] dark:text-[#30d158]">
                                    {formatMoney(tp.gross_profit, currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 2: CURRENT STOCK LEVELS & LOW STOCK ALERTS */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:break-inside-avoid">
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Inventory Cost Valuation</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
                    {formatMoney(reportData.stockReport.summary.cost_valuation, currency)}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">
                    {reportData.stockReport.summary.total_skus} SKUs · {reportData.stockReport.summary.total_units.toLocaleString()} units
                  </div>
                </div>
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Inventory Retail Valuation</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#0071e3] dark:text-[#0a84ff]">
                    {formatMoney(reportData.stockReport.summary.retail_valuation, currency)}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">
                    Potential Margin: {formatMoney(reportData.stockReport.summary.potential_margin, currency)}
                  </div>
                </div>
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Healthy Stock SKUs</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#248a3d] dark:text-[#30d158]">
                    {reportData.stockReport.summary.healthy_count}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">Above configured reorder point</div>
                </div>
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Low & Out-of-Stock Alerts</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#c93400] dark:text-[#ff9f0a]">
                    {reportData.stockReport.summary.low_stock_count + reportData.stockReport.summary.out_of_stock_count}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b] dark:text-[#8e8e93]">
                    {reportData.stockReport.summary.out_of_stock_count} out of stock · {reportData.stockReport.summary.low_stock_count} low
                  </div>
                </div>
              </div>

              {/* Low Stock Replenishment Table */}
              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                      Low Stock Alert & Replenishment Plan
                    </h2>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                      SKUs requiring procurement with suggested restock quantities and estimated cost
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Est. Restock Budget:{' '}
                      {formatMoney(
                        reportData.lowStockAlerts.reduce((sum, a) => sum + a.estimated_restock_cost, 0),
                        currency
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={exportLowStockAlertsCsv}
                      disabled={reportData.lowStockAlerts.length === 0}
                      className="no-print text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 whitespace-nowrap disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {reportData.lowStockAlerts.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#6e6e73] flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-[#248a3d] dark:text-[#30d158]" />
                    <span>No low-stock alerts match the selected filters.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#86868b] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                          <th className="py-3 px-4 font-medium">SKU & Product</th>
                          <th className="py-3 px-4 font-medium">Supplier</th>
                          <th className="py-3 px-4 font-medium text-right">On Hand</th>
                          <th className="py-3 px-4 font-medium text-right">Reorder Pt</th>
                          <th className="py-3 px-4 font-medium text-right">Suggested Order</th>
                          <th className="py-3 px-4 font-medium text-right">Est. Cost</th>
                          <th className="py-3 px-4 font-medium">Alert State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        {reportData.lowStockAlerts.map((item) => (
                          <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#1d1d1f] dark:text-white">{item.name}</div>
                              <div className="text-xs font-mono text-[#86868b]">
                                {item.sku} · {item.category_name}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{item.supplier_name}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#1d1d1f] dark:text-white">
                              {item.stock_qty} {item.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#86868b]">
                              {item.reorder_level}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#0071e3] dark:text-[#0a84ff]">
                              +{item.suggested_restock_qty} {item.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#1d1d1f] dark:text-white">
                              {formatMoney(item.estimated_restock_cost, currency)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
                                  item.stock_status === 'Out of Stock'
                                    ? 'text-[#d70015] dark:text-[#ff453a]'
                                    : 'text-[#c93400] dark:text-[#ff9f0a]'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {item.stock_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Complete Current Stock Valuation Table */}
              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
                  <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                    Current Stock Levels & Valuation Report
                  </h2>
                  <button
                    type="button"
                    onClick={exportInventoryStatusCsv}
                    className="no-print text-xs font-medium text-[#0071e3] dark:text-[#0a84ff] hover:underline flex items-center gap-1 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#86868b] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                        <th className="py-3 px-4 font-medium">SKU</th>
                        <th className="py-3 px-4 font-medium">Product</th>
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium text-right">Stock</th>
                        <th className="py-3 px-4 font-medium text-right">Cost Value</th>
                        <th className="py-3 px-4 font-medium text-right">Retail Value</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {reportData.stockReport.items.map((item) => (
                        <tr key={item.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                          <td className="py-2.5 px-4 font-mono text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{item.sku}</td>
                          <td className="py-2.5 px-4 font-medium text-[#1d1d1f] dark:text-white">{item.name}</td>
                          <td className="py-2.5 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{item.category_name}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {item.stock_qty} {item.unit}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#6e6e73] dark:text-[#a1a1a6]">
                            {formatMoney(item.cost_valuation, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
                            {formatMoney(item.retail_valuation, currency)}
                          </td>
                          <td className="py-2.5 px-4 text-xs font-medium">
                            {item.stock_status === 'Optimal' ? (
                              <span className="text-[#248a3d] dark:text-[#30d158]">Optimal</span>
                            ) : item.stock_status === 'Low Stock' ? (
                              <span className="text-[#c93400] dark:text-[#ff9f0a]">Low Stock</span>
                            ) : (
                              <span className="text-[#d70015] dark:text-[#ff453a]">Out of Stock</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PURCHASES & SUPPLIER PERFORMANCE */}
          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:break-inside-avoid">
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Total Procurement Spend</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
                    {formatMoney(reportData.purchaseSummary.summary.total_spend, currency)}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b]">
                    {reportData.purchaseSummary.summary.total_orders} purchase orders
                  </div>
                </div>
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Received Stock Value</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#248a3d] dark:text-[#30d158]">
                    {formatMoney(reportData.purchaseSummary.summary.received_spend, currency)}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b]">
                    {reportData.purchaseSummary.summary.received_orders} completed deliveries
                  </div>
                </div>
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Pending In-Transit Value</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#c93400] dark:text-[#ff9f0a]">
                    {formatMoney(reportData.purchaseSummary.summary.pending_value, currency)}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b]">
                    {reportData.purchaseSummary.summary.pending_orders} pending POs
                  </div>
                </div>
                <div className="glass-surface rounded-2xl p-5">
                  <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">Units Procured</div>
                  <div className="mt-1.5 text-2xl font-display font-semibold font-mono tabular-nums tracking-[-0.02em] text-[#1d1d1f] dark:text-white">
                    {reportData.purchaseSummary.summary.total_units.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-[#86868b]">Across filtered suppliers</div>
                </div>
              </div>

              {/* Supplier Performance Scorecard */}
              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                    Supplier Performance Scorecard
                  </h2>
                  <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                    Fulfillment completion, order volume, and average order value per partner
                  </p>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#86868b] bg-white/35 dark:bg-white/[0.03]">
                        <th className="py-3 px-4 font-medium">Supplier</th>
                        <th className="py-3 px-4 font-medium text-right">SKUs</th>
                        <th className="py-3 px-4 font-medium text-right">Orders</th>
                        <th className="py-3 px-4 font-medium text-right">Received / Pending</th>
                        <th className="py-3 px-4 font-medium text-right">Avg Order</th>
                        <th className="py-3 px-4 font-medium text-right">Total Spend</th>
                        <th className="py-3 px-4 font-medium">Last Order</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {reportData.supplierPerformance.map((sup) => (
                        <tr key={sup.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#1d1d1f] dark:text-white">{sup.name}</div>
                            <div className="text-xs text-[#86868b]">
                              {sup.contact_person} · <span className="font-mono">{sup.phone}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{sup.linked_skus}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{sup.total_orders}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                            <span className="text-[#248a3d] dark:text-[#30d158]">{sup.received_orders}</span>
                            <span className="text-[#86868b]"> / </span>
                            <span className="text-[#c93400] dark:text-[#ff9f0a]">{sup.pending_orders}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#6e6e73] dark:text-[#a1a1a6]">
                            {formatMoney(sup.avg_order_value, currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#1d1d1f] dark:text-white">
                            {formatMoney(sup.total_spend, currency)}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#86868b]">
                            {sup.last_order_date ? formatDateTime(sup.last_order_date) : 'No orders'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Purchase Order Summary List */}
              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <h2 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                    Purchase Order Summary
                  </h2>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#86868b] bg-white/35 dark:bg-white/[0.03]">
                        <th className="py-3 px-4 font-medium">PO Number</th>
                        <th className="py-3 px-4 font-medium">Date</th>
                        <th className="py-3 px-4 font-medium">Supplier</th>
                        <th className="py-3 px-4 font-medium text-right">Units</th>
                        <th className="py-3 px-4 font-medium text-right">Amount</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                      {reportData.purchaseSummary.orders.map((po) => (
                        <tr key={po.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                          <td className="py-3 px-4 font-mono text-xs font-medium text-[#1d1d1f] dark:text-white">
                            {po.po_number}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#86868b]">{formatDateTime(po.purchase_date)}</td>
                          <td className="py-3 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{po.supplier_name}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">{po.total_units}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                            {formatMoney(po.total_amount, currency)}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium capitalize">
                            <span
                              className={
                                po.status === 'received'
                                  ? 'text-[#248a3d] dark:text-[#30d158]'
                                  : 'text-[#c93400] dark:text-[#ff9f0a]'
                              }
                            >
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL STATEMENT (PROFIT & LOSS) */}
          {activeTab === 'pnl' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-surface rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display font-semibold text-[#1d1d1f] dark:text-white">
                      Profit & Loss Statement (Income Statement)
                    </h2>
                    <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] mt-0.5">
                      {startDate || endDate
                        ? `Reporting window: ${startDate || 'Beginning'} to ${endDate || 'Present'}`
                        : 'Cumulative performance across all recorded Apple retail & B2B transactions'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#86868b]">Gross Margin</div>
                    <div className="font-mono font-semibold text-sm text-[#0071e3] dark:text-[#0a84ff]">
                      {reportData.financialStatement.gross_margin_pct}%
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] text-sm">
                  <div className="px-6 py-3.5 flex justify-between">
                    <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">Gross Product Sales</span>
                    <span className="font-mono tabular-nums text-[#1d1d1f] dark:text-white">
                      {formatMoney(reportData.financialStatement.gross_sales, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-3.5 flex justify-between">
                    <span className="text-[#6e6e73] dark:text-[#a1a1a6]">Less: Customer Discounts Given</span>
                    <span className="font-mono tabular-nums text-[#d70015] dark:text-[#ff453a]">
                      -{formatMoney(reportData.financialStatement.discounts_given, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-3.5 flex justify-between bg-white/35 dark:bg-white/[0.03] font-medium">
                    <span className="text-[#1d1d1f] dark:text-white">Net Sales Revenue</span>
                    <span className="font-mono tabular-nums text-[#1d1d1f] dark:text-white">
                      {formatMoney(reportData.financialStatement.net_sales_revenue, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-3.5 flex justify-between">
                    <span className="text-[#6e6e73] dark:text-[#a1a1a6]">
                      Less: Cost of Goods Sold (COGS on Units Sold)
                    </span>
                    <span className="font-mono tabular-nums text-[#d70015] dark:text-[#ff453a]">
                      -{formatMoney(reportData.financialStatement.cogs, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-4 flex justify-between bg-[#0071e3]/[0.06] dark:bg-[#0a84ff]/[0.1] font-semibold">
                    <span className="text-[#1d1d1f] dark:text-white">
                      Gross Profit from Sales ({reportData.financialStatement.gross_margin_pct}%)
                    </span>
                    <span className="font-mono tabular-nums text-[#0071e3] dark:text-[#0a84ff]">
                      {formatMoney(reportData.financialStatement.gross_profit, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-3.5 flex justify-between">
                    <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">Plus: Other Non-Sales Income</span>
                    <span className="font-mono tabular-nums text-[#248a3d] dark:text-[#30d158]">
                      +{formatMoney(reportData.financialStatement.other_income, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-3.5 flex justify-between">
                    <span className="text-[#6e6e73] dark:text-[#a1a1a6]">
                      Less: Operating Expenses (Store Lease, Payroll, Insurance)
                    </span>
                    <span className="font-mono tabular-nums text-[#d70015] dark:text-[#ff453a]">
                      -{formatMoney(reportData.financialStatement.operating_expenses, currency)}
                    </span>
                  </div>
                  <div className="px-6 py-5 flex justify-between bg-white/40 dark:bg-white/[0.04] text-base font-display font-bold">
                    <span className="text-[#1d1d1f] dark:text-white">
                      Net Profit / (Loss) ({reportData.financialStatement.net_margin_pct}%)
                    </span>
                    <span
                      className={`font-mono tabular-nums ${
                        reportData.financialStatement.net_profit >= 0
                          ? 'text-[#248a3d] dark:text-[#30d158]'
                          : 'text-[#d70015] dark:text-[#ff453a]'
                      }`}
                    >
                      {reportData.financialStatement.net_profit >= 0 ? '+' : ''}
                      {formatMoney(reportData.financialStatement.net_profit, currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-surface rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-display font-semibold text-[#1d1d1f] dark:text-white">
                    Cash Outflow Breakdown
                  </h3>
                  <div className="space-y-3">
                    {reportData.financialStatement.expense_breakdown.length === 0 ? (
                      <p className="text-xs text-[#86868b]">No expenses recorded in this period.</p>
                    ) : (
                      reportData.financialStatement.expense_breakdown.map((exp) => (
                        <div key={exp.category} className="flex items-center justify-between text-xs">
                          <span className="text-[#6e6e73] dark:text-[#a1a1a6]">{exp.category}</span>
                          <span className="font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
                            {formatMoney(exp.total, currency)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="glass-surface rounded-2xl p-6 space-y-2">
                  <div className="text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
                    Inventory Procurement Cashflow
                  </div>
                  <div className="text-xl font-display font-semibold font-mono tabular-nums text-[#1d1d1f] dark:text-white">
                    {formatMoney(reportData.financialStatement.inventory_purchases, currency)}
                  </div>
                  <p className="text-xs text-[#86868b] dark:text-[#8e8e93] leading-relaxed">
                    Inventory purchases increase Apple hardware stock on hand and are expensed into Profit & Loss as
                    Cost of Goods Sold (COGS) when units are sold.
                  </p>
                </div>
              </div>
            </div>
          )}
        </AppleViewTransition>
      )}
    </div>
  );
};
