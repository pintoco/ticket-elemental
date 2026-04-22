'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Send, Lock, Unlock, MapPin,
  Camera, Server, Clock, User, Building2, Tag,
  CheckCircle2, AlertTriangle, ImageIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketsApi, commentsApi } from '@/lib/api';
import {
  STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, TYPE_CONFIG,
  formatDate, formatRelativeDate, getInitials, cn
} from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { TicketStatus, TicketComment } from '@/types';
import Link from 'next/link';

const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'PENDING', 'CLOSED'],
  IN_PROGRESS: ['PENDING', 'RESOLVED', 'CLOSED'],
  PENDING: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [commentPreviews, setCommentPreviews] = useState<string[]>([]);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id).then((r) => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => ticketsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket actualizado');
    },
    onError: () => toast.error('Error al actualizar ticket'),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await commentsApi.create(id, { content: comment, isInternal });
      const commentId = res.data.data.id;
      if (commentImages.length > 0) {
        await commentsApi.uploadAttachments(id, commentId, commentImages);
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setComment('');
      setCommentImages([]);
      setCommentPreviews([]);
      toast.success('Comentario agregado');
    },
    onError: () => toast.error('Error al agregar comentario'),
  });

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - commentImages.length;
    const toAdd = files.slice(0, remaining);
    setCommentImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCommentPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeCommentImage = (index: number) => {
    setCommentImages((prev) => prev.filter((_, i) => i !== index));
    setCommentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    commentMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return <div className="text-gray-500">Ticket no encontrado</div>;

  const statusCfg = STATUS_CONFIG[ticket.status as TicketStatus];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG];
  const categoryCfg = CATEGORY_CONFIG[ticket.category as keyof typeof CATEGORY_CONFIG];
  const transitions = STATUS_TRANSITIONS[ticket.status as TicketStatus] || [];

  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'].includes(user?.role || '');
  const isStaff = ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'].includes(user?.role || '');

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="btn-secondary mt-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-mono text-gray-400">{ticket.ticketNumber}</span>
            <span className={`badge ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} />
              <span className={`text-sm font-medium ${priorityCfg.color}`}>{priorityCfg.label}</span>
            </div>
            <span className="text-sm text-gray-500">
              {categoryCfg.icon} {categoryCfg.label}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{ticket.title}</h1>
          <p className="text-sm text-gray-500">
            Creado {formatRelativeDate(ticket.createdAt)} por{' '}
            <span className="font-medium">{ticket.creator.firstName} {ticket.creator.lastName}</span>
            {' · '}{ticket.company.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Descripción</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Imágenes adjuntas ({ticket.attachments.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ticket.attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={att.url}
                      alt={att.originalName}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments / Chat */}
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Historial y Comentarios ({ticket.comments?.length || 0})
              </h2>
            </div>

            <div className="divide-y divide-gray-50">
              {ticket.comments?.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Sin comentarios aún. Sé el primero en comentar.
                </div>
              )}
              {ticket.comments?.map((c: TicketComment) => {
                const isMe = c.author.id === user?.id;
                return (
                  <div key={c.id} className={cn('p-4', c.isInternal && 'bg-amber-50/50')}>
                    {c.isInternal && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span className="text-xs text-amber-600 font-medium">Nota interna (solo técnicos)</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-brand-700">
                          {getInitials(c.author.firstName, c.author.lastName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">
                            {c.author.firstName} {c.author.lastName}
                          </span>
                          <span className="text-xs text-gray-400">{formatRelativeDate(c.createdAt)}</span>
                          {isMe && <span className="text-xs text-brand-600 font-medium">Tú</span>}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {c.content}
                        </p>
                        {c.attachments && c.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {c.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity flex-shrink-0"
                              >
                                <img
                                  src={att.url}
                                  alt={att.originalName}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comment Form */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <form onSubmit={handleSubmitComment} className="space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  rows={3}
                  className="input resize-none"
                />
                {/* Comment image previews */}
                {commentPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {commentPreviews.map((preview, i) => (
                      <div key={i} className="relative group w-16 h-16">
                        <img
                          src={preview}
                          alt={`imagen ${i + 1}`}
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeCommentImage(i)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {isStaff && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-gray-600">Nota interna</span>
                        <Lock className="w-3 h-3 text-gray-400" />
                      </label>
                    )}
                    {commentImages.length < 5 && (
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-brand-600 transition-colors">
                        <ImageIcon className="w-4 h-4" />
                        <span>Imagen {commentImages.length > 0 ? `(${commentImages.length}/5)` : ''}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          multiple
                          onChange={handleCommentImageSelect}
                        />
                      </label>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!comment.trim() || commentMutation.isPending}
                    className="btn-primary"
                  >
                    <Send className="w-4 h-4" />
                    {commentMutation.isPending ? 'Enviando...' : 'Comentar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Status Actions */}
          {canEdit && transitions.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cambiar Estado</h3>
              <div className="space-y-2">
                {transitions.map((newStatus) => {
                  const cfg = STATUS_CONFIG[newStatus];
                  return (
                    <button
                      key={newStatus}
                      onClick={() => handleStatusChange(newStatus)}
                      disabled={updateMutation.isPending}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                        ${cfg.bg} ${cfg.color} hover:opacity-80 disabled:opacity-50`}
                    >
                      → {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ticket Info */}
          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Información del Ticket</h3>

            <InfoRow icon={Building2} label="Empresa" value={ticket.company.name} />
            <InfoRow
              icon={User}
              label="Técnico asignado"
              value={
                ticket.assignedTo
                  ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                  : 'Sin asignar'
              }
            />
            {ticket.location && (
              <InfoRow icon={MapPin} label="Ubicación" value={ticket.location} />
            )}
            {ticket.cameraId && (
              <InfoRow icon={Camera} label="ID Cámara" value={ticket.cameraId} />
            )}
            {ticket.ipAddress && (
              <InfoRow icon={Server} label="Dirección IP" value={ticket.ipAddress} />
            )}
            {ticket.slaHours && (
              <InfoRow icon={Clock} label="SLA" value={`${ticket.slaHours} horas`} />
            )}
            {ticket.scheduledAt && (
              <InfoRow icon={Clock} label="Programado" value={formatDate(ticket.scheduledAt)} />
            )}
            <InfoRow icon={Clock} label="Creado" value={formatDate(ticket.createdAt)} />
            <InfoRow icon={Clock} label="Actualizado" value={formatDate(ticket.updatedAt)} />
            {ticket.resolvedAt && (
              <InfoRow icon={CheckCircle2} label="Resuelto" value={formatDate(ticket.resolvedAt)} />
            )}

            {ticket.tags && ticket.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Etiquetas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ticket.tags.map((tag: string) => (
                    <span key={tag} className="badge bg-gray-100 text-gray-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit Button */}
          {canEdit && (
            <Link href={`/tickets/${ticket.id}/edit`} className="btn-secondary w-full justify-center">
              <Edit2 className="w-4 h-4" />
              Editar Ticket
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}
