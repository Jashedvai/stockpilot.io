import 'dotenv/config';
import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  DomainError,
  adjustProductStock,
  createCategory,
  createEmployee,
  createFinance,
  createProduct,
  createPurchase,
  createSale,
  createSupplier,
  deleteEmployee,
  deleteFinance,
  deleteProduct,
  deleteSupplier,
  getDashboardData,
  getReportsData,
  listCategories,
  listEmployees,
  listFinances,
  listProducts,
  listPurchases,
  listSales,
  listStockMovements,
  listSuppliers,
  receivePurchase,
  updateEmployee,
  updateProduct,
  updateSupplier,
} from './src/db/queries.ts';

const app = express();
app.use(express.json());

function handleRouteError(res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(fallbackMessage, err);
  const message = err instanceof Error ? err.message : fallbackMessage;
  res.status(500).json({ error: message || fallbackMessage });
}

// --- AUTH ROUTES ---

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// --- DASHBOARD OVERVIEW ---

app.get('/api/dashboard', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getDashboardData();
    res.json(data);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load dashboard.');
  }
});

// --- CATEGORIES ---

app.get('/api/categories', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listCategories();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load categories.');
  }
});

app.post('/api/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  try {
    const created = await createCategory(String(name).trim(), String(description || '').trim());
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to create category.');
  }
});

// --- PRODUCTS & STOCK ---

app.get('/api/products', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listProducts();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load products.');
  }
});

app.post('/api/products', requireAuth, async (req: AuthRequest, res: Response) => {
  const {
    sku,
    name,
    category_id,
    supplier_id,
    cost_price,
    selling_price,
    stock_qty,
    reorder_level,
    unit,
    warehouse_location,
  } = req.body || {};

  if (!sku || !name || !category_id || !supplier_id) {
    res.status(400).json({ error: 'SKU, product name, category, and supplier are required.' });
    return;
  }

  try {
    const created = await createProduct({
      sku: String(sku),
      name: String(name),
      category_id: Number(category_id),
      supplier_id: Number(supplier_id),
      cost_price: Number(cost_price) || 0,
      selling_price: Number(selling_price) || 0,
      stock_qty: Number(stock_qty) || 0,
      reorder_level: Number(reorder_level) || 5,
      unit: String(unit || 'pcs'),
      warehouse_location: String(warehouse_location || 'Aisle A-01'),
    });
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to create product.');
  }
});

app.put('/api/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const {
    sku,
    name,
    category_id,
    supplier_id,
    cost_price,
    selling_price,
    stock_qty,
    reorder_level,
    unit,
    warehouse_location,
  } = req.body || {};

  try {
    const updated = await updateProduct(id, {
      sku: String(sku),
      name: String(name),
      category_id: Number(category_id),
      supplier_id: Number(supplier_id),
      cost_price: Number(cost_price) || 0,
      selling_price: Number(selling_price) || 0,
      stock_qty: stock_qty !== undefined ? Number(stock_qty) : undefined,
      reorder_level: Number(reorder_level) || 0,
      unit: String(unit || 'pcs'),
      warehouse_location: String(warehouse_location || 'Aisle A-01'),
    });
    res.json(updated);
  } catch (err) {
    handleRouteError(res, err, 'Failed to update product.');
  }
});

app.post('/api/products/:id/adjust', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { delta, note } = req.body || {};
  const change = Number(delta);
  if (!Number.isInteger(change) || change === 0) {
    res.status(400).json({ error: 'Non-zero integer stock delta is required.' });
    return;
  }

  try {
    const updated = await adjustProductStock(id, change, String(note || 'Manual stock adjustment'));
    res.json(updated);
  } catch (err) {
    handleRouteError(res, err, 'Failed to adjust stock.');
  }
});

app.delete('/api/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const result = await deleteProduct(id);
    res.json(result);
  } catch (err) {
    handleRouteError(res, err, 'Failed to delete product.');
  }
});

app.get('/api/stock-movements', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listStockMovements();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load stock movements.');
  }
});

// --- SUPPLIERS ---

app.get('/api/suppliers', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listSuppliers();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load suppliers.');
  }
});

app.post('/api/suppliers', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, contact_person, phone, email, address } = req.body || {};
  if (!name || !contact_person || !phone) {
    res.status(400).json({ error: 'Supplier name, contact person, and phone are required.' });
    return;
  }
  try {
    const created = await createSupplier({
      name: String(name),
      contact_person: String(contact_person),
      phone: String(phone),
      email: String(email || ''),
      address: String(address || ''),
    });
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to create supplier.');
  }
});

app.put('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { name, contact_person, phone, email, address } = req.body || {};
  if (!name || !contact_person || !phone) {
    res.status(400).json({ error: 'Supplier name, contact person, and phone are required.' });
    return;
  }
  try {
    const updated = await updateSupplier(id, {
      name: String(name),
      contact_person: String(contact_person),
      phone: String(phone),
      email: String(email || ''),
      address: String(address || ''),
    });
    res.json(updated);
  } catch (err) {
    handleRouteError(res, err, 'Failed to update supplier.');
  }
});

app.delete('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const result = await deleteSupplier(id);
    res.json(result);
  } catch (err) {
    handleRouteError(res, err, 'Failed to delete supplier.');
  }
});

// --- PURCHASES (STOCK-IN) ---

app.get('/api/purchases', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listPurchases();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load purchases.');
  }
});

app.post('/api/purchases', requireAuth, async (req: AuthRequest, res: Response) => {
  const { supplier_id, status, notes, items } = req.body || {};
  if (!supplier_id || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Supplier and at least one line item are required.' });
    return;
  }

  try {
    const created = await createPurchase(req.user!.id, {
      supplier_id: Number(supplier_id),
      status: status === 'pending' ? 'pending' : 'received',
      notes: String(notes || ''),
      items,
    });
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to create purchase order.');
  }
});

app.patch('/api/purchases/:id/receive', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const result = await receivePurchase(id, req.user!.id);
    res.json(result);
  } catch (err) {
    handleRouteError(res, err, 'Failed to receive purchase order.');
  }
});

// --- SALES & INVOICING (STOCK-OUT) ---

app.get('/api/sales', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listSales();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load sales.');
  }
});

app.post('/api/sales', requireAuth, async (req: AuthRequest, res: Response) => {
  const { customer_name, customer_phone, discount, payment_method, items } = req.body || {};
  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Customer name and at least one product item are required.' });
    return;
  }

  try {
    const created = await createSale(req.user!.id, {
      customer_name: String(customer_name),
      customer_phone: String(customer_phone || ''),
      discount: Number(discount) || 0,
      payment_method: String(payment_method || 'Cash'),
      items,
    });
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to process sale.');
  }
});

// --- EMPLOYEES ---

app.get('/api/employees', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listEmployees();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load employees.');
  }
});

app.post('/api/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  const { emp_code, full_name, email, phone, role_title, department, salary, status, joined_date } = req.body || {};
  if (!emp_code || !full_name || !email || !role_title || !department) {
    res.status(400).json({ error: 'Employee code, name, email, role, and department are required.' });
    return;
  }

  try {
    const created = await createEmployee({
      emp_code: String(emp_code),
      full_name: String(full_name),
      email: String(email),
      phone: String(phone || ''),
      role_title: String(role_title),
      department: String(department),
      salary: Number(salary) || 0,
      status: String(status || 'Active'),
      joined_date: String(joined_date || new Date().toISOString().slice(0, 10)),
    });
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to create employee.');
  }
});

app.put('/api/employees/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { emp_code, full_name, email, phone, role_title, department, salary, status, joined_date } = req.body || {};
  try {
    const updated = await updateEmployee(id, {
      emp_code: String(emp_code),
      full_name: String(full_name),
      email: String(email),
      phone: String(phone || ''),
      role_title: String(role_title),
      department: String(department),
      salary: Number(salary) || 0,
      status: String(status || 'Active'),
      joined_date: String(joined_date || new Date().toISOString().slice(0, 10)),
    });
    res.json(updated);
  } catch (err) {
    handleRouteError(res, err, 'Failed to update employee.');
  }
});

app.delete('/api/employees/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const result = await deleteEmployee(id);
    res.json(result);
  } catch (err) {
    handleRouteError(res, err, 'Failed to delete employee.');
  }
});

// --- FINANCIAL RECORDS ---

app.get('/api/finances', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await listFinances();
    res.json(rows);
  } catch (err) {
    handleRouteError(res, err, 'Failed to load financial records.');
  }
});

app.post('/api/finances', requireAuth, async (req: AuthRequest, res: Response) => {
  const { type, category, reference_code, description, amount, record_date } = req.body || {};
  if ((type !== 'Income' && type !== 'Expense') || !category || !description || Number(amount) <= 0) {
    res.status(400).json({ error: 'Valid type, category, description, and positive amount are required.' });
    return;
  }

  try {
    const created = await createFinance(req.user!.id, {
      type,
      category: String(category),
      reference_code: reference_code ? String(reference_code) : undefined,
      description: String(description),
      amount: Number(amount),
      record_date: record_date ? String(record_date) : undefined,
    });
    res.status(201).json(created);
  } catch (err) {
    handleRouteError(res, err, 'Failed to create financial record.');
  }
});

app.delete('/api/finances/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  try {
    const result = await deleteFinance(id);
    res.json(result);
  } catch (err) {
    handleRouteError(res, err, 'Failed to delete financial record.');
  }
});

// --- REPORTING & ANALYTICS ---

app.get('/api/reports', requireAuth, async (req: AuthRequest, res: Response) => {
  const period = ['daily', 'weekly', 'monthly'].includes(String(req.query.period))
    ? (String(req.query.period) as 'daily' | 'weekly' | 'monthly')
    : 'daily';
  const startDate = req.query.start_date ? String(req.query.start_date).trim() : '';
  const endDate = req.query.end_date ? String(req.query.end_date).trim() : '';
  const categoryId =
    req.query.category_id && req.query.category_id !== 'all' ? Number(req.query.category_id) : null;
  const supplierId =
    req.query.supplier_id && req.query.supplier_id !== 'all' ? Number(req.query.supplier_id) : null;

  try {
    const report = await getReportsData({
      period,
      startDate,
      endDate,
      categoryId,
      supplierId,
    });
    res.json(report);
  } catch (err) {
    handleRouteError(res, err, 'Failed to generate reports.');
  }
});

// --- SERVER STARTUP ---

async function startServer() {
  const port = 3000;
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`StockPilot server running on http://localhost:${port}`);
  });
}

startServer();
