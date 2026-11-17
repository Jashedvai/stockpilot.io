import { asc, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  categories,
  employees,
  financialRecords,
  products,
  purchaseItems,
  purchases,
  saleItems,
  sales,
  stockMovements,
  suppliers,
  users,
} from './schema.ts';

export class DomainError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function dbFailure(action: string, error: unknown): never {
  if (error instanceof DomainError) {
    throw error;
  }
  console.error(`Database error (${action}):`, error);
  throw new Error(`Unable to ${action}. Please try again later.`, { cause: error });
}

function nowTimestampStr(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function toIsoDate(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function getWeekBucket(isoDate: string): string {
  // Match SQLite strftime('%Y-W%W', date) semantics: Sunday-first week 00..53
  const [yStr, mStr, dStr] = isoDate.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jan1 = new Date(Date.UTC(y, 0, 1));
  const dayOfYear = Math.floor((dt.getTime() - jan1.getTime()) / 86400000);
  const jan1Weekday = jan1.getUTCDay(); // 0=Sun..6=Sat
  const daysSinceFirstSunday = dayOfYear - ((7 - jan1Weekday) % 7);
  const weekNum = daysSinceFirstSunday < 0 ? 0 : Math.floor(daysSinceFirstSunday / 7) + 1;
  return `${yStr}-W${String(weekNum).padStart(2, '0')}`;
}

function formatProductRow(
  p: typeof products.$inferSelect,
  catMap: Map<number, string>,
  supMap: Map<number, string>
) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category_id: p.categoryId,
    supplier_id: p.supplierId,
    category_name: catMap.get(p.categoryId) || 'Uncategorized',
    supplier_name: supMap.get(p.supplierId) || 'Unknown Supplier',
    cost_price: p.costPrice,
    selling_price: p.sellingPrice,
    stock_qty: p.stockQty,
    reorder_level: p.reorderLevel,
    unit: p.unit,
    warehouse_location: p.warehouseLocation,
    updated_at: p.updatedAt,
  };
}

// --- DASHBOARD ---

export async function getDashboardData() {
  try {
    const [allProds, allCats, allSups, allFinances, allSales, allPurchases, allEmps, recentMovs] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
      db.select().from(suppliers),
      db.select().from(financialRecords),
      db.select({ id: sales.id }).from(sales),
      db.select({ id: purchases.id }).from(purchases),
      db.select({ id: employees.id, status: employees.status }).from(employees),
      db.select().from(stockMovements).orderBy(desc(stockMovements.id)).limit(8),
    ]);

    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    const supMap = new Map(allSups.map((s) => [s.id, s.name]));
    const prodMap = new Map(allProds.map((p) => [p.id, p]));

    let totalUnits = 0;
    let inventoryCostValue = 0;
    let inventoryRetailValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of allProds) {
      totalUnits += p.stockQty;
      inventoryCostValue += p.stockQty * p.costPrice;
      inventoryRetailValue += p.stockQty * p.sellingPrice;
      if (p.stockQty === 0) outOfStockCount += 1;
      else if (p.stockQty <= p.reorderLevel) lowStockCount += 1;
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const finByDay = new Map<string, { income: number; expense: number }>();

    for (const f of allFinances) {
      if (f.type === 'Income') totalIncome += f.amount;
      else if (f.type === 'Expense') totalExpense += f.amount;

      const dayKey = toIsoDate(f.recordDate);
      if (dayKey) {
        const entry = finByDay.get(dayKey) || { income: 0, expense: 0 };
        if (f.type === 'Income') entry.income += f.amount;
        else if (f.type === 'Expense') entry.expense += f.amount;
        finByDay.set(dayKey, entry);
      }
    }

    const lowStockItems = allProds
      .filter((p) => p.stockQty <= p.reorderLevel)
      .sort((a, b) => a.stockQty - b.stockQty)
      .slice(0, 8)
      .map((p) => formatProductRow(p, catMap, supMap));

    const categoryBreakdown = allCats
      .map((c) => {
        const catProds = allProds.filter((p) => p.categoryId === c.id);
        return {
          category: c.name,
          product_count: catProds.length,
          units: catProds.reduce((sum, p) => sum + p.stockQty, 0),
          value: catProds.reduce((sum, p) => sum + p.stockQty * p.sellingPrice, 0),
        };
      })
      .sort((a, b) => b.value - a.value);

    const dailySeries: { day: string; income: number; expense: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoDay = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const row = finByDay.get(isoDay) || { income: 0, expense: 0 };
      dailySeries.push({ day: label, income: row.income, expense: row.expense });
    }

    const recentMovements = recentMovs.map((sm) => {
      const prod = prodMap.get(sm.productId);
      return {
        id: sm.id,
        product_id: sm.productId,
        product_name: prod?.name || 'Unknown Product',
        sku: prod?.sku || '',
        change_qty: sm.changeQty,
        type: sm.type as 'Purchase' | 'Sale' | 'Adjustment',
        reference: sm.reference,
        note: sm.note,
        created_at: sm.createdAt,
      };
    });

    return {
      kpis: {
        total_products: allProds.length,
        total_units: totalUnits,
        inventory_cost_value: inventoryCostValue,
        inventory_retail_value: inventoryRetailValue,
        out_of_stock_count: outOfStockCount,
        low_stock_count: lowStockCount,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_profit: totalIncome - totalExpense,
        sales_count: allSales.length,
        purchases_count: allPurchases.length,
        suppliers_count: allSups.length,
        active_employees_count: allEmps.filter((e) => e.status === 'Active').length,
      },
      lowStockItems,
      categoryBreakdown,
      dailySeries,
      recentMovements,
    };
  } catch (error) {
    dbFailure('load dashboard metrics', error);
  }
}

// --- CATEGORIES ---

export async function listCategories() {
  try {
    return await db.select().from(categories).orderBy(asc(categories.name));
  } catch (error) {
    dbFailure('load categories', error);
  }
}

export async function createCategory(name: string, description: string) {
  try {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);
    if (existing.length > 0) {
      throw new DomainError(409, 'Category already exists.');
    }
    const [created] = await db.insert(categories).values({ name, description }).returning();
    return created;
  } catch (error) {
    dbFailure('create category', error);
  }
}

// --- PRODUCTS & STOCK ---

export async function listProducts() {
  try {
    const [allProds, allCats, allSups] = await Promise.all([
      db.select().from(products).orderBy(desc(products.id)),
      db.select().from(categories),
      db.select().from(suppliers),
    ]);
    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    const supMap = new Map(allSups.map((s) => [s.id, s.name]));
    return allProds.map((p) => formatProductRow(p, catMap, supMap));
  } catch (error) {
    dbFailure('load products', error);
  }
}

export async function createProduct(input: {
  sku: string;
  name: string;
  category_id: number;
  supplier_id: number;
  cost_price: number;
  selling_price: number;
  stock_qty: number;
  reorder_level: number;
  unit: string;
  warehouse_location: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      const normalizedSku = input.sku.trim().toUpperCase();
      const dup = await tx.select({ id: products.id }).from(products).where(eq(products.sku, normalizedSku)).limit(1);
      if (dup.length > 0) {
        throw new DomainError(400, 'SKU already exists.');
      }

      const qty = Math.max(0, Number(input.stock_qty) || 0);
      const [created] = await tx
        .insert(products)
        .values({
          sku: normalizedSku,
          name: input.name.trim(),
          categoryId: Number(input.category_id),
          supplierId: Number(input.supplier_id),
          costPrice: Number(input.cost_price) || 0,
          sellingPrice: Number(input.selling_price) || 0,
          stockQty: qty,
          reorderLevel: Math.max(0, Number(input.reorder_level) || 5),
          unit: (input.unit || 'pcs').trim(),
          warehouseLocation: (input.warehouse_location || 'Aisle A-01').trim(),
          updatedAt: nowTimestampStr(),
        })
        .returning();

      if (qty > 0) {
        await tx.insert(stockMovements).values({
          productId: created.id,
          changeQty: qty,
          type: 'Adjustment',
          reference: 'INIT',
          note: 'Initial opening stock',
        });
      }

      const [cat] = await tx.select().from(categories).where(eq(categories.id, created.categoryId));
      const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, created.supplierId));
      return formatProductRow(
        created,
        new Map(cat ? [[cat.id, cat.name]] : []),
        new Map(sup ? [[sup.id, sup.name]] : [])
      );
    });
  } catch (error) {
    dbFailure('create product', error);
  }
}

export async function updateProduct(
  id: number,
  input: {
    sku: string;
    name: string;
    category_id: number;
    supplier_id: number;
    cost_price: number;
    selling_price: number;
    stock_qty?: number;
    reorder_level: number;
    unit: string;
    warehouse_location: string;
  }
) {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id));
      if (!existing) {
        throw new DomainError(404, 'Product not found.');
      }

      const nextQty = Math.max(0, Number(input.stock_qty ?? existing.stockQty));
      const diff = nextQty - existing.stockQty;

      const [updated] = await tx
        .update(products)
        .set({
          sku: input.sku.trim().toUpperCase(),
          name: input.name.trim(),
          categoryId: Number(input.category_id),
          supplierId: Number(input.supplier_id),
          costPrice: Number(input.cost_price) || 0,
          sellingPrice: Number(input.selling_price) || 0,
          stockQty: nextQty,
          reorderLevel: Math.max(0, Number(input.reorder_level) || 0),
          unit: (input.unit || 'pcs').trim(),
          warehouseLocation: (input.warehouse_location || 'Aisle A-01').trim(),
          updatedAt: nowTimestampStr(),
        })
        .where(eq(products.id, id))
        .returning();

      if (diff !== 0) {
        await tx.insert(stockMovements).values({
          productId: id,
          changeQty: diff,
          type: 'Adjustment',
          reference: 'EDIT',
          note: 'Updated via product editor',
        });
      }

      const [cat] = await tx.select().from(categories).where(eq(categories.id, updated.categoryId));
      const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, updated.supplierId));
      return formatProductRow(
        updated,
        new Map(cat ? [[cat.id, cat.name]] : []),
        new Map(sup ? [[sup.id, sup.name]] : [])
      );
    });
  } catch (error) {
    dbFailure('update product', error);
  }
}

export async function adjustProductStock(id: number, delta: number, note: string) {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id));
      if (!existing) {
        throw new DomainError(404, 'Product not found.');
      }
      const newQty = existing.stockQty + delta;
      if (newQty < 0) {
        throw new DomainError(400, 'Stock quantity cannot go below zero.');
      }

      const [updated] = await tx
        .update(products)
        .set({ stockQty: newQty, updatedAt: nowTimestampStr() })
        .where(eq(products.id, id))
        .returning();

      await tx.insert(stockMovements).values({
        productId: id,
        changeQty: delta,
        type: 'Adjustment',
        reference: 'MANUAL',
        note: (note || 'Manual stock adjustment').trim(),
      });

      const [cat] = await tx.select().from(categories).where(eq(categories.id, updated.categoryId));
      const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, updated.supplierId));
      return formatProductRow(
        updated,
        new Map(cat ? [[cat.id, cat.name]] : []),
        new Map(sup ? [[sup.id, sup.name]] : [])
      );
    });
  } catch (error) {
    dbFailure('adjust product stock', error);
  }
}

export async function deleteProduct(id: number) {
  try {
    const [poLink] = await db.select({ id: purchaseItems.id }).from(purchaseItems).where(eq(purchaseItems.productId, id)).limit(1);
    const [saleLink] = await db.select({ id: saleItems.id }).from(saleItems).where(eq(saleItems.productId, id)).limit(1);
    if (poLink || saleLink) {
      throw new DomainError(409, 'Cannot delete product linked to existing purchase or sale invoices.');
    }

    const deleted = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (deleted.length === 0) {
      throw new DomainError(404, 'Product not found.');
    }
    return { ok: true };
  } catch (error) {
    dbFailure('delete product', error);
  }
}

export async function listStockMovements() {
  try {
    const [movs, prods] = await Promise.all([
      db.select().from(stockMovements).orderBy(desc(stockMovements.id)).limit(60),
      db.select({ id: products.id, name: products.name, sku: products.sku }).from(products),
    ]);
    const prodMap = new Map(prods.map((p) => [p.id, p]));
    return movs.map((sm) => {
      const p = prodMap.get(sm.productId);
      return {
        id: sm.id,
        product_id: sm.productId,
        product_name: p?.name || 'Unknown Product',
        sku: p?.sku || '',
        change_qty: sm.changeQty,
        type: sm.type,
        reference: sm.reference,
        note: sm.note,
        created_at: sm.createdAt,
      };
    });
  } catch (error) {
    dbFailure('load stock movements', error);
  }
}

// --- SUPPLIERS ---

export async function listSuppliers() {
  try {
    const [allSups, allProds, allPOs] = await Promise.all([
      db.select().from(suppliers).orderBy(desc(suppliers.id)),
      db.select({ id: products.id, supplierId: products.supplierId }).from(products),
      db.select({ id: purchases.id, supplierId: purchases.supplierId, totalAmount: purchases.totalAmount }).from(purchases),
    ]);

    return allSups.map((s) => {
      const prodCount = allProds.filter((p) => p.supplierId === s.id).length;
      const supPOs = allPOs.filter((po) => po.supplierId === s.id);
      const totalSuppliedValue = supPOs.reduce((sum, po) => sum + po.totalAmount, 0);
      return {
        id: s.id,
        name: s.name,
        contact_person: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        created_at: s.createdAt,
        product_count: prodCount,
        order_count: supPOs.length,
        total_supplied_value: totalSuppliedValue,
      };
    });
  } catch (error) {
    dbFailure('load suppliers', error);
  }
}

export async function createSupplier(input: {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}) {
  try {
    const [created] = await db
      .insert(suppliers)
      .values({
        name: input.name.trim(),
        contactPerson: input.contact_person.trim(),
        phone: input.phone.trim(),
        email: (input.email || '').trim(),
        address: (input.address || '').trim(),
      })
      .returning();
    return {
      id: created.id,
      name: created.name,
      contact_person: created.contactPerson,
      phone: created.phone,
      email: created.email,
      address: created.address,
      created_at: created.createdAt,
    };
  } catch (error) {
    dbFailure('create supplier', error);
  }
}

export async function updateSupplier(
  id: number,
  input: {
    name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
  }
) {
  try {
    const [updated] = await db
      .update(suppliers)
      .set({
        name: input.name.trim(),
        contactPerson: input.contact_person.trim(),
        phone: input.phone.trim(),
        email: (input.email || '').trim(),
        address: (input.address || '').trim(),
      })
      .where(eq(suppliers.id, id))
      .returning();

    if (!updated) {
      throw new DomainError(404, 'Supplier not found.');
    }

    return {
      id: updated.id,
      name: updated.name,
      contact_person: updated.contactPerson,
      phone: updated.phone,
      email: updated.email,
      address: updated.address,
      created_at: updated.createdAt,
    };
  } catch (error) {
    dbFailure('update supplier', error);
  }
}

export async function deleteSupplier(id: number) {
  try {
    const [prodLink] = await db.select({ id: products.id }).from(products).where(eq(products.supplierId, id)).limit(1);
    const [poLink] = await db.select({ id: purchases.id }).from(purchases).where(eq(purchases.supplierId, id)).limit(1);
    if (prodLink || poLink) {
      throw new DomainError(409, 'Cannot delete supplier referenced by existing products or purchase orders.');
    }

    const deleted = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
    if (deleted.length === 0) {
      throw new DomainError(404, 'Supplier not found.');
    }
    return { ok: true };
  } catch (error) {
    dbFailure('delete supplier', error);
  }
}

// --- PURCHASES ---

export async function listPurchases() {
  try {
    const [allPOs, allItems, allSups, allUsers, allProds] = await Promise.all([
      db.select().from(purchases).orderBy(desc(purchases.id)),
      db.select().from(purchaseItems),
      db.select().from(suppliers),
      db.select({ id: users.id, fullName: users.fullName }).from(users),
      db.select({ id: products.id, name: products.name, sku: products.sku }).from(products),
    ]);

    const supMap = new Map(allSups.map((s) => [s.id, s.name]));
    const userMap = new Map(allUsers.map((u) => [u.id, u.fullName]));
    const prodMap = new Map(allProds.map((p) => [p.id, p]));

    return allPOs.map((po) => ({
      id: po.id,
      po_number: po.poNumber,
      supplier_id: po.supplierId,
      supplier_name: supMap.get(po.supplierId) || 'Unknown Supplier',
      user_id: po.userId,
      created_by_name: userMap.get(po.userId) || 'System',
      total_amount: po.totalAmount,
      status: po.status,
      notes: po.notes,
      purchase_date: po.purchaseDate,
      items: allItems
        .filter((item) => item.purchaseId === po.id)
        .map((item) => {
          const prod = prodMap.get(item.productId);
          return {
            id: item.id,
            purchase_id: item.purchaseId,
            product_id: item.productId,
            product_name: prod?.name || 'Unknown Product',
            sku: prod?.sku || '',
            quantity: item.quantity,
            unit_cost: item.unitCost,
            subtotal: item.subtotal,
          };
        }),
    }));
  } catch (error) {
    dbFailure('load purchases', error);
  }
}

export async function createPurchase(
  userId: number,
  input: {
    supplier_id: number;
    status?: string;
    notes?: string;
    items: { product_id: number; quantity: number; unit_cost: number }[];
  }
) {
  try {
    const poStatus = input.status === 'pending' ? 'pending' : 'received';
    const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    return await db.transaction(async (tx) => {
      let totalAmount = 0;
      const normalizedItems = input.items.map((item) => {
        const qty = Math.max(1, Number(item.quantity));
        const unitCost = Math.max(0, Number(item.unit_cost));
        const subtotal = qty * unitCost;
        totalAmount += subtotal;
        return { product_id: Number(item.product_id), quantity: qty, unit_cost: unitCost, subtotal };
      });

      const [createdPo] = await tx
        .insert(purchases)
        .values({
          poNumber,
          supplierId: Number(input.supplier_id),
          userId,
          totalAmount,
          status: poStatus,
          notes: (input.notes || '').trim(),
          purchaseDate: nowTimestampStr(),
        })
        .returning();

      for (const item of normalizedItems) {
        await tx.insert(purchaseItems).values({
          purchaseId: createdPo.id,
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: item.unit_cost,
          subtotal: item.subtotal,
        });

        if (poStatus === 'received') {
          const [prod] = await tx.select({ stockQty: products.stockQty }).from(products).where(eq(products.id, item.product_id));
          if (!prod) {
            throw new DomainError(400, 'Selected product does not exist.');
          }
          await tx
            .update(products)
            .set({
              stockQty: prod.stockQty + item.quantity,
              costPrice: item.unit_cost,
              updatedAt: nowTimestampStr(),
            })
            .where(eq(products.id, item.product_id));

          await tx.insert(stockMovements).values({
            productId: item.product_id,
            changeQty: item.quantity,
            type: 'Purchase',
            reference: poNumber,
            note: 'Purchase order received',
          });
        }
      }

      if (poStatus === 'received') {
        const [sup] = await tx.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, Number(input.supplier_id)));
        await tx.insert(financialRecords).values({
          type: 'Expense',
          category: 'Inventory Purchase',
          referenceCode: poNumber,
          description: `Stock procurement from ${sup?.name || 'Supplier'}`,
          amount: totalAmount,
          createdBy: userId,
        });
      }

      return {
        id: createdPo.id,
        po_number: createdPo.poNumber,
        supplier_id: createdPo.supplierId,
        user_id: createdPo.userId,
        total_amount: createdPo.totalAmount,
        status: createdPo.status,
        notes: createdPo.notes,
        purchase_date: createdPo.purchaseDate,
      };
    });
  } catch (error) {
    dbFailure('create purchase order', error);
  }
}

export async function receivePurchase(id: number, userId: number) {
  try {
    return await db.transaction(async (tx) => {
      const [po] = await tx.select().from(purchases).where(eq(purchases.id, id));
      if (!po) {
        throw new DomainError(404, 'Purchase order not found.');
      }
      if (po.status === 'received') {
        throw new DomainError(400, 'Purchase order already received.');
      }

      await tx.update(purchases).set({ status: 'received' }).where(eq(purchases.id, id));
      const items = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));

      for (const item of items) {
        const [prod] = await tx.select({ stockQty: products.stockQty }).from(products).where(eq(products.id, item.productId));
        if (prod) {
          await tx
            .update(products)
            .set({
              stockQty: prod.stockQty + item.quantity,
              costPrice: item.unitCost,
              updatedAt: nowTimestampStr(),
            })
            .where(eq(products.id, item.productId));
        }

        await tx.insert(stockMovements).values({
          productId: item.productId,
          changeQty: item.quantity,
          type: 'Purchase',
          reference: po.poNumber,
          note: 'Pending PO marked received',
        });
      }

      const [sup] = await tx.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, po.supplierId));
      await tx.insert(financialRecords).values({
        type: 'Expense',
        category: 'Inventory Purchase',
        referenceCode: po.poNumber,
        description: `Stock procurement from ${sup?.name || 'Supplier'}`,
        amount: po.totalAmount,
        createdBy: userId,
      });

      return { ok: true };
    });
  } catch (error) {
    dbFailure('mark purchase order as received', error);
  }
}

// --- SALES ---

export async function listSales() {
  try {
    const [allSales, allItems, allUsers, allProds] = await Promise.all([
      db.select().from(sales).orderBy(desc(sales.id)),
      db.select().from(saleItems),
      db.select({ id: users.id, fullName: users.fullName }).from(users),
      db.select({ id: products.id, name: products.name, sku: products.sku }).from(products),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u.fullName]));
    const prodMap = new Map(allProds.map((p) => [p.id, p]));

    return allSales.map((s) => ({
      id: s.id,
      invoice_number: s.invoiceNumber,
      customer_name: s.customerName,
      customer_phone: s.customerPhone,
      user_id: s.userId,
      cashier_name: userMap.get(s.userId) || 'Cashier',
      subtotal: s.subtotal,
      discount: s.discount,
      total_amount: s.totalAmount,
      payment_method: s.paymentMethod,
      sale_date: s.saleDate,
      items: allItems
        .filter((item) => item.saleId === s.id)
        .map((item) => {
          const prod = prodMap.get(item.productId);
          return {
            id: item.id,
            sale_id: item.saleId,
            product_id: item.productId,
            product_name: prod?.name || 'Unknown Product',
            sku: prod?.sku || '',
            quantity: item.quantity,
            unit_price: item.unitPrice,
            cost_price: item.costPrice,
            subtotal: item.subtotal,
          };
        }),
    }));
  } catch (error) {
    dbFailure('load sales', error);
  }
}

export async function createSale(
  userId: number,
  input: {
    customer_name: string;
    customer_phone?: string;
    discount?: number;
    payment_method?: string;
    items: { product_id: number; quantity: number; unit_price?: number }[];
  }
) {
  try {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const custName = input.customer_name.trim();

    return await db.transaction(async (tx) => {
      let subtotal = 0;
      const preparedItems: {
        product_id: number;
        product_name: string;
        sku: string;
        current_stock: number;
        quantity: number;
        unit_price: number;
        cost_price: number;
        subtotal: number;
      }[] = [];

      for (const rawItem of input.items) {
        const [product] = await tx.select().from(products).where(eq(products.id, Number(rawItem.product_id)));
        if (!product) {
          throw new DomainError(400, 'Selected product does not exist.');
        }
        const qty = Math.max(1, Number(rawItem.quantity));
        if (product.stockQty < qty) {
          throw new DomainError(400, `Insufficient stock for ${product.name} (Available: ${product.stockQty}).`);
        }

        const unitPrice = rawItem.unit_price !== undefined ? Number(rawItem.unit_price) : product.sellingPrice;
        const lineSubtotal = qty * unitPrice;
        subtotal += lineSubtotal;

        preparedItems.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          current_stock: product.stockQty,
          quantity: qty,
          unit_price: unitPrice,
          cost_price: product.costPrice,
          subtotal: lineSubtotal,
        });
      }

      const disc = Math.max(0, Number(input.discount) || 0);
      const totalAmount = Math.max(0, subtotal - disc);

      const [createdSale] = await tx
        .insert(sales)
        .values({
          invoiceNumber,
          customerName: custName,
          customerPhone: (input.customer_phone || '').trim(),
          userId,
          subtotal,
          discount: disc,
          totalAmount,
          paymentMethod: String(input.payment_method || 'Cash'),
          saleDate: nowTimestampStr(),
        })
        .returning();

      const insertedItems = [];
      for (const item of preparedItems) {
        const [si] = await tx
          .insert(saleItems)
          .values({
            saleId: createdSale.id,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            costPrice: item.cost_price,
            subtotal: item.subtotal,
          })
          .returning();

        insertedItems.push({
          id: si.id,
          sale_id: si.saleId,
          product_id: si.productId,
          product_name: item.product_name,
          sku: item.sku,
          quantity: si.quantity,
          unit_price: si.unitPrice,
          cost_price: si.costPrice,
          subtotal: si.subtotal,
        });

        await tx
          .update(products)
          .set({
            stockQty: item.current_stock - item.quantity,
            updatedAt: nowTimestampStr(),
          })
          .where(eq(products.id, item.product_id));

        await tx.insert(stockMovements).values({
          productId: item.product_id,
          changeQty: -item.quantity,
          type: 'Sale',
          reference: invoiceNumber,
          note: `Sold to ${custName}`,
        });
      }

      await tx.insert(financialRecords).values({
        type: 'Income',
        category: 'Product Sales',
        referenceCode: invoiceNumber,
        description: `Sales invoice to ${custName}`,
        amount: totalAmount,
        createdBy: userId,
      });

      const [cashier] = await tx.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));

      return {
        id: createdSale.id,
        invoice_number: createdSale.invoiceNumber,
        customer_name: createdSale.customerName,
        customer_phone: createdSale.customerPhone,
        user_id: createdSale.userId,
        cashier_name: cashier?.fullName || 'Cashier',
        subtotal: createdSale.subtotal,
        discount: createdSale.discount,
        total_amount: createdSale.totalAmount,
        payment_method: createdSale.paymentMethod,
        sale_date: createdSale.saleDate,
        items: insertedItems,
      };
    });
  } catch (error) {
    dbFailure('process sale', error);
  }
}

// --- EMPLOYEES ---

export async function listEmployees() {
  try {
    const rows = await db.select().from(employees).orderBy(desc(employees.id));
    return rows.map((e) => ({
      id: e.id,
      emp_code: e.empCode,
      full_name: e.fullName,
      email: e.email,
      phone: e.phone,
      role_title: e.roleTitle,
      department: e.department,
      salary: e.salary,
      status: e.status,
      joined_date: e.joinedDate,
    }));
  } catch (error) {
    dbFailure('load employees', error);
  }
}

export async function createEmployee(input: {
  emp_code: string;
  full_name: string;
  email: string;
  phone?: string;
  role_title: string;
  department: string;
  salary?: number;
  status?: string;
  joined_date?: string;
}) {
  try {
    const code = input.emp_code.trim().toUpperCase();
    const email = input.email.trim().toLowerCase();
    const dupCode = await db.select({ id: employees.id }).from(employees).where(eq(employees.empCode, code)).limit(1);
    const dupEmail = await db.select({ id: employees.id }).from(employees).where(eq(employees.email, email)).limit(1);
    if (dupCode.length > 0 || dupEmail.length > 0) {
      throw new DomainError(400, 'Duplicate employee code or email.');
    }

    const [created] = await db
      .insert(employees)
      .values({
        empCode: code,
        fullName: input.full_name.trim(),
        email,
        phone: (input.phone || '').trim(),
        roleTitle: input.role_title.trim(),
        department: input.department.trim(),
        salary: Number(input.salary) || 0,
        status: String(input.status || 'Active'),
        joinedDate: String(input.joined_date || new Date().toISOString().slice(0, 10)),
      })
      .returning();

    return {
      id: created.id,
      emp_code: created.empCode,
      full_name: created.fullName,
      email: created.email,
      phone: created.phone,
      role_title: created.roleTitle,
      department: created.department,
      salary: created.salary,
      status: created.status,
      joined_date: created.joinedDate,
    };
  } catch (error) {
    dbFailure('create employee', error);
  }
}

export async function updateEmployee(
  id: number,
  input: {
    emp_code: string;
    full_name: string;
    email: string;
    phone?: string;
    role_title: string;
    department: string;
    salary?: number;
    status?: string;
    joined_date?: string;
  }
) {
  try {
    const [updated] = await db
      .update(employees)
      .set({
        empCode: input.emp_code.trim().toUpperCase(),
        fullName: input.full_name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: (input.phone || '').trim(),
        roleTitle: input.role_title.trim(),
        department: input.department.trim(),
        salary: Number(input.salary) || 0,
        status: String(input.status || 'Active'),
        joinedDate: String(input.joined_date || new Date().toISOString().slice(0, 10)),
      })
      .where(eq(employees.id, id))
      .returning();

    if (!updated) {
      throw new DomainError(404, 'Employee not found.');
    }

    return {
      id: updated.id,
      emp_code: updated.empCode,
      full_name: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role_title: updated.roleTitle,
      department: updated.department,
      salary: updated.salary,
      status: updated.status,
      joined_date: updated.joinedDate,
    };
  } catch (error) {
    dbFailure('update employee', error);
  }
}

export async function deleteEmployee(id: number) {
  try {
    const deleted = await db.delete(employees).where(eq(employees.id, id)).returning({ id: employees.id });
    if (deleted.length === 0) {
      throw new DomainError(404, 'Employee not found.');
    }
    return { ok: true };
  } catch (error) {
    dbFailure('delete employee', error);
  }
}

// --- FINANCIAL RECORDS ---

export async function listFinances() {
  try {
    const [rows, allUsers] = await Promise.all([
      db.select().from(financialRecords).orderBy(desc(financialRecords.id)),
      db.select({ id: users.id, fullName: users.fullName }).from(users),
    ]);
    const userMap = new Map(allUsers.map((u) => [u.id, u.fullName]));
    return rows.map((f) => ({
      id: f.id,
      type: f.type,
      category: f.category,
      reference_code: f.referenceCode,
      description: f.description,
      amount: f.amount,
      record_date: f.recordDate,
      created_by_name: f.createdBy ? userMap.get(f.createdBy) || 'System' : 'System',
    }));
  } catch (error) {
    dbFailure('load financial records', error);
  }
}

export async function createFinance(
  userId: number,
  input: {
    type: 'Income' | 'Expense';
    category: string;
    reference_code?: string;
    description: string;
    amount: number;
    record_date?: string;
  }
) {
  try {
    const [created] = await db
      .insert(financialRecords)
      .values({
        type: input.type,
        category: input.category.trim(),
        referenceCode: (input.reference_code || `FIN-${Date.now().toString().slice(-4)}`).trim(),
        description: input.description.trim(),
        amount: Number(input.amount),
        recordDate: input.record_date || nowTimestampStr(),
        createdBy: userId,
      })
      .returning();

    return {
      id: created.id,
      type: created.type,
      category: created.category,
      reference_code: created.referenceCode,
      description: created.description,
      amount: created.amount,
      record_date: created.recordDate,
    };
  } catch (error) {
    dbFailure('create financial record', error);
  }
}

export async function deleteFinance(id: number) {
  try {
    const deleted = await db.delete(financialRecords).where(eq(financialRecords.id, id)).returning({ id: financialRecords.id });
    if (deleted.length === 0) {
      throw new DomainError(404, 'Record not found.');
    }
    return { ok: true };
  } catch (error) {
    dbFailure('delete financial record', error);
  }
}

// --- REPORTS & ANALYTICS ---

export async function getReportsData(filters: {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  categoryId: number | null;
  supplierId: number | null;
}) {
  try {
    const { period, startDate, endDate, categoryId, supplierId } = filters;

    const [allProds, allCats, allSups, allSales, allSaleItems, allPurchases, allPurchaseItems, allUsers, allFinances] =
      await Promise.all([
        db.select().from(products),
        db.select().from(categories),
        db.select().from(suppliers),
        db.select().from(sales),
        db.select().from(saleItems),
        db.select().from(purchases),
        db.select().from(purchaseItems),
        db.select({ id: users.id, fullName: users.fullName }).from(users),
        db.select().from(financialRecords),
      ]);

    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    const supMap = new Map(allSups.map((s) => [s.id, s.name]));
    const prodMap = new Map(allProds.map((p) => [p.id, p]));
    const userMap = new Map(allUsers.map((u) => [u.id, u.fullName]));

    // 1. Current Stock Levels & Low Stock Alerts
    const filteredProds = allProds
      .filter((p) => {
        if (categoryId && p.categoryId !== categoryId) return false;
        if (supplierId && p.supplierId !== supplierId) return false;
        return true;
      })
      .sort((a, b) => a.stockQty - b.stockQty || a.name.localeCompare(b.name));

    const stockItems = filteredProds.map((p) => {
      const costVal = p.stockQty * p.costPrice;
      const retailVal = p.stockQty * p.sellingPrice;
      const stockStatus: 'Optimal' | 'Low Stock' | 'Out of Stock' =
        p.stockQty === 0 ? 'Out of Stock' : p.stockQty <= p.reorderLevel ? 'Low Stock' : 'Optimal';

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category_name: catMap.get(p.categoryId) || 'Uncategorized',
        supplier_name: supMap.get(p.supplierId) || 'Unknown Supplier',
        cost_price: p.costPrice,
        selling_price: p.sellingPrice,
        stock_qty: p.stockQty,
        reorder_level: p.reorderLevel,
        unit: p.unit,
        warehouse_location: p.warehouseLocation,
        cost_valuation: costVal,
        retail_valuation: retailVal,
        stock_status: stockStatus,
      };
    });

    const stockSummary = stockItems.reduce(
      (acc, item) => {
        acc.total_skus += 1;
        acc.total_units += item.stock_qty;
        acc.cost_valuation += item.cost_valuation;
        acc.retail_valuation += item.retail_valuation;
        if (item.stock_status === 'Out of Stock') acc.out_of_stock_count += 1;
        else if (item.stock_status === 'Low Stock') acc.low_stock_count += 1;
        else acc.healthy_count += 1;
        return acc;
      },
      {
        total_skus: 0,
        total_units: 0,
        cost_valuation: 0,
        retail_valuation: 0,
        potential_margin: 0,
        healthy_count: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
      }
    );
    stockSummary.potential_margin = stockSummary.retail_valuation - stockSummary.cost_valuation;

    const lowStockAlerts = stockItems
      .filter((item) => item.stock_qty <= item.reorder_level)
      .map((item) => {
        const targetLevel = Math.max(item.reorder_level * 2, 10);
        const suggestedRestock = Math.max(targetLevel - item.stock_qty, item.reorder_level);
        return {
          ...item,
          suggested_restock_qty: suggestedRestock,
          estimated_restock_cost: Number((suggestedRestock * item.cost_price).toFixed(2)),
        };
      });

    // 2. Sales Performance (Daily, Weekly, Monthly)
    const saleItemsBySaleId = new Map<number, typeof allSaleItems>();
    for (const si of allSaleItems) {
      const list = saleItemsBySaleId.get(si.saleId) || [];
      list.push(si);
      saleItemsBySaleId.set(si.saleId, list);
    }

    const inDateRange = (dateStr: string) => {
      const d = toIsoDate(dateStr);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    };

    const getBucketLabel = (dateStr: string) => {
      const iso = toIsoDate(dateStr);
      if (period === 'monthly') return iso.slice(0, 7);
      if (period === 'weekly') return getWeekBucket(iso);
      return iso;
    };

    const seriesMap = new Map<
      string,
      {
        period_label: string;
        saleIds: Set<number>;
        units_sold: number;
        revenue: number;
        cogs: number;
        gross_profit: number;
      }
    >();

    const dateFilteredSales = allSales.filter((sa) => inDateRange(sa.saleDate));

    if (categoryId || supplierId) {
      for (const sa of dateFilteredSales) {
        const bucket = getBucketLabel(sa.saleDate);
        const items = saleItemsBySaleId.get(sa.id) || [];
        for (const si of items) {
          const prod = prodMap.get(si.productId);
          if (!prod) continue;
          if (categoryId && prod.categoryId !== categoryId) continue;
          if (supplierId && prod.supplierId !== supplierId) continue;

          const entry = seriesMap.get(bucket) || {
            period_label: bucket,
            saleIds: new Set<number>(),
            units_sold: 0,
            revenue: 0,
            cogs: 0,
            gross_profit: 0,
          };
          entry.saleIds.add(sa.id);
          const itemCogs = si.quantity * si.costPrice;
          entry.units_sold += si.quantity;
          entry.revenue += si.subtotal;
          entry.cogs += itemCogs;
          entry.gross_profit += si.subtotal - itemCogs;
          seriesMap.set(bucket, entry);
        }
      }
    } else {
      for (const sa of dateFilteredSales) {
        const bucket = getBucketLabel(sa.saleDate);
        const items = saleItemsBySaleId.get(sa.id) || [];
        const units = items.reduce((s, si) => s + si.quantity, 0);
        const saleCogs = items.reduce((s, si) => s + si.quantity * si.costPrice, 0);

        const entry = seriesMap.get(bucket) || {
          period_label: bucket,
          saleIds: new Set<number>(),
          units_sold: 0,
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
        };
        entry.saleIds.add(sa.id);
        entry.units_sold += units;
        entry.revenue += sa.totalAmount;
        entry.cogs += saleCogs;
        entry.gross_profit += sa.totalAmount - saleCogs;
        seriesMap.set(bucket, entry);
      }
    }

    const salesSeries = Array.from(seriesMap.values())
      .map((v) => ({
        period_label: v.period_label,
        order_count: v.saleIds.size,
        units_sold: v.units_sold,
        revenue: v.revenue,
        cogs: v.cogs,
        gross_profit: v.gross_profit,
      }))
      .sort((a, b) => a.period_label.localeCompare(b.period_label));

    // Last 30 Days Daily Revenue Series
    const thirtyDaysStart = new Date();
    thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 29);
    const thirtyStartIso = thirtyDaysStart.toISOString().slice(0, 10);

    const byDayMap = new Map<
      string,
      { saleIds: Set<number>; units_sold: number; revenue: number; gross_profit: number }
    >();

    for (const sa of allSales) {
      const iso = toIsoDate(sa.saleDate);
      if (iso < thirtyStartIso) continue;
      const items = saleItemsBySaleId.get(sa.id) || [];

      if (categoryId || supplierId) {
        for (const si of items) {
          const prod = prodMap.get(si.productId);
          if (!prod) continue;
          if (categoryId && prod.categoryId !== categoryId) continue;
          if (supplierId && prod.supplierId !== supplierId) continue;

          const entry = byDayMap.get(iso) || { saleIds: new Set<number>(), units_sold: 0, revenue: 0, gross_profit: 0 };
          entry.saleIds.add(sa.id);
          entry.units_sold += si.quantity;
          entry.revenue += si.subtotal;
          entry.gross_profit += si.subtotal - si.quantity * si.costPrice;
          byDayMap.set(iso, entry);
        }
      } else {
        const units = items.reduce((s, si) => s + si.quantity, 0);
        const saleCogs = items.reduce((s, si) => s + si.quantity * si.costPrice, 0);
        const entry = byDayMap.get(iso) || { saleIds: new Set<number>(), units_sold: 0, revenue: 0, gross_profit: 0 };
        entry.saleIds.add(sa.id);
        entry.units_sold += units;
        entry.revenue += sa.totalAmount;
        entry.gross_profit += sa.totalAmount - saleCogs;
        byDayMap.set(iso, entry);
      }
    }

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const match = byDayMap.get(iso);
      last30Days.push({
        date: iso,
        label,
        order_count: match?.saleIds.size ?? 0,
        units_sold: match?.units_sold ?? 0,
        revenue: match?.revenue ?? 0,
        gross_profit: match?.gross_profit ?? 0,
      });
    }

    // Top Selling Products
    const topProdAgg = new Map<
      number,
      {
        id: number;
        sku: string;
        name: string;
        category_name: string;
        units_sold: number;
        revenue: number;
        cogs: number;
        gross_profit: number;
      }
    >();

    for (const sa of dateFilteredSales) {
      const items = saleItemsBySaleId.get(sa.id) || [];
      for (const si of items) {
        const prod = prodMap.get(si.productId);
        if (!prod) continue;
        if (categoryId && prod.categoryId !== categoryId) continue;
        if (supplierId && prod.supplierId !== supplierId) continue;

        const existing = topProdAgg.get(prod.id) || {
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          category_name: catMap.get(prod.categoryId) || 'Uncategorized',
          units_sold: 0,
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
        };
        const itemCogs = si.quantity * si.costPrice;
        existing.units_sold += si.quantity;
        existing.revenue += si.subtotal;
        existing.cogs += itemCogs;
        existing.gross_profit += si.subtotal - itemCogs;
        topProdAgg.set(prod.id, existing);
      }
    }

    const topProducts = Array.from(topProdAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 3. Purchase Summaries
    const poUnitsMap = new Map<number, number>();
    for (const pi of allPurchaseItems) {
      poUnitsMap.set(pi.purchaseId, (poUnitsMap.get(pi.purchaseId) || 0) + pi.quantity);
    }

    const purchaseOrders = allPurchases
      .filter((po) => {
        if (!inDateRange(po.purchaseDate)) return false;
        if (supplierId && po.supplierId !== supplierId) return false;
        return true;
      })
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
      .map((po) => ({
        id: po.id,
        po_number: po.poNumber,
        supplier_id: po.supplierId,
        supplier_name: supMap.get(po.supplierId) || 'Unknown Supplier',
        created_by_name: userMap.get(po.userId) || 'System',
        total_amount: po.totalAmount,
        status: (po.status === 'pending' ? 'pending' : 'received') as 'received' | 'pending',
        notes: po.notes,
        purchase_date: po.purchaseDate,
        total_units: poUnitsMap.get(po.id) || 0,
      }));

    const purchaseSummary = purchaseOrders.reduce(
      (acc, po) => {
        acc.total_orders += 1;
        acc.total_units += po.total_units;
        if (po.status === 'received') {
          acc.received_orders += 1;
          acc.received_spend += po.total_amount;
        } else {
          acc.pending_orders += 1;
          acc.pending_value += po.total_amount;
        }
        acc.total_spend += po.total_amount;
        return acc;
      },
      {
        total_orders: 0,
        received_orders: 0,
        pending_orders: 0,
        total_units: 0,
        total_spend: 0,
        received_spend: 0,
        pending_value: 0,
      }
    );

    // 4. Supplier Performance
    const supplierPerformance = allSups
      .filter((s) => !supplierId || s.id === supplierId)
      .map((s) => {
        const linkedSkus = allProds.filter((p) => p.supplierId === s.id).length;
        const supPOs = allPurchases.filter((po) => po.supplierId === s.id && inDateRange(po.purchaseDate));
        const receivedOrders = supPOs.filter((po) => po.status === 'received').length;
        const pendingOrders = supPOs.filter((po) => po.status === 'pending').length;
        const totalSpend = supPOs.reduce((sum, po) => sum + po.totalAmount, 0);
        const avgOrderValue = supPOs.length > 0 ? totalSpend / supPOs.length : 0;
        const lastOrderDate =
          supPOs.length > 0 ? supPOs.map((po) => po.purchaseDate).sort((a, b) => b.localeCompare(a))[0] : null;

        return {
          id: s.id,
          name: s.name,
          contact_person: s.contactPerson,
          phone: s.phone,
          linked_skus: linkedSkus,
          total_orders: supPOs.length,
          received_orders: receivedOrders,
          pending_orders: pendingOrders,
          total_spend: totalSpend,
          avg_order_value: avgOrderValue,
          last_order_date: lastOrderDate,
        };
      })
      .sort((a, b) => b.total_spend - a.total_spend);

    // 5. Financial Statement (Profit & Loss)
    const grossSales = dateFilteredSales.reduce((sum, sa) => sum + sa.subtotal, 0);
    const discountsGiven = dateFilteredSales.reduce((sum, sa) => sum + sa.discount, 0);
    const netSalesRevenue = dateFilteredSales.reduce((sum, sa) => sum + sa.totalAmount, 0);

    let totalCogs = 0;
    for (const sa of dateFilteredSales) {
      const items = saleItemsBySaleId.get(sa.id) || [];
      for (const si of items) {
        totalCogs += si.quantity * si.costPrice;
      }
    }

    const filteredFinances = allFinances.filter((f) => inDateRange(f.recordDate));
    let otherIncome = 0;
    let operatingExpenses = 0;
    let inventoryPurchases = 0;
    const expenseByCat = new Map<string, number>();

    for (const f of filteredFinances) {
      if (f.type === 'Income' && f.category !== 'Product Sales') {
        otherIncome += f.amount;
      } else if (f.type === 'Expense') {
        if (f.category === 'Inventory Purchase') {
          inventoryPurchases += f.amount;
        } else {
          operatingExpenses += f.amount;
        }
        expenseByCat.set(f.category, (expenseByCat.get(f.category) || 0) + f.amount);
      }
    }

    const expenseBreakdown = Array.from(expenseByCat.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    const grossProfit = netSalesRevenue - totalCogs;
    const grossMarginPct = netSalesRevenue > 0 ? Number(((grossProfit / netSalesRevenue) * 100).toFixed(1)) : 0;
    const netProfit = grossProfit + otherIncome - operatingExpenses;
    const netMarginPct =
      netSalesRevenue + otherIncome > 0
        ? Number(((netProfit / (netSalesRevenue + otherIncome)) * 100).toFixed(1))
        : 0;

    return {
      filters: {
        period,
        start_date: startDate,
        end_date: endDate,
        category_id: categoryId,
        supplier_id: supplierId,
      },
      stockReport: {
        summary: stockSummary,
        items: stockItems,
      },
      lowStockAlerts,
      salesPerformance: {
        series: salesSeries,
        last30Days,
        topProducts,
      },
      purchaseSummary: {
        summary: purchaseSummary,
        orders: purchaseOrders,
      },
      supplierPerformance,
      financialStatement: {
        gross_sales: grossSales,
        discounts_given: discountsGiven,
        net_sales_revenue: netSalesRevenue,
        cogs: totalCogs,
        gross_profit: grossProfit,
        gross_margin_pct: grossMarginPct,
        other_income: otherIncome,
        operating_expenses: operatingExpenses,
        inventory_purchases: inventoryPurchases,
        net_profit: netProfit,
        net_margin_pct: netMarginPct,
        expense_breakdown: expenseBreakdown,
      },
    };
  } catch (error) {
    dbFailure('generate reports', error);
  }
}
