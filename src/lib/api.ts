import { CurrencyCode } from '../types';
import { auth } from './firebase';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

export async function getAuthToken(): Promise<string | null> {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    inMemoryToken = token;
    return token;
  }
  return inMemoryToken;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export function formatMoney(amount: number, currency: CurrencyCode = 'BDT'): string {
  const value = Number(amount) || 0;
  if (currency === 'USD') {
    const usd = value / 120;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: usd < 100 ? 2 : 0,
      maximumFractionDigits: usd < 100 ? 2 : 0,
    }).format(usd);
  }
  return `৳${Math.round(value).toLocaleString('en-US')}`;
}

export function formatDateTime(value: string): string {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
