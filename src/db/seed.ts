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
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

function daysAgoStr(days: number, hour = 14): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function ensureSeeded(creatorUserId: number): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeedOnce(creatorUserId).catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeedOnce(adminId: number): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const existingCats = await tx.select({ id: categories.id }).from(categories).limit(1);
      if (existingCats.length > 0) {
        return;
      }

      const categoryData = [
        { name: 'iPhone', description: 'Official & SG/UAE Apple iPhone smartphones in Bangladesh' },
        { name: 'MacBook & Mac', description: 'MacBook Air, MacBook Pro M4, and Mac Studio workstations' },
        { name: 'iPad', description: 'iPad Pro M4 OLED, iPad Air, and Apple Pencil lineup' },
        { name: 'Apple Watch', description: 'Apple Watch Ultra 2, Series 10, and SE wearables' },
        { name: 'Audio & Streaming', description: 'AirPods Pro 2, AirPods Max USB-C, and Apple TV 4K' },
        { name: 'Monitors & Accessories', description: 'Professional 4K/5K monitors and Apple peripherals' },
      ];
      const insertedCats = await tx.insert(categories).values(categoryData).returning();
      const catIds = insertedCats.map((c) => c.id);

      const supplierData = [
        {
          name: 'Executive Machines Ltd. (Apple Authorized BD)',
          contactPerson: 'Tariqul Islam',
          phone: '+880 1711-004521',
          email: 'b2b@executivemachines.bd',
          address: 'Gulshan Avenue, Dhaka 1212',
        },
        {
          name: 'Compustar & Gadget Hub BD',
          contactPerson: 'Nusrat Jahan',
          phone: '+880 1819-332190',
          email: 'procurement@compustarbd.com',
          address: 'Multiplan Center, New Elephant Road, Dhaka',
        },
        {
          name: 'Global Brand Electronics BD',
          contactPerson: 'Kamrul Hasan',
          phone: '+880 1912-884310',
          email: 'supply@globalbrandbd.com',
          address: 'Banani Road 11, Dhaka 1213',
        },
        {
          name: 'Dazzle Tech Wholesale BD',
          contactPerson: 'Mehedi Karim',
          phone: '+880 1675-432198',
          email: 'orders@dazzletech.bd',
          address: 'Bashundhara City Level 5, Panthapath, Dhaka',
        },
      ];
      const insertedSups = await tx.insert(suppliers).values(supplierData).returning();
      const supIds = insertedSups.map((s) => s.id);

      const productSpecs: [string, string, number, number, number, number, number, number, string, string][] = [
        ['BD-IP16PM-256', 'iPhone 16 Pro Max 256GB (SG/UAE)', 0, 3, 128000, 144490, 28, 10, 'pcs', 'Bashundhara Vault A1'],
        ['BD-IP16-128', 'iPhone 16 128GB (Ultramarine)', 0, 3, 88500, 99990, 42, 12, 'pcs', 'Bashundhara Vault A2'],
        ['BD-MBA13-M3', 'MacBook Air 13" M3 16GB / 256GB', 1, 0, 121000, 136990, 22, 8, 'pcs', 'Banani Rack B-01'],
        ['BD-MBP16-M4', 'MacBook Pro 16" M4 Max 36GB / 1TB', 1, 0, 392000, 435000, 8, 4, 'pcs', 'Banani Rack B-03'],
        ['BD-IPADP13-M4', 'iPad Pro 13" M4 OLED 256GB Wi-Fi', 2, 1, 138000, 154990, 6, 10, 'pcs', 'Jamuna Bay C-02'],
        ['BD-IPADAIR-11', 'iPad Air 11" M2 128GB Wi-Fi', 2, 1, 69500, 78500, 19, 8, 'pcs', 'Jamuna Bay C-04'],
        ['BD-AWU2-49', 'Apple Watch Ultra 2 Titanium 49mm', 3, 3, 81500, 91990, 14, 6, 'pcs', 'Gulshan Showcase D1'],
        ['BD-APP2-USBC', 'AirPods Pro (2nd Gen) USB-C', 4, 2, 22200, 25990, 54, 18, 'pcs', 'Multiplan Shelf E-04'],
        ['BD-APM-USBC', 'AirPods Max (USB-C Midnight)', 4, 2, 60500, 68990, 4, 6, 'pcs', 'Multiplan Shelf E-02'],
        ['BD-MACSTU-M2', 'Mac Studio M2 Max 32GB / 512GB', 1, 0, 252000, 285000, 0, 3, 'pcs', 'Banani Rack B-05'],
        ['BD-PENCIL-PRO', 'Apple Pencil Pro (Star Tech Listed)', 5, 1, 11800, 14000, 36, 12, 'pcs', 'Multiplan Drawer C-06'],
        ['BD-ATV4K-128', 'Apple TV 4K Wi-Fi + Ethernet 128GB', 4, 2, 20200, 23500, 24, 8, 'pcs', 'Uttara Depot E-08'],
      ];

      const insertedProds = await tx
        .insert(products)
        .values(
          productSpecs.map((p) => ({
            sku: p[0],
            name: p[1],
            categoryId: catIds[p[2]],
            supplierId: supIds[p[3]],
            costPrice: p[4],
            sellingPrice: p[5],
            stockQty: p[6],
            reorderLevel: p[7],
            unit: p[8],
            warehouseLocation: p[9],
          }))
        )
        .returning();

      const employeeData = [
        {
          empCode: 'BD-EMP-01',
          fullName: 'Jashed',
          email: 'jashed@stockpilot.io',
          phone: '+880 1711-240981',
          roleTitle: 'Store Operations Director',
          department: 'Executive',
          salary: 85000,
          status: 'Active',
          joinedDate: '2023-09-10',
        },
        {
          empCode: 'BD-EMP-02',
          fullName: 'Farhana Akter',
          email: 'farhana@stockpilot.io',
          phone: '+880 1819-550120',
          roleTitle: 'Procurement & Channel Lead',
          department: 'Procurement',
          salary: 62000,
          status: 'Active',
          joinedDate: '2024-01-15',
        },
        {
          empCode: 'BD-EMP-03',
          fullName: 'Arif Mahmud',
          email: 'arif@stockpilot.io',
          phone: '+880 1912-667788',
          roleTitle: 'Multiplan Warehouse Lead',
          department: 'Logistics',
          salary: 45000,
          status: 'Active',
          joinedDate: '2024-04-01',
        },
        {
          empCode: 'BD-EMP-04',
          fullName: 'Samira Chowdhury',
          email: 'samira@stockpilot.io',
          phone: '+880 1715-990011',
          roleTitle: 'Corporate B2B Sales Lead',
          department: 'Sales',
          salary: 52000,
          status: 'Active',
          joinedDate: '2024-07-12',
        },
        {
          empCode: 'BD-EMP-05',
          fullName: 'Tanvir Ahmed',
          email: 'tanvir@stockpilot.io',
          phone: '+880 1614-223344',
          roleTitle: 'Accounts & VAT Officer',
          department: 'Finance',
          salary: 55000,
          status: 'On Leave',
          joinedDate: '2025-02-03',
        },
      ];
      await tx.insert(employees).values(employeeData);

      const poPlans = [
        {
          poNumber: 'PO-BD-2601',
          supplierId: supIds[3],
          totalAmount: 2450500,
          status: 'received',
          notes: 'iPhone 16 Pro Max & iPhone 16 Dhaka stock batch',
          purchaseDate: daysAgoStr(26, 10),
          items: [
            { prodIdx: 0, qty: 12, unitCost: 128000, subtotal: 1536000, moveNote: 'Bashundhara City stock intake' },
            { prodIdx: 1, qty: 10, unitCost: 88500, subtotal: 885000, moveNote: 'Bashundhara City stock intake' },
          ],
          expense: {
            amount: 2421000,
            desc: 'iPhone 16 shipment from Dazzle Tech Wholesale BD',
          },
        },
        {
          poNumber: 'PO-BD-2602',
          supplierId: supIds[0],
          totalAmount: 2778000,
          status: 'received',
          notes: 'MacBook Pro M4 & MacBook Air M3 official batch',
          purchaseDate: daysAgoStr(18, 11),
          items: [
            { prodIdx: 3, qty: 4, unitCost: 392000, subtotal: 1568000, moveNote: 'Banani flagship intake' },
            { prodIdx: 2, qty: 10, unitCost: 121000, subtotal: 1210000, moveNote: 'Banani flagship intake' },
          ],
          expense: {
            amount: 2778000,
            desc: 'Mac hardware batch from Executive Machines Ltd.',
          },
        },
        {
          poNumber: 'PO-BD-2603',
          supplierId: supIds[2],
          totalAmount: 987000,
          status: 'received',
          notes: 'AirPods Pro 2 & Apple Watch Ultra 2 restock',
          purchaseDate: daysAgoStr(9, 9),
          items: [
            { prodIdx: 6, qty: 6, unitCost: 81500, subtotal: 489000, moveNote: 'Gulshan showcase intake' },
            { prodIdx: 7, qty: 22, unitCost: 22200, subtotal: 488400, moveNote: 'Multiplan shelf intake' },
          ],
          expense: {
            amount: 977400,
            desc: 'Audio & Watch intake from Global Brand Electronics BD',
          },
        },
        {
          poNumber: 'PO-BD-2604',
          supplierId: supIds[1],
          totalAmount: 1616000,
          status: 'pending',
          notes: 'iPad Pro M4 OLED & Apple Pencil Pro replenishment',
          purchaseDate: daysAgoStr(2, 15),
          items: [
            { prodIdx: 4, qty: 10, unitCost: 138000, subtotal: 1380000, moveNote: '' },
            { prodIdx: 10, qty: 20, unitCost: 11800, subtotal: 236000, moveNote: '' },
          ],
          expense: null,
        },
      ];

      for (const plan of poPlans) {
        const [insertedPo] = await tx
          .insert(purchases)
          .values({
            poNumber: plan.poNumber,
            supplierId: plan.supplierId,
            userId: adminId,
            totalAmount: plan.totalAmount,
            status: plan.status,
            notes: plan.notes,
            purchaseDate: plan.purchaseDate,
          })
          .returning();

        await tx.insert(purchaseItems).values(
          plan.items.map((item) => ({
            purchaseId: insertedPo.id,
            productId: insertedProds[item.prodIdx].id,
            quantity: item.qty,
            unitCost: item.unitCost,
            subtotal: item.subtotal,
          }))
        );

        if (plan.expense) {
          await tx.insert(financialRecords).values({
            type: 'Expense',
            category: 'Inventory Purchase',
            referenceCode: plan.poNumber,
            description: plan.expense.desc,
            amount: plan.expense.amount,
            recordDate: plan.purchaseDate,
            createdBy: adminId,
          });
        }

        if (plan.status === 'received') {
          await tx.insert(stockMovements).values(
            plan.items.map((item) => ({
              productId: insertedProds[item.prodIdx].id,
              changeQty: item.qty,
              type: 'Purchase',
              reference: plan.poNumber,
              note: item.moveNote,
              createdAt: plan.purchaseDate,
            }))
          );
        }
      }

      const customers: [string, string][] = [
        ['Brain Station 23 Ltd.', '+880 1711-309100'],
        ['10 Minute School Studio', '+880 1819-440210'],
        ['Pathao Tech Operations', '+880 1911-887200'],
        ['Walk-in Bashundhara Retail', '+880 1755-221109'],
        ['bKash Engineering Team', '+880 1844-550912'],
        ['Chaldal Operations Hub', '+880 1713-990411'],
        ['ShopUp Merchant Support', '+880 1612-773344'],
        ['Grameenphone Digital Lab', '+880 1711-001122'],
      ];
      const payMethods = ['bKash', 'Nagad', 'Card', 'Bank Transfer', 'Cash'];

      const dailyOrderPlans: { items: [number, number][]; discount: number }[] = [
        { items: [[0, 2], [7, 3]], discount: 2000 },
        { items: [[1, 3], [10, 2]], discount: 1500 },
        { items: [[2, 2], [7, 2]], discount: 0 },
        { items: [[3, 1], [5, 2]], discount: 5000 },
        { items: [[0, 3], [6, 2]], discount: 3000 },
        { items: [[4, 2], [10, 2], [7, 4]], discount: 4000 },
        { items: [[1, 4], [11, 3]], discount: 2500 },
        { items: [[2, 1], [8, 2]], discount: 0 },
        { items: [[0, 2], [7, 5]], discount: 1500 },
        { items: [[3, 1], [2, 2]], discount: 6000 },
        { items: [[6, 3], [7, 3]], discount: 2000 },
        { items: [[0, 4], [1, 2]], discount: 5000 },
        { items: [[5, 3], [11, 2]], discount: 1000 },
        { items: [[4, 2], [10, 3]], discount: 2500 },
        { items: [[2, 3], [7, 4]], discount: 3000 },
        { items: [[3, 2], [5, 1]], discount: 8000 },
        { items: [[0, 3], [6, 2], [7, 2]], discount: 3500 },
        { items: [[1, 3], [8, 1]], discount: 0 },
        { items: [[4, 2], [10, 4]], discount: 2000 },
        { items: [[0, 2], [2, 2]], discount: 4000 },
        { items: [[6, 2], [7, 5], [11, 2]], discount: 2500 },
        { items: [[3, 1], [2, 2], [5, 2]], discount: 6500 },
        { items: [[0, 4], [7, 3]], discount: 3000 },
        { items: [[1, 4], [6, 2]], discount: 2000 },
        { items: [[2, 3], [4, 1], [10, 2]], discount: 4500 },
        { items: [[3, 2], [7, 4]], discount: 7000 },
        { items: [[0, 5], [6, 2]], discount: 6000 },
        { items: [[2, 2], [5, 2], [11, 3]], discount: 3500 },
        { items: [[0, 3], [1, 3], [7, 5]], discount: 4000 },
        { items: [[3, 1], [4, 2], [6, 2], [7, 3]], discount: 5000 },
      ];

      for (let idx = 0; idx < dailyOrderPlans.length; idx++) {
        const plan = dailyOrderPlans[idx];
        const daysBack = 29 - idx;
        const invNum = `INV-BD-${3001 + idx}`;
        const [custName, custPhone] = customers[idx % customers.length];
        const payMethod = payMethods[idx % payMethods.length];
        const dateStr = daysAgoStr(daysBack, 11 + (idx % 6));

        let subtotal = 0;
        const lineItems = plan.items.map(([prodIdx, qty]) => {
          const p = insertedProds[prodIdx];
          const lineSub = p.sellingPrice * qty;
          subtotal += lineSub;
          return { product: p, qty, lineSub };
        });

        const totalAmount = Math.max(0, subtotal - plan.discount);
        const [insertedSale] = await tx
          .insert(sales)
          .values({
            invoiceNumber: invNum,
            customerName: custName,
            customerPhone: custPhone,
            userId: adminId,
            subtotal,
            discount: plan.discount,
            totalAmount,
            paymentMethod: payMethod,
            saleDate: dateStr,
          })
          .returning();

        await tx.insert(saleItems).values(
          lineItems.map((li) => ({
            saleId: insertedSale.id,
            productId: li.product.id,
            quantity: li.qty,
            unitPrice: li.product.sellingPrice,
            costPrice: li.product.costPrice,
            subtotal: li.lineSub,
          }))
        );

        await tx.insert(financialRecords).values({
          type: 'Income',
          category: 'Product Sales',
          referenceCode: invNum,
          description: `Dhaka Retail / B2B sale to ${custName}`,
          amount: totalAmount,
          recordDate: dateStr,
          createdBy: adminId,
        });

        if (daysBack <= 5) {
          const firstItem = lineItems[0];
          await tx.insert(stockMovements).values({
            productId: firstItem.product.id,
            changeQty: -firstItem.qty,
            type: 'Sale',
            reference: invNum,
            note: `Dispatched to ${custName}`,
            createdAt: dateStr,
          });
        }
      }

      await tx.insert(financialRecords).values([
        {
          type: 'Expense',
          category: 'Showroom Rent & Utilities',
          referenceCode: 'EXP-BD-01',
          description: 'Bashundhara City & Banani showroom monthly lease and DESCO power',
          amount: 385000,
          recordDate: daysAgoStr(15, 9),
          createdBy: adminId,
        },
        {
          type: 'Expense',
          category: 'Staff Payroll',
          referenceCode: 'EXP-BD-02',
          description: 'Monthly Dhaka operations & retail staff payroll',
          amount: 299000,
          recordDate: daysAgoStr(5, 16),
          createdBy: adminId,
        },
        {
          type: 'Expense',
          category: 'Courier & Transit Insurance',
          referenceCode: 'EXP-BD-03',
          description: 'Steadfast / Sundarban insured corporate delivery & security',
          amount: 68000,
          recordDate: daysAgoStr(2, 13),
          createdBy: adminId,
        },
      ]);
    });
  } catch (error) {
    console.error('Database seed check/execution failed:', error);
    throw new Error('Failed to initialize workspace dataset.', { cause: error });
  }
}
