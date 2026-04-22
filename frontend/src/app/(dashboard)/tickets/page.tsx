'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { ticketsApi } from '@/lib/api';
import {
  STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, TYPE_CONFIG,
  formatDate, formatRelativeDate, cn
} from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En Proceso' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'RESOLVED', label: 'Resuelto' },
  { value: 'CLOSED', label: 'Cerrado' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'CAMERAS', label: 'Cámaras' },
  { value: 'FIBER_OPTIC', label: 'Fibra Óptica' },
  { value: 'NETWORK', label: 'Red' },
  { value: 'SERVERS', label: 'Servidores' },
  { value: 'VIDEO_WALL', label: 'Video Wall' },
  { value: 'DSS_PRO', label: 'DSS Pro' },
  { value: 'NVR', label: 'NVR' },
];

export default function TicketsPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState('');
  const limit = 20;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ticketsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket eliminado');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al eliminar ticket');
      setConfirmDeleteId(null);
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', { page, search, status, priority, category }],
    queryFn: () =>
      ticketsApi
        .getAll({
          page,
          limit,
          ...(search && { search }),
          ...(status && { status }),
          ...(priority && { priority }),
          ...(category && { category }),
        })
        .then((r) => r.data.data),
    staleTime: 30000,
  });

  const tickets: Ticket[] = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-48">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, número, cámara, IP..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9"
            />
          </div>
        </form>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn('btn-secondary', showFilters && 'ring-2 ring-brand-500')}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {(status || priority || category) && (
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
          )}
        </button>

        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
        </button>

        <Link href="/tickets/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo Ticket
        </Link>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Estado</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="select"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                className="select"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Categoría</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="select"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setStatus(''); setPriority(''); setCategory(''); setSearch(''); setPage(1); }}
                className="btn-secondary w-full"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{meta.total} tickets encontrados</span>
        {(status || priority || category || search) && (
          <span className="text-brand-600 font-medium">con filtros aplicados</span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                  Ticket
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                  Título
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">
                  Estado
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">
                  Prioridad
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">
                  Categoría
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">
                  Empresa
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden xl:table-cell">
                  Técnico
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden xl:table-cell">
                  Fecha
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="font-medium">No se encontraron tickets</p>
                      <p className="text-sm">Intenta con otros filtros o crea un nuevo ticket</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const statusCfg = STATUS_CONFIG[ticket.status];
                  const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                  const categoryCfg = CATEGORY_CONFIG[ticket.category];
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors line-clamp-1"
                        >
                          {ticket.title}
                        </Link>
                        {ticket.location && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{ticket.location}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`badge ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} />
                          <span className={`text-xs font-medium ${priorityCfg.color}`}>
                            {priorityCfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">
                          {categoryCfg.icon} {categoryCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{ticket.company.name}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {ticket.assignedTo ? (
                          <span className="text-sm text-gray-600">
                            {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="text-xs text-gray-400">
                          {formatRelativeDate(ticket.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </Link>
                          {currentUser?.role === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => { setConfirmDeleteId(ticket.id); setConfirmDeleteTitle(ticket.title); }}
                              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Página {meta.page} de {meta.totalPages} — {meta.total} resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="btn-secondary py-1.5 px-2 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Eliminar ticket</h3>
                <p className="text-sm text-gray-500 line-clamp-1">{confirmDeleteTitle}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Esta acción eliminará el ticket y todos sus comentarios de forma permanente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
