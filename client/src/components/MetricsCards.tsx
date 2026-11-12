import React from 'react';
import {
  CreditCard,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  Percent,
  Clock,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { AppState } from '../types';

interface MetricsCardsProps {
  state: AppState;
  onNavigateToTab?: (tab: string) => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ state, onNavigateToTab }) => {
  const txns = state.transactions;
  const totalCount = txns.length;
  
  // Failed includes actual failed and uncaptured
  const failedTxns = txns.filter((t) => t.status === 'failed' || t.status === 'approved_uncaptured');
  const failedCount = failedTxns.length;

  // Revenue calculations
  const recoveredTxns = txns.filter((t) => t.status === 'recovered');
  const revenueRecovered = recoveredTxns.reduce((sum, t) => sum + (t.recoveredAmount || t.amount), 0);
  const revenueAtRisk = failedTxns.reduce((sum, t) => sum + t.amount, 0);

  // Recovery Rate
  const totalEligible = recoveredTxns.length + failedTxns.length;
  const recoveryRate = totalEligible > 0 ? ((recoveredTxns.length / totalEligible) * 100).toFixed(1) : '0.0';

  // Pending Actions / Human Review
  const pendingActions = state.transactions.flatMap((t) => t.actions).filter((a) => a.status === 'pending' || a.status === 'pending_approval').length;
  const openReviews = state.reviews.filter((r) => r.status === 'open').length;

  const cards = [
    {
      title: 'Total Transactions',
      value: totalCount.toLocaleString(),
      subtext: 'Monitored across PayPal events',
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      tab: 'transactions',
    },
    {
      title: 'Failed Payments',
      value: failedCount.toString(),
      subtext: `${((failedCount / (totalCount || 1)) * 100).toFixed(1)}% failure rate`,
      icon: AlertOctagon,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
      tab: 'transactions',
    },
    {
      title: 'Revenue at Risk',
      value: `$${revenueAtRisk.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: 'Unrecovered failed volume',
      icon: TrendingDown,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      tab: 'transactions',
    },
    {
      title: 'Revenue Recovered',
      value: `$${revenueRecovered.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtext: `${recoveredTxns.length} payments restored`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      badge: 'Protected',
      tab: 'analytics',
    },
    {
      title: 'Recovery Success Rate',
      value: `${recoveryRate}%`,
      subtext: 'Autonomous & guided recovery',
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      badge: '+14% vs manual',
      tab: 'analytics',
    },
    {
      title: 'Pending Human Reviews',
      value: openReviews.toString(),
      subtext: `${pendingActions} actions waiting approval`,
      icon: ShieldAlert,
      color: openReviews > 0 ? 'text-rose-600' : 'text-slate-600',
      bgColor: openReviews > 0 ? 'bg-rose-50' : 'bg-slate-50',
      borderColor: openReviews > 0 ? 'border-rose-100' : 'border-slate-100',
      badge: openReviews > 0 ? 'Action required' : 'All clear',
      tab: 'reviews',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            onClick={() => onNavigateToTab && card.tab && onNavigateToTab(card.tab)}
            className={`bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden group`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 truncate">{card.title}</span>
              <div className={`w-8 h-8 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</span>
              {card.badge && (
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                  {card.badge}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 truncate">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};

