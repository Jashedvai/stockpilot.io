export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  product_count?: number;
  order_count?: number;
  total_supplied_value?: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  supplier_id: number;
  category_name: string;
  supplier_name: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  unit: string;
  warehouse_location: string;
  updated_at: string;
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  product_id: number;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface Purchase {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  user_id: number;
  created_by_name: string;
  total_amount: number;
  status: 'received' | 'pending';
  notes: string;
  purchase_date: string;
  items: PurchaseItem[];
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  user_id: number;
  cashier_name: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  items: SaleItem[];
}

export interface Employee {
  id: number;
  emp_code: string;
  full_name: string;
  email: string;
  phone: string;
  role_title: string;
  department: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Inactive';
  joined_date: string;
}

export interface FinancialRecord {
  id: number;
  type: 'Income' | 'Expense';
  category: string;
  reference_code: string;
  description: string;
  amount: number;
  record_date: string;
  created_by_name?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  change_qty: number;
  type: 'Purchase' | 'Sale' | 'Adjustment';
  reference: string;
  note: string;
  created_at: string;
}

export interface DashboardData {
  kpis: {
    total_products: number;
    total_units: number;
    inventory_cost_value: number;
    inventory_retail_value: number;
    out_of_stock_count: number;
    low_stock_count: number;
    total_income: number;
    total_expense: number;
    net_profit: number;
    sales_count: number;
    purchases_count: number;
    suppliers_count: number;
    active_employees_count: number;
  };
  lowStockItems: Product[];
  categoryBreakdown: {
    category: string;
    product_count: number;
    units: number;
    value: number;
  }[];
  dailySeries: {
    day: string;
    income: number;
    expense: number;
  }[];
  recentMovements: StockMovement[];
}

export type CurrencyCode = 'USD' | 'BDT';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportStockItem {
  id: number;
  sku: string;
  name: string;
  category_name: string;
  supplier_name: string;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  unit: string;
  warehouse_location: string;
  cost_valuation: number;
  retail_valuation: number;
  stock_status: 'Optimal' | 'Low Stock' | 'Out of Stock';
}

export interface LowStockAlertItem extends ReportStockItem {
  suggested_restock_qty: number;
  estimated_restock_cost: number;
}

export interface ReportsData {
  filters: {
    period: ReportPeriod;
    start_date: string;
    end_date: string;
    category_id: number | null;
    supplier_id: number | null;
  };
  stockReport: {
    summary: {
      total_skus: number;
      total_units: number;
      cost_valuation: number;
      retail_valuation: number;
      potential_margin: number;
      healthy_count: number;
      low_stock_count: number;
      out_of_stock_count: number;
    };
    items: ReportStockItem[];
  };
  lowStockAlerts: LowStockAlertItem[];
  salesPerformance: {
    series: {
      period_label: string;
      order_count: number;
      units_sold: number;
      revenue: number;
      cogs: number;
      gross_profit: number;
    }[];
    last30Days: {
      date: string;
      label: string;
      order_count: number;
      units_sold: number;
      revenue: number;
      gross_profit: number;
    }[];
    topProducts: {
      id: number;
      sku: string;
      name: string;
      category_name: string;
      units_sold: number;
      revenue: number;
      cogs: number;
      gross_profit: number;
    }[];
  };
  purchaseSummary: {
    summary: {
      total_orders: number;
      received_orders: number;
      pending_orders: number;
      total_units: number;
      total_spend: number;
      received_spend: number;
      pending_value: number;
    };
    orders: {
      id: number;
      po_number: string;
      supplier_id: number;
      supplier_name: string;
      created_by_name: string;
      total_amount: number;
      status: 'received' | 'pending';
      notes: string;
      purchase_date: string;
      total_units: number;
    }[];
  };
  supplierPerformance: {
    id: number;
    name: string;
    contact_person: string;
    phone: string;
    linked_skus: number;
    total_orders: number;
    received_orders: number;
    pending_orders: number;
    total_spend: number;
    avg_order_value: number;
    last_order_date: string | null;
  }[];
  financialStatement: {
    gross_sales: number;
    discounts_given: number;
    net_sales_revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
    other_income: number;
    operating_expenses: number;
    inventory_purchases: number;
    net_profit: number;
    net_margin_pct: number;
    expense_breakdown: { category: string; total: number }[];
  };
}

export type NavSection =
  | 'overview'
  | 'products'
  | 'suppliers'
  | 'purchases'
  | 'sales'
  | 'employees'
  | 'finances'
  | 'reports'
  | 'academic';
