'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Ticket, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Users, Building2, Activity, RefreshCw
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { formatDate, CATEGORY_CONFIG, STATUS_CONFIG } from '@/lib/utils';
import type { DashboardMetrics, Ticket as TicketType } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  CAMERAS: '#3b82f6',
  FIBER_OPTIC: '#8b5cf6',
  NETWORK: '#06b6d4',
  SERVERS: '#10b981',
  VIDEO_WALL: '#f59e0b',
  DSS_PRO: '#ef4444',
  NVR: '#f97316',
  OTHER: '#6b7280',
};

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: number; color: string; sub?: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => dashboardApi.getMetrics().then((r) => r.data.data as DashboardMetrics),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, byCategory, byTechnician, recentTickets, trend, avgResolutionHours } = data;

  const activeTickets = summary.open + summary.inProgress + summary.pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Panel Operacional</h2>
          <p className="text-sm text-gray-500">
            Actualizado {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('es-CL') : '—'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Ticket} label="Tickets Activos" value={activeTickets} color="bg-brand-600" />
        <StatCard icon={AlertTriangle} label="Críticos" value={summary.critical} color="bg-red-500"
          sub={`+ ${summary.high} alta prioridad`}
        />
        <StatCard icon={CheckCircle2} label="Resueltos" value={summary.resolved + summary.closed} color="bg-green-500" />
        <StatCard icon={Clock} label="Tiempo Promedio" value={avgResolutionHours} color="bg-purple-500"
          sub="horas resolución"
        />
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { key: 'open', label: 'Abiertos', value: summary.open, color: 'border-l-blue-500' },
          { key: 'inProgress', label: 'En Proceso', value: summary.inProgress, color: 'border-l-yellow-500' },
          { key: 'pending', label: 'Pendientes', value: summary.pending, color: 'border-l-orange-500' },
          { key: 'resolved', label: 'Resueltos', value: summary.resolved, color: 'border-l-green-500' },
          { key: 'closed', label: 'Cerrados', value: summary.closed, color: 'border-l-gray-400' },
        ].map((s) => (
          <div key={s.key} className={`card p-4 border-l-4 ${s.color}`}>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Tendencia últimos 30 días</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                labelFormatter={(v) => `Fecha: ${v}`}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="url(#colorCreated)" name="Creados" strokeWidth={2} />
              <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="url(#colorResolved)" name="Resueltos" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Por Categoría</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={45}
              >
                {byCategory.map((entry) => (
                  <Cell key={entry.category} fill={PRIORITY_COLORS[entry.category] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, CATEGORY_CONFIG[name as keyof typeof CATEGORY_CONFIG]?.label || name]}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {byCategory.slice(0, 5).map((c) => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[c.category] }} />
                  <span className="text-gray-600">{CATEGORY_CONFIG[c.category]?.label || c.category}</span>
                </div>
                <span className="font-semibold text-gray-800">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician workload */}
        {byTechnician.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Carga por Técnico</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byTechnician.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="technician.firstName"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  width={70}
                />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Tickets */}
        <div className={cn('card p-5', byTechnician.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Tickets Recientes</h3>
            <Link href="/tickets" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.slice(0, 6).map((ticket: TicketType) => {
              const statusCfg = STATUS_CONFIG[ticket.status];
              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">{ticket.ticketNumber}</span>
                      <span className={`badge ${statusCfg.bg} ${statusCfg.color} text-xs`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate mt-0.5 group-hover:text-brand-600 transition-colors">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-gray-400">{ticket.company.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(ticket.createdAt)}</p>
                    {ticket.assignedTo && (
                      <p className="text-xs text-gray-500">
                        {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
