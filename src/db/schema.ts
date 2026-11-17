import { relations } from 'drizzle-orm';
import { doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().default(''),
  address: text('address').notNull().default(''),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  costPrice: doublePrecision('cost_price').notNull().default(0),
  sellingPrice: doublePrecision('selling_price').notNull().default(0),
  stockQty: integer('stock_qty').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(10),
  unit: text('unit').notNull().default('pcs'),
  warehouseLocation: text('warehouse_location').notNull().default('Aisle A-01'),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  status: text('status').notNull().default('received'),
  notes: text('notes').notNull().default(''),
  purchaseDate: timestamp('purchase_date', { mode: 'string' }).defaultNow().notNull(),
});

export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id')
    .references(() => purchases.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: doublePrecision('unit_cost').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull().default(''),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  subtotal: doublePrecision('subtotal').notNull().default(0),
  discount: doublePrecision('discount').notNull().default(0),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('Cash'),
  saleDate: timestamp('sale_date', { mode: 'string' }).defaultNow().notNull(),
});

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .references(() => sales.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  costPrice: doublePrecision('cost_price').notNull(),
  subtotal: doublePrecision('subtotal').notNull(),
});

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  empCode: text('emp_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().default(''),
  roleTitle: text('role_title').notNull(),
  department: text('department').notNull(),
  salary: doublePrecision('salary').notNull().default(0),
  status: text('status').notNull().default('Active'),
  joinedDate: text('joined_date').notNull(),
});

export const financialRecords = pgTable('financial_records', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  referenceCode: text('reference_code').notNull().default(''),
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  recordDate: timestamp('record_date', { mode: 'string' }).defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  changeQty: integer('change_qty').notNull(),
  type: text('type').notNull(),
  reference: text('reference').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

// --- RELATIONS ---

export const usersRelations = relations(users, ({ many }) => ({
  purchases: many(purchases),
  sales: many(sales),
  financialRecords: many(financialRecords),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchases: many(purchases),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  purchaseItems: many(purchaseItems),
  saleItems: many(saleItems),
  stockMovements: many(stockMovements),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  creator: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  cashier: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const financialRecordsRelations = relations(financialRecords, ({ one }) => ({
  creator: one(users, {
    fields: [financialRecords.createdBy],
    references: [users.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
}));
