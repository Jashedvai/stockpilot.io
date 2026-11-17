import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Clock, Edit3, Plus, Search, Trash2, X, XCircle } from 'lucide-react';
import { CurrencyCode, Employee } from '../types';
import { apiRequest, formatMoney } from '../lib/api';
import { appleAlertVariants } from '../lib/motion';
import { AppleModal } from './AppleMotion';

interface EmployeesViewProps {
  employees: Employee[];
  currency: CurrencyCode;
  onRefresh: () => Promise<void>;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ employees, currency, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    emp_code: '',
    full_name: '',
    email: '',
    phone: '',
    role_title: '',
    department: 'Operations',
    salary: '',
    status: 'Active' as Employee['status'],
    joined_date: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesSearch =
        !q ||
        e.full_name.toLowerCase().includes(q) ||
        e.emp_code.toLowerCase().includes(q) ||
        e.role_title.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'all' || e.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, search, deptFilter]);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setForm({
      emp_code: `EMP-0${Math.floor(10 + Math.random() * 89)}`,
      full_name: '',
      email: '',
      phone: '',
      role_title: '',
      department: 'Operations',
      salary: '1200',
      status: 'Active',
      joined_date: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setError(null);
    setForm({
      emp_code: emp.emp_code,
      full_name: emp.full_name,
      email: emp.email,
      phone: emp.phone,
      role_title: emp.role_title,
      department: emp.department,
      salary: String(emp.salary),
      status: emp.status,
      joined_date: emp.joined_date,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form, salary: Number(form.salary) || 0 };
      if (editing) {
        await apiRequest(`/api/employees/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    setError(null);
    try {
      await apiRequest(`/api/employees/${emp.id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove employee.');
    }
  };

  const totalMonthlyPayroll = employees
    .filter((e) => e.status === 'Active')
    .reduce((sum, e) => sum + e.salary, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[230px]">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, or role..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-white placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] dark:focus:border-[#0a84ff]"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3.5 py-2 text-xs rounded-[10px] glass-input text-[#1d1d1f] dark:text-[#f5f5f7] focus:outline-none focus:border-[#0071e3]"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-[#5a5a60] dark:text-[#a1a1a6]">
            Active Monthly Payroll:{' '}
            <span className="font-mono font-semibold text-[#1d1d1f] dark:text-white">
              {formatMoney(totalMonthlyPayroll, currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            key="employees-error"
            variants={appleAlertVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-3.5 rounded-xl bg-[#ff3b30]/12 backdrop-blur-md border border-[#ff3b30]/25 text-xs text-[#d70015] dark:text-[#ff453a] flex items-center justify-between"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6e6e73] dark:text-[#8e8e93] bg-white/35 dark:bg-white/[0.03]">
                <th className="py-3 px-4 font-medium">Employee</th>
                <th className="py-3 px-4 font-medium">Role & Department</th>
                <th className="py-3 px-4 font-medium">Contact</th>
                <th className="py-3 px-4 font-medium">Joined</th>
                <th className="py-3 px-4 font-medium text-right">Salary</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[#1d1d1f] dark:text-white">{emp.full_name}</div>
                    <div className="text-xs font-mono text-[#86868b] dark:text-[#8e8e93]">{emp.emp_code}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[#1d1d1f] dark:text-[#f5f5f7]">{emp.role_title}</div>
                    <div className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">{emp.department}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                    <div>{emp.email}</div>
                    <div className="font-mono text-[#86868b] dark:text-[#8e8e93]">{emp.phone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-[#6e6e73] dark:text-[#a1a1a6]">
                    {emp.joined_date}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-[#1d1d1f] dark:text-white">
                    {formatMoney(emp.salary, currency)}
                  </td>
                  <td className="py-3.5 px-4">
                    {emp.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#248a3d] dark:text-[#30d158]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : emp.status === 'On Leave' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#c93400] dark:text-[#ff9f0a]">
                        <Clock className="w-3.5 h-3.5" />
                        On Leave
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#d70015] dark:text-[#ff453a]">
                        <XCircle className="w-3.5 h-3.5" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(emp)}
                        title="Edit Employee"
                        className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(emp)}
                        title="Delete Employee"
                        className="p-1.5 rounded-lg text-[#6e6e73] hover:text-[#d70015] dark:hover:text-[#ff453a] hover:bg-[#ff3b30]/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AppleModal open={showModal} onClose={() => setShowModal(false)} maxWidthClass="max-w-lg">
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-display font-semibold tracking-tight text-[#1d1d1f] dark:text-white">
            {editing ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Code</label>
                  <input
                    type="text"
                    required
                    value={form.emp_code}
                    onChange={(e) => setForm({ ...form, emp_code: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={form.role_title}
                    onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">
                    Salary (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Employee['status'] })}
                    className="w-full px-3.5 py-2 text-sm rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6e6e73] dark:text-[#a1a1a6] mb-1.5">Joined</label>
                  <input
                    type="date"
                    required
                    value={form.joined_date}
                    onChange={(e) => setForm({ ...form, joined_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-[10px] glass-input text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0071e3] focus:bg-white/85 dark:focus:bg-[#1c1c1e]/85"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-full glass-inset text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium rounded-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] dark:hover:bg-[#1a8cff] text-white transition-colors"
                >
                  {submitting ? 'Saving...' : editing ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
      </AppleModal>
    </div>
  );
};
