import React, { useState } from 'react';
import {
  Users,
  Search,
  CreditCard,
  AlertOctagon,
  TrendingUp,
  ShieldCheck,
  Building,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { AppState, Customer, Transaction } from '../types';

interface CustomersViewProps {
  state: AppState;
  onSelectTransaction: (txn: Transaction) => void;
  onNavigateToTab: (tab: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  state,
  onSelectTransaction,
  onNavigateToTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = state.customers.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  const customerTransactions = selectedCustomer
    ? state.transactions.filter((t) => t.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-navy-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
              Directory
            </span>
            <span className="text-xs text-slate-400">Customer Risk & Revenue Intelligence</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Merchants & Customers</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Customer-centric payment reliability tracking, risk scoring, and historical recovered lifetime value.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-navy-900/80 p-3.5 rounded-xl border border-navy-700/80 shrink-0">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Active Accounts</span>
            <p className="text-xs font-bold text-white mt-0.5">{state.customers.length} Accounts</p>
          </div>
          <div className="w-px h-8 bg-navy-700"></div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Protected Revenue</span>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">
              ${state.customers.reduce((sum, c) => sum + (c.recoveredRevenue || 0), 0).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter customers by name, email, or company..."
          className="text-xs text-slate-800 placeholder-slate-400 w-full outline-none"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Customer & Company</th>
                <th className="py-3 px-4">PayPal Payer ID</th>
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Total Txns</th>
                <th className="py-3 px-4">Open At Risk</th>
                <th className="py-3 px-4">Recovered Revenue</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`hover:bg-slate-50/80 cursor-pointer transition ${
                    selectedCustomer?.id === customer.id ? 'bg-indigo-50/50' : ''
                  }`}
                >
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">{customer.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{customer.email}</span>
                      {customer.company && (
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          • <Building className="w-3 h-3 text-slate-400" /> {customer.company}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                    {customer.paypalPayerId || '—'}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {customer.segment || 'Retail'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            customer.riskScore > 60
                              ? 'bg-rose-500'
                              : customer.riskScore > 30
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${customer.riskScore}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{customer.riskScore}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {customer.transactionCount || 0}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-rose-600">
                    ${(customer.openAmount || 0).toFixed(2)}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-emerald-600">
                    +${(customer.recoveredRevenue || 0).toFixed(2)}
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1 ml-auto"
                    >
                      History <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Section */}
      {selectedCustomer && (
        <div className="bg-white rounded-xl p-6 border border-indigo-200 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{selectedCustomer.name}</h3>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                  {selectedCustomer.segment}
                </span>
              </div>
              <p className="text-xs text-slate-500">{selectedCustomer.email} · {selectedCustomer.company}</p>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Close History
            </button>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Transactions for {selectedCustomer.name} ({customerTransactions.length})
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {customerTransactions.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTransaction(t)}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-400 cursor-pointer transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-600 text-xs">{t.displayId}</span>
                  <span className="font-bold text-slate-900 text-xs">${t.amount.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 capitalize">{t.status.replace('_', ' ')}</div>
                {t.failureReason && (
                  <p className="text-[10px] text-rose-600 truncate mt-0.5">{t.failureReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

