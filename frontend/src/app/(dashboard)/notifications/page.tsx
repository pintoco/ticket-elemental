'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { formatRelativeDate, cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then((r) => r.data.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    TICKET_CREATED: { label: 'Ticket Creado', color: 'bg-blue-100 text-blue-700' },
    TICKET_UPDATED: { label: 'Ticket Actualizado', color: 'bg-yellow-100 text-yellow-700' },
    TICKET_ASSIGNED: { label: 'Ticket Asignado', color: 'bg-purple-100 text-purple-700' },
    TICKET_RESOLVED: { label: 'Ticket Resuelto', color: 'bg-green-100 text-green-700' },
    COMMENT_ADDED: { label: 'Nuevo Comentario', color: 'bg-gray-100 text-gray-700' },
    MENTION: { label: 'Mención', color: 'bg-orange-100 text-orange-700' },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notificaciones</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} sin leer</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="btn-secondary text-xs"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="card divide-y divide-gray-100">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (notifications || []).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Sin notificaciones</p>
            <p className="text-sm">Te avisaremos cuando haya actividad</p>
          </div>
        ) : (
          (notifications || []).map((n: any) => {
            const typeCfg = TYPE_LABELS[n.type] || { label: n.type, color: 'bg-gray-100 text-gray-600' };
            return (
              <div
                key={n.id}
                className={cn(
                  'p-4 flex items-start gap-3 transition-colors hover:bg-gray-50',
                  !n.isRead && 'bg-blue-50/30',
                )}
                onClick={() => !n.isRead && markOneMutation.mutate(n.id)}
              >
                <div className={cn(
                  'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                  n.isRead ? 'bg-gray-200' : 'bg-brand-500',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`badge text-xs ${typeCfg.color}`}>{typeCfg.label}</span>
                    <span className="text-xs text-gray-400">{formatRelativeDate(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  {n.ticket && (
                    <Link
                      href={`/tickets/${n.ticket.id}`}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1 font-medium"
                    >
                      {n.ticket.ticketNumber}: {n.ticket.title}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
