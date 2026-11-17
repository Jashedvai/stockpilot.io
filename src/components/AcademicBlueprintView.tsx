import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Database, FileCode2, Layers, Printer, Terminal, BookOpen } from 'lucide-react';
import { APPLE_EASE } from '../lib/motion';
import { AppleSegmentedControl, AppleViewTransition } from './AppleMotion';

type BlueprintTab = 'architecture' | 'erd' | 'django' | 'setup' | 'report';
type DjangoFileKey = 'models.py' | 'views.py' | 'urls.py' | 'forms.py' | 'admin.py' | 'settings.py';

interface EntityDef {
  name: string;
  table: string;
  role: string;
  fields: { name: string; type: string; key?: 'PK' | 'FK' | 'UQ' }[];
  relations: string[];
}

const ENTITIES: EntityDef[] = [
  {
    name: 'User',
    table: 'users',
    role: 'Authentication & Role Access',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'full_name', type: 'VARCHAR(120)' },
      { name: 'email', type: 'VARCHAR(150)', key: 'UQ' },
      { name: 'password_hash', type: 'VARCHAR(255)' },
      { name: 'role', type: 'VARCHAR(20)' },
    ],
    relations: ['1:N -> Purchases (created_by)', '1:N -> Sales (cashier)', '1:N -> FinancialRecords'],
  },
  {
    name: 'Category',
    table: 'categories',
    role: 'Product Classification',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'name', type: 'VARCHAR(100)', key: 'UQ' },
      { name: 'description', type: 'TEXT' },
    ],
    relations: ['1:N -> Products'],
  },
  {
    name: 'Supplier',
    table: 'suppliers',
    role: 'Vendor & Procurement Directory',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'name', type: 'VARCHAR(150)' },
      { name: 'contact_person', type: 'VARCHAR(120)' },
      { name: 'phone', type: 'VARCHAR(30)' },
      { name: 'email', type: 'VARCHAR(150)' },
      { name: 'address', type: 'TEXT' },
    ],
    relations: ['1:N -> Products', '1:N -> Purchases'],
  },
  {
    name: 'Product',
    table: 'products',
    role: 'Master SKU & Stock Ledger',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'sku', type: 'VARCHAR(40)', key: 'UQ' },
      { name: 'name', type: 'VARCHAR(180)' },
      { name: 'category_id', type: 'INTEGER', key: 'FK' },
      { name: 'supplier_id', type: 'INTEGER', key: 'FK' },
      { name: 'cost_price', type: 'DECIMAL(10,2)' },
      { name: 'selling_price', type: 'DECIMAL(10,2)' },
      { name: 'stock_qty', type: 'INTEGER' },
      { name: 'reorder_level', type: 'INTEGER' },
    ],
    relations: ['N:1 -> Category', 'N:1 -> Supplier', '1:N -> PurchaseItems', '1:N -> SaleItems', '1:N -> StockMovements'],
  },
  {
    name: 'Purchase',
    table: 'purchases',
    role: 'Stock-In Purchase Orders',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'po_number', type: 'VARCHAR(40)', key: 'UQ' },
      { name: 'supplier_id', type: 'INTEGER', key: 'FK' },
      { name: 'user_id', type: 'INTEGER', key: 'FK' },
      { name: 'total_amount', type: 'DECIMAL(12,2)' },
      { name: 'status', type: 'VARCHAR(20)' },
      { name: 'purchase_date', type: 'DATETIME' },
    ],
    relations: ['N:1 -> Supplier', 'N:1 -> User', '1:N -> PurchaseItems'],
  },
  {
    name: 'PurchaseItem',
    table: 'purchase_items',
    role: 'PO Line Item Breakdown',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'purchase_id', type: 'INTEGER', key: 'FK' },
      { name: 'product_id', type: 'INTEGER', key: 'FK' },
      { name: 'quantity', type: 'INTEGER' },
      { name: 'unit_cost', type: 'DECIMAL(10,2)' },
      { name: 'subtotal', type: 'DECIMAL(12,2)' },
    ],
    relations: ['N:1 -> Purchase', 'N:1 -> Product'],
  },
  {
    name: 'Sale',
    table: 'sales',
    role: 'Stock-Out Customer Invoices',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'invoice_number', type: 'VARCHAR(40)', key: 'UQ' },
      { name: 'customer_name', type: 'VARCHAR(150)' },
      { name: 'user_id', type: 'INTEGER', key: 'FK' },
      { name: 'subtotal', type: 'DECIMAL(12,2)' },
      { name: 'discount', type: 'DECIMAL(10,2)' },
      { name: 'total_amount', type: 'DECIMAL(12,2)' },
      { name: 'payment_method', type: 'VARCHAR(40)' },
    ],
    relations: ['N:1 -> User', '1:N -> SaleItems'],
  },
  {
    name: 'SaleItem',
    table: 'sale_items',
    role: 'Sales Invoice Line Items',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'sale_id', type: 'INTEGER', key: 'FK' },
      { name: 'product_id', type: 'INTEGER', key: 'FK' },
      { name: 'quantity', type: 'INTEGER' },
      { name: 'unit_price', type: 'DECIMAL(10,2)' },
      { name: 'subtotal', type: 'DECIMAL(12,2)' },
    ],
    relations: ['N:1 -> Sale', 'N:1 -> Product'],
  },
  {
    name: 'Employee',
    table: 'employees',
    role: 'Staff & Payroll Directory',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'emp_code', type: 'VARCHAR(30)', key: 'UQ' },
      { name: 'full_name', type: 'VARCHAR(120)' },
      { name: 'role_title', type: 'VARCHAR(80)' },
      { name: 'department', type: 'VARCHAR(80)' },
      { name: 'salary', type: 'DECIMAL(10,2)' },
      { name: 'status', type: 'VARCHAR(20)' },
    ],
    relations: ['Managed via HR & Admin Dashboard'],
  },
  {
    name: 'FinancialRecord',
    table: 'financial_records',
    role: 'Income & Expense General Ledger',
    fields: [
      { name: 'id', type: 'INTEGER', key: 'PK' },
      { name: 'type', type: 'VARCHAR(15)' },
      { name: 'category', type: 'VARCHAR(80)' },
      { name: 'reference_code', type: 'VARCHAR(50)' },
      { name: 'amount', type: 'DECIMAL(12,2)' },
      { name: 'record_date', type: 'DATETIME' },
      { name: 'created_by', type: 'INTEGER', key: 'FK' },
    ],
    relations: ['Auto-synced from Purchases & Sales', 'N:1 -> User'],
  },
];

const DJANGO_CODE: Record<DjangoFileKey, string> = {
  'models.py': `from django.db import models
from django.contrib.auth.models import User

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Supplier(models.Model):
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=120)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    sku = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=180)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="products")
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_qty = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10)
    unit = models.CharField(max_length=20, default="pcs")
    warehouse_location = models.CharField(max_length=60, default="Rack A-01")
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_low_stock(self):
        return self.stock_qty <= self.reorder_level

    def __str__(self):
        return f"{self.sku} - {self.name}"


class Purchase(models.Model):
    STATUS_CHOICES = [("received", "Received"), ("pending", "Pending")]
    po_number = models.CharField(max_length=40, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="received")
    notes = models.TextField(blank=True)
    purchase_date = models.DateTimeField(auto_now_add=True)


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)


class Sale(models.Model):
    invoice_number = models.CharField(max_length=40, unique=True)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=30, blank=True)
    cashier = models.ForeignKey(User, on_delete=models.PROTECT)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=40, default="Cash")
    sale_date = models.DateTimeField(auto_now_add=True)


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)


class Employee(models.Model):
    STATUS_CHOICES = [("Active", "Active"), ("On Leave", "On Leave"), ("Inactive", "Inactive")]
    emp_code = models.CharField(max_length=30, unique=True)
    full_name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30)
    role_title = models.CharField(max_length=80)
    department = models.CharField(max_length=80)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Active")
    joined_date = models.DateField()


class FinancialRecord(models.Model):
    TYPE_CHOICES = [("Income", "Income"), ("Expense", "Expense")]
    type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    category = models.CharField(max_length=80)
    reference_code = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    record_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)`,

  'views.py': `from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import F, Sum
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from .models import Product, Supplier, Purchase, PurchaseItem, Sale, SaleItem, Employee, FinancialRecord
from .forms import ProductForm, SupplierForm, EmployeeForm

@login_required
def dashboard_view(request):
    products = Product.objects.select_related("category", "supplier")
    low_stock = products.filter(stock_qty__lte=F("reorder_level"))
    total_income = FinancialRecord.objects.filter(type="Income").aggregate(Sum("amount"))["amount__sum"] or 0
    total_expense = FinancialRecord.objects.filter(type="Expense").aggregate(Sum("amount"))["amount__sum"] or 0

    context = {
        "total_products": products.count(),
        "low_stock_items": low_stock,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense,
    }
    return render(request, "inventory/dashboard.html", context)


@login_required
def product_list(request):
    products = Product.objects.select_related("category", "supplier").order_by("-id")
    return render(request, "inventory/product_list.html", {"products": products})


@login_required
def product_create(request):
    form = ProductForm(request.POST or None)
    if form.is_valid():
        form.save()
        messages.success(request, "Product added successfully.")
        return redirect("product_list")
    return render(request, "inventory/product_form.html", {"form": form})


@login_required
@transaction.atomic
def create_sale_invoice(request):
    if request.method == "POST":
        product = get_object_or_404(Product, id=request.POST.get("product_id"))
        qty = int(request.POST.get("quantity", 1))
        if product.stock_qty < qty:
            messages.error(request, f"Insufficient stock for {product.name}.")
            return redirect("sales_list")

        subtotal = product.selling_price * qty
        sale = Sale.objects.create(
            invoice_number=f"INV-{Sale.objects.count() + 1001}",
            customer_name=request.POST.get("customer_name"),
            cashier=request.user,
            subtotal=subtotal,
            total_amount=subtotal,
            payment_method=request.POST.get("payment_method", "Cash"),
        )
        SaleItem.objects.create(
            sale=sale, product=product, quantity=qty,
            unit_price=product.selling_price, subtotal=subtotal
        )
        product.stock_qty = F("stock_qty") - qty
        product.save()

        FinancialRecord.objects.create(
            type="Income", category="Product Sales",
            reference_code=sale.invoice_number,
            description=f"Sale to {sale.customer_name}",
            amount=sale.total_amount, created_by=request.user
        )
        messages.success(request, f"Invoice {sale.invoice_number} created.")
        return redirect("sales_list")
    return render(request, "inventory/sale_form.html", {"products": Product.objects.filter(stock_qty__gt=0)})`,

  'urls.py': `from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path("", views.dashboard_view, name="dashboard"),
    path("login/", auth_views.LoginView.as_view(template_name="auth/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),

    # Products CRUD
    path("products/", views.product_list, name="product_list"),
    path("products/new/", views.product_create, name="product_create"),

    # Sales & POS
    path("sales/new/", views.create_sale_invoice, name="create_sale"),
]`,

  'forms.py': `from django import forms
from .models import Product, Supplier, Employee

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = [
            "sku", "name", "category", "supplier",
            "cost_price", "selling_price", "stock_qty",
            "reorder_level", "unit", "warehouse_location"
        ]
        widgets = {
            "sku": forms.TextInput(attrs={"class": "form-control"}),
            "name": forms.TextInput(attrs={"class": "form-control"}),
            "category": forms.Select(attrs={"class": "form-select"}),
            "supplier": forms.Select(attrs={"class": "form-select"}),
        }


class SupplierForm(forms.ModelForm):
    class Meta:
        model = Supplier
        fields = ["name", "contact_person", "phone", "email", "address"]


class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = ["emp_code", "full_name", "email", "phone", "role_title", "department", "salary", "status", "joined_date"]`,

  'admin.py': `from django.contrib import admin
from .models import Category, Supplier, Product, Purchase, Sale, Employee, FinancialRecord

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "supplier", "stock_qty", "selling_price")
    list_filter = ("category", "supplier")
    search_fields = ("sku", "name")

admin.site.register(Category)
admin.site.register(Supplier)
admin.site.register(Purchase)
admin.site.register(Sale)
admin.site.register(Employee)
admin.site.register(FinancialRecord)`,

  'settings.py': `from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-secret-key")
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "inventory",
]

# Development SQLite Configuration
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Production MySQL Option:
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.mysql",
#         "NAME": "stockpilot_db",
#         "USER": "root",
#         "PASSWORD": "your_password",
#         "HOST": "127.0.0.1",
#         "PORT": "3306",
#     }
# }

LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "dashboard"
LOGOUT_REDIRECT_URL = "login"`,
};

export const AcademicBlueprintView: React.FC = () => {
  const [tab, setTab] = useState<BlueprintTab>('architecture');
  const [selectedEntity, setSelectedEntity] = useState<EntityDef>(ENTITIES[3]); // Product default
  const [activeDjangoFile, setActiveDjangoFile] = useState<DjangoFileKey>('models.py');
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <AppleSegmentedControl
          layoutId="academic-main-tab"
          value={tab}
          onChange={setTab}
          buttonClassName="px-3 py-1.5 text-xs"
          options={[
            { id: 'architecture', label: 'Project Architecture', icon: Layers },
            { id: 'erd', label: 'Database & ER Diagram', icon: Database },
            { id: 'django', label: 'Django Source Code', icon: FileCode2 },
            { id: 'setup', label: 'Setup Guide', icon: Terminal },
            { id: 'report', label: 'Final Report & Slides', icon: BookOpen },
          ]}
        />

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] flex items-center gap-1.5 whitespace-nowrap transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      <AppleViewTransition viewKey={tab}>
      {/* 1. ARCHITECTURE TAB */}
      {tab === 'architecture' && (
        <div className="space-y-6">
          <div className="glass-surface rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                StockPilot System Architecture (MVT & Relational Persistence)
              </h2>
              <p className="mt-1.5 text-sm text-[#5a5a60] dark:text-[#a1a1a6] leading-relaxed max-w-3xl">
                StockPilot is engineered around a strict 3-tier modular architecture separating presentation, business
                transaction logic, and normalized relational storage. All stock mutations (Purchases, Sales, Adjustments)
                execute atomically inside database transactions so inventory counts and financial ledgers remain synchronized.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl glass-inset">
                <div className="text-xs font-semibold text-[#0071e3] dark:text-[#0a84ff]">01. Presentation Tier</div>
                <div className="mt-1 font-display font-semibold text-[#1d1d1f] dark:text-white">
                  HTML5 / CSS3 / Bootstrap 5 & React UI
                </div>
                <p className="mt-2 text-xs text-[#5a5a60] dark:text-[#a1a1a6] leading-relaxed">
                  Responsive admin dashboard, data grids with tabular numerals, search/filter bars, printable POS invoices,
                  and modal CRUD forms.
                </p>
              </div>
              <div className="p-4 rounded-xl glass-inset">
                <div className="text-xs font-semibold text-[#0071e3] dark:text-[#0a84ff]">02. Application Tier</div>
                <div className="mt-1 font-display font-semibold text-[#1d1d1f] dark:text-white">
                  Django MVT / Express REST Controller
                </div>
                <p className="mt-2 text-xs text-[#5a5a60] dark:text-[#a1a1a6] leading-relaxed">
                  Session authentication, role-based access, stock threshold checks, atomic purchase/sale processing, and
                  automatic financial ledger posting.
                </p>
              </div>
              <div className="p-4 rounded-xl glass-inset">
                <div className="text-xs font-semibold text-[#0071e3] dark:text-[#0a84ff]">03. Data Persistence Tier</div>
                <div className="mt-1 font-display font-semibold text-[#1d1d1f] dark:text-white">
                  SQLite (Dev) / MySQL (Prod)
                </div>
                <p className="mt-2 text-xs text-[#5a5a60] dark:text-[#a1a1a6] leading-relaxed">
                  10 normalized relational tables with enforced foreign keys, unique SKU/invoice constraints, and WAL
                  transactional integrity.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="text-base font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
                Technology Stack Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                    <th className="py-3 px-6 font-medium">Layer</th>
                    <th className="py-3 px-6 font-medium">Academic Stack (Target)</th>
                    <th className="py-3 px-6 font-medium">Live App Runtime</th>
                    <th className="py-3 px-6 font-medium">Responsibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06] text-xs">
                  <tr className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3.5 px-6 font-medium text-[#1d1d1f] dark:text-white">Backend</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">Python 3 + Django 5</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">Node.js + Express TypeScript</td>
                    <td className="py-3.5 px-6 text-[#86868b] dark:text-[#8e8e93]">Auth, CRUD routing, atomic transactions</td>
                  </tr>
                  <tr className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3.5 px-6 font-medium text-[#1d1d1f] dark:text-white">Frontend</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">HTML5, CSS3, JS, Bootstrap 5</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">React 19 + Tailwind CSS</td>
                    <td className="py-3.5 px-6 text-[#86868b] dark:text-[#8e8e93]">Responsive UI, charts, forms, print invoices</td>
                  </tr>
                  <tr className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3.5 px-6 font-medium text-[#1d1d1f] dark:text-white">Database</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">SQLite / MySQL</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">SQLite (better-sqlite3 WAL)</td>
                    <td className="py-3.5 px-6 text-[#86868b] dark:text-[#8e8e93]">Normalized relational storage & FK integrity</td>
                  </tr>
                  <tr className="hover:bg-white/40 dark:hover:bg-white/[0.04]">
                    <td className="py-3.5 px-6 font-medium text-[#1d1d1f] dark:text-white">IDE & Tooling</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">VS Code + Git</td>
                    <td className="py-3.5 px-6 text-[#6e6e73] dark:text-[#a1a1a6]">Vite + TSX + TypeScript</td>
                    <td className="py-3.5 px-6 text-[#86868b] dark:text-[#8e8e93]">Modular development, linting, and builds</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. INTERACTIVE ER DIAGRAM TAB */}
      {tab === 'erd' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ENTITIES.map((ent) => {
              const isSelected = selectedEntity.table === ent.table;
              return (
                <motion.button
                  key={ent.table}
                  type="button"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.16, ease: APPLE_EASE }}
                  onClick={() => setSelectedEntity(ent)}
                  className={`text-left p-4 rounded-2xl transition-colors ${
                    isSelected
                      ? 'border border-[#0071e3] dark:border-[#0a84ff] bg-[#0071e3]/[0.1] dark:bg-[#0a84ff]/[0.16] backdrop-blur-xl shadow-xs'
                      : 'glass-surface hover:bg-white/75 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-sm text-[#1d1d1f] dark:text-white">
                      {ent.name}
                    </span>
                    <span className="font-mono text-xs text-[#6e6e73] dark:text-[#8e8e93]">{ent.table}</span>
                  </div>
                  <div className="text-xs text-[#5a5a60] dark:text-[#a1a1a6] mt-1">{ent.role}</div>
                  <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.08] space-y-1">
                    {ent.fields.slice(0, 4).map((f) => (
                      <div key={f.name} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {f.key ? `[${f.key}] ` : ''}
                          {f.name}
                        </span>
                        <span className="text-[#6e6e73]">{f.type}</span>
                      </div>
                    ))}
                    {ent.fields.length > 4 && (
                      <div className="text-xs text-[#0071e3] dark:text-[#0a84ff] pt-0.5 font-medium">
                        +{ent.fields.length - 4} more fields
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="glass-surface rounded-2xl p-6 h-fit overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedEntity.table}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: APPLE_EASE }}
                className="space-y-5"
              >
                <div>
                  <div className="text-xs text-[#0071e3] dark:text-[#0a84ff] font-medium">Selected Entity Inspector</div>
                  <h3 className="text-lg font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white mt-0.5">
                    {selectedEntity.name}{' '}
                    <span className="font-mono text-sm text-[#6e6e73]">({selectedEntity.table})</span>
                  </h3>
                  <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6] mt-1">{selectedEntity.role}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-2">Schema Columns</h4>
                  <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08] glass-inset rounded-xl overflow-hidden">
                    {selectedEntity.fields.map((f) => (
                      <div key={f.name} className="px-3.5 py-2 flex items-center justify-between text-xs font-mono">
                        <span className="text-[#1d1d1f] dark:text-white">
                          {f.name}
                          {f.key && <span className="ml-1.5 text-[#0071e3] dark:text-[#0a84ff] font-semibold">{f.key}</span>}
                        </span>
                        <span className="text-[#5a5a60] dark:text-[#a1a1a6]">{f.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[#1d1d1f] dark:text-white mb-2">Foreign Key Relationships</h4>
                  <ul className="space-y-1.5 text-xs text-[#5a5a60] dark:text-[#a1a1a6] font-mono">
                    {selectedEntity.relations.map((rel) => (
                      <li key={rel} className="px-3.5 py-2 rounded-xl glass-inset">
                        {rel}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 3. DJANGO BACKEND SOURCE CODE TAB */}
      {tab === 'django' && (
        <div className="glass-surface rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-white/35 dark:bg-white/[0.03]">
            <AppleSegmentedControl
              layoutId="academic-django-tab"
              value={activeDjangoFile}
              onChange={setActiveDjangoFile}
              buttonClassName="px-3 py-1 text-xs font-mono"
              options={(Object.keys(DJANGO_CODE) as DjangoFileKey[]).map((file) => ({
                id: file,
                label: file,
              }))}
            />
            <button
              type="button"
              onClick={() => handleCopy(DJANGO_CODE[activeDjangoFile])}
              className="px-3.5 py-1.5 rounded-full glass-inset text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-white/75 dark:hover:bg-white/[0.12] flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#248a3d] dark:text-[#30d158]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.pre
              key={activeDjangoFile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="p-5 text-xs font-mono text-[#f5f5f7] overflow-x-auto leading-relaxed bg-[#14161c]/95 backdrop-blur-xl"
            >
              <code>{DJANGO_CODE[activeDjangoFile]}</code>
            </motion.pre>
          </AnimatePresence>
        </div>
      )}

      {/* 4. PROJECT SETUP GUIDE TAB */}
      {tab === 'setup' && (
        <div className="glass-surface rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
            Local Python Django & VS Code Setup Guide
          </h2>
          <div className="space-y-4 text-sm text-[#5a5a60] dark:text-[#a1a1a6]">
            <div>
              <h3 className="font-semibold text-[#1d1d1f] dark:text-white mb-2">
                Step 1: Initialize Project Workspace & Virtual Environment
              </h3>
              <pre className="p-4 rounded-xl bg-[#14161c]/95 text-[#f5f5f7] text-xs font-mono overflow-x-auto leading-relaxed">
{`mkdir stockpilot && cd stockpilot
python -m venv venv
# Windows: venv\\Scripts\\activate  |  macOS/Linux: source venv/bin/activate
pip install django mysqlclient pillow`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] dark:text-white mb-2">
                Step 2: Create Django Project & Inventory App
              </h3>
              <pre className="p-4 rounded-xl bg-[#14161c]/95 text-[#f5f5f7] text-xs font-mono overflow-x-auto leading-relaxed">
{`django-admin startproject config .
python manage.py startapp inventory`}
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] dark:text-white mb-2">
                Step 3: Apply Database Migrations & Create Admin Superuser
              </h3>
              <pre className="p-4 rounded-xl bg-[#14161c]/95 text-[#f5f5f7] text-xs font-mono overflow-x-auto leading-relaxed">
{`python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 5. FINAL PROJECT REPORT & PRESENTATION TAB */}
      {tab === 'report' && (
        <div className="space-y-6">
          <div className="glass-surface rounded-2xl p-8 space-y-6">
            <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-5">
              <div className="text-xs font-medium text-[#0071e3] dark:text-[#0a84ff]">
                Final Academic Project Report · Inventory Management System
              </div>
              <h2 className="text-2xl font-display font-bold tracking-tight text-[#1d1d1f] dark:text-white mt-1">
                StockPilot: Centralized Inventory, Procurement, Sales & Financial Ledger
              </h2>
              <p className="text-xs text-[#5a5a60] dark:text-[#a1a1a6] mt-1">
                Prepared by Jashed · Full-Stack Architecture & Relational SQLite Implementation
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#5a5a60] dark:text-[#a1a1a6] leading-relaxed">
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-[#1d1d1f] dark:text-white">1. Problem Statement</h3>
                <p>
                  Retailers and wholesale distributors frequently rely on disconnected spreadsheets or manual paper
                  ledgers, leading to stock discrepancies, delayed supplier reordering, unrecorded sales discounts, and
                  inaccurate daily profit visibility.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-[#1d1d1f] dark:text-white">2. Project Objectives</h3>
                <p>
                  Deliver a centralized web application that unifies Product Catalog management, automated Purchase
                  Stock-In, POS Sales Stock-Out with invoice printing, Supplier directory, Employee records, and an
                  automatically reconciled Financial Ledger.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-[#1d1d1f] dark:text-white">3. System Methodology</h3>
                <p>
                  Designed using normalized relational modeling (3NF) across 10 core entities. Transactional API
                  endpoints wrap stock updates and financial entries in atomic database transactions so partial failures
                  cannot corrupt stock quantities.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-[#1d1d1f] dark:text-white">4. Testing & Conclusion</h3>
                <p>
                  Verified across authentication, CRUD mutations, negative stock prevention during sales checkout,
                  pending-to-received purchase order transitions, and CSV report generation. Ready for academic defense
                  and commercial deployment.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="font-display font-semibold text-[#1d1d1f] dark:text-white mb-3">
                10-Slide Viva Presentation Outline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {[
                  '01. Title & Project Scope',
                  '02. Problem & Existing Gaps',
                  '03. Objectives & Target Users',
                  '04. Technology Stack Matrix',
                  '05. 3-Tier System Architecture',
                  '06. ER Diagram & 10 Tables',
                  '07. Auth & Admin Dashboard',
                  '08. Purchase & Sales Automation',
                  '09. Financial Ledger & Reports',
                  '10. Live Demo & Future Scope',
                ].map((slide) => (
                  <div
                    key={slide}
                    className="p-3 rounded-xl glass-inset font-medium text-[#1d1d1f] dark:text-[#f5f5f7]"
                  >
                    {slide}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </AppleViewTransition>
    </div>
  );
};
