import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import {
  BarChart3,
  BookOpen,
  Boxes,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackagePlus,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { apiRequest, setAuthToken } from './lib/api';
import { playClickSound, setSoundEnabled } from './lib/sound';
import { APPLE_EASE, APPLE_SPRING } from './lib/motion';
import {
  Category,
  CurrencyCode,
  DashboardData,
  Employee,
  FinancialRecord,
  NavSection,
  Product,
  Purchase,
  Sale,
  StockMovement,
  Supplier,
  User,
} from './types';
import { AuthScreen } from './components/AuthScreen';
import { OverviewView } from './components/OverviewView';
import { ProductsView } from './components/ProductsView';
import { SuppliersView } from './components/SuppliersView';
import { PurchasesView } from './components/PurchasesView';
import { SalesView } from './components/SalesView';
import { EmployeesView } from './components/EmployeesView';
import { FinanceView } from './components/FinanceView';
import { ReportsView } from './components/ReportsView';
import { AcademicBlueprintView } from './components/AcademicBlueprintView';
import { AppleViewTransition } from './components/AppleMotion';

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products & Stock', icon: Boxes },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'purchases', label: 'Purchases', icon: PackagePlus },
  { id: 'sales', label: 'Sales & POS', icon: ShoppingCart },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'finances', label: 'Financial Ledger', icon: DollarSign },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'academic', label: 'Academic Blueprint', icon: BookOpen },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [newSaleTrigger, setNewSaleTrigger] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>('BDT');

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [finances, setFinances] = useState<FinancialRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, a, select, [role="button"], summary') as
        | (HTMLElement & { disabled?: boolean })
        | null;
      if (!interactive || interactive.disabled) return;
      if (interactive.dataset.soundToggle === 'true') return;
      playClickSound();
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const loadAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [dashRes, catRes, prodRes, movRes, supRes, poRes, saleRes, empRes, finRes] = await Promise.all([
        apiRequest<DashboardData>('/api/dashboard'),
        apiRequest<Category[]>('/api/categories'),
        apiRequest<Product[]>('/api/products'),
        apiRequest<StockMovement[]>('/api/stock-movements'),
        apiRequest<Supplier[]>('/api/suppliers'),
        apiRequest<Purchase[]>('/api/purchases'),
        apiRequest<Sale[]>('/api/sales'),
        apiRequest<Employee[]>('/api/employees'),
        apiRequest<FinancialRecord[]>('/api/finances'),
      ]);
      setDashboard(dashRes);
      setCategories(catRes);
      setProducts(prodRes);
      setMovements(movRes);
      setSuppliers(supRes);
      setPurchases(poRes);
      setSales(saleRes);
      setEmployees(empRes);
      setFinances(finRes);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthToken(null);
        setUser(null);
        setCheckingAuth(false);
        return;
      }
      try {
        const token = await firebaseUser.getIdToken();
        setAuthToken(token);
        const res = await apiRequest<{ user: User }>('/api/auth/me');
        setUser(res.user);
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  const handleLogout = async () => {
    await signOut(auth).catch(() => {});
    setAuthToken(null);
    setUser(null);
    setDashboard(null);
    setCategories([]);
    setProducts([]);
    setMovements([]);
    setSuppliers([]);
    setPurchases([]);
    setSales([]);
    setEmployees([]);
    setFinances([]);
  };

  if (checkingAuth) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={APPLE_SPRING}
            className="glass-surface rounded-2xl px-6 py-4 text-sm font-medium text-[#6e6e73] dark:text-[#a1a1a6]"
          >
            Initializing StockPilot...
          </motion.div>
        </div>
      </MotionConfig>
    );
  }

  if (!user) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthScreen onAuthenticated={(u) => setUser(u)} />
      </MotionConfig>
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];
  const lowStockAlertCount = (dashboard?.kpis.low_stock_count ?? 0) + (dashboard?.kpis.out_of_stock_count ?? 0);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen text-[#1d1d1f] dark:text-[#f5f5f7] flex">
        {/* Mobile Sidebar Backdrop */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm lg:hidden"
            />
          )}
        </AnimatePresence>

      {/* Left Frosted Glass Sidebar (260px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] glass-chrome border-r flex flex-col justify-between transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 no-print ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto">
          <div className="h-14 px-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[9px] bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-[#1d1d1f] flex items-center justify-center font-display font-bold text-sm shadow-sm">
                S
              </div>
              <span className="font-display font-semibold text-[16px] tracking-[-0.02em] text-[#1d1d1f] dark:text-white whitespace-nowrap">
                StockPilot
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] dark:hover:text-white"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`relative w-full px-3 py-2 rounded-[11px] text-[13px] font-medium flex items-center justify-between transition-colors ${
                    isActive
                      ? 'text-[#1d1d1f] dark:text-white'
                      : 'text-[#5a5a60] dark:text-[#a1a1a6] hover:bg-white/45 dark:hover:bg-white/[0.07] hover:text-[#1d1d1f] dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      transition={APPLE_SPRING}
                      className="absolute inset-0 rounded-[11px] bg-white/80 dark:bg-white/[0.14] shadow-[0_2px_10px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 whitespace-nowrap">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#0071e3] dark:text-[#0a84ff]' : 'text-[#6e6e73] dark:text-[#8e8e93]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'products' && lowStockAlertCount > 0 && (
                    <span className="relative z-10 text-[11px] font-mono font-semibold text-[#c93400] dark:text-[#ff9f0a] tabular-nums">
                      {lowStockAlertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Sign Out */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full glass-inset flex items-center justify-center font-display font-semibold text-xs text-[#1d1d1f] dark:text-white shrink-0">
              {user.full_name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white truncate">{user.full_name}</div>
              <div className="text-[11px] text-[#6e6e73] dark:text-[#8e8e93] capitalize truncate">
                {user.role} · {user.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-full glass-inset hover:bg-white/75 dark:hover:bg-white/[0.12] text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#a1a1a6]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Frosted Liquid Glass Top Header */}
        <header className="sticky top-0 z-30 h-14 glass-chrome border-b px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#6e6e73] dark:text-[#a1a1a6] hover:bg-white/50 dark:hover:bg-white/[0.08]"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-[#6e6e73] dark:text-[#8e8e93] font-medium">StockPilot</span>
              <span className="text-black/20 dark:text-white/20">/</span>
              <AnimatePresence mode="wait">
                <motion.h1
                  key={currentNav.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: APPLE_EASE }}
                  className="font-display font-semibold text-[#1d1d1f] dark:text-white truncate"
                >
                  {currentNav.label}
                </motion.h1>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              aria-label="Select currency display"
              className="px-3 py-1.5 text-xs font-mono rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none"
            >
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
            </select>

            <button
              type="button"
              data-sound-toggle="true"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundEnabled(next);
                if (next) playClickSound();
              }}
              aria-label={soundOn ? 'Mute click sound effects' : 'Enable click sound effects'}
              className="p-2 rounded-full glass-inset text-[#5a5a60] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/[0.12] transition-colors"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-full glass-inset text-[#5a5a60] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/[0.12] transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={darkMode ? 'sun' : 'moon'}
                  initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                  transition={{ duration: 0.16, ease: APPLE_EASE }}
                  className="block"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </motion.span>
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('sales');
                setNewSaleTrigger((n) => n + 1);
              }}
              className="hidden sm:inline-flex px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium whitespace-nowrap shrink-0 shadow-[0_4px_14px_rgba(0,113,227,0.3)] transition-colors"
            >
              New Sale
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <AppleViewTransition viewKey={activeSection}>
            {activeSection === 'overview' && (
              <OverviewView
                data={dashboard}
                loading={loadingData && !dashboard}
                currency={currency}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'products' && (
              <ProductsView
                products={products}
                categories={categories}
                suppliers={suppliers}
                movements={movements}
                currency={currency}
                onRefresh={loadAllData}
              />
            )}
            {activeSection === 'suppliers' && (
              <SuppliersView suppliers={suppliers} currency={currency} onRefresh={loadAllData} />
            )}
            {activeSection === 'purchases' && (
              <PurchasesView
                purchases={purchases}
                suppliers={suppliers}
                products={products}
                currency={currency}
                onRefresh={loadAllData}
              />
            )}
            {activeSection === 'sales' && (
              <SalesView
                sales={sales}
                products={products}
                currency={currency}
                onRefresh={loadAllData}
                openCreateTrigger={newSaleTrigger}
              />
            )}
            {activeSection === 'employees' && (
              <EmployeesView employees={employees} currency={currency} onRefresh={loadAllData} />
            )}
            {activeSection === 'finances' && (
              <FinanceView records={finances} currency={currency} onRefresh={loadAllData} />
            )}
            {activeSection === 'reports' && (
              <ReportsView categories={categories} suppliers={suppliers} currency={currency} />
            )}
            {activeSection === 'academic' && <AcademicBlueprintView />}
          </AppleViewTransition>
        </main>
      </div>
    </div>
    </MotionConfig>
  );
}
