'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { ticketsApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(5, 'Mínimo 5 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  type: z.enum(['INCIDENT', 'MAINTENANCE', 'INSTALLATION', 'EMERGENCY']),
  category: z.enum(['CAMERAS', 'FIBER_OPTIC', 'NETWORK', 'SERVERS', 'VIDEO_WALL', 'DSS_PRO', 'NVR', 'OTHER']),
  location: z.string().optional(),
  cameraId: z.string().optional(),
  ipAddress: z.string().optional(),
  assignedToId: z.string().optional(),
  scheduledAt: z.string().optional(),
  slaHours: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getById(id).then((r) => r.data.data),
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => usersApi.getTechnicians().then((r) => r.data.data),
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (ticket) {
      reset({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        type: ticket.type,
        category: ticket.category,
        location: ticket.location || '',
        cameraId: ticket.cameraId || '',
        ipAddress: ticket.ipAddress || '',
        assignedToId: ticket.assignedTo?.id || '',
        scheduledAt: ticket.scheduledAt
          ? new Date(ticket.scheduledAt).toISOString().slice(0, 16)
          : '',
        slaHours: ticket.slaHours,
      });
      setTags(ticket.tags || []);
    }
  }, [ticket, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      ticketsApi.update(id, {
        ...data,
        tags,
        assignedToId: data.assignedToId || undefined,
        scheduledAt: data.scheduledAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket actualizado exitosamente');
      router.push(`/tickets/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar ticket');
    },
  });

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  const selectedPriority = watch('priority');

  const PRIORITY_COLORS = {
    LOW: 'border-gray-300',
    MEDIUM: 'border-blue-400',
    HIGH: 'border-orange-400',
    CRITICAL: 'border-red-500',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return <div className="text-gray-500">Ticket no encontrado</div>;

  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'].includes(user?.role || '');
  if (!canEdit) {
    router.push(`/tickets/${id}`);
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/tickets/${id}`)} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editar Ticket</h1>
          <p className="text-sm text-gray-500 font-mono">{ticket.ticketNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic Info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 pb-2 border-b">Información Básica</h2>

          <div>
            <label className="label">Título del Ticket *</label>
            <input
              {...register('title')}
              className={cn('input', errors.title && 'border-red-400')}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Descripción *</label>
            <textarea
              {...register('description')}
              rows={4}
              className={cn('input resize-none', errors.description && 'border-red-400')}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select {...register('type')} className="select">
                <option value="INCIDENT">Incidente</option>
                <option value="MAINTENANCE">Mantención</option>
                <option value="INSTALLATION">Instalación</option>
                <option value="EMERGENCY">Emergencia</option>
              </select>
            </div>

            <div>
              <label className="label">Categoría *</label>
              <select {...register('category')} className="select">
                <option value="CAMERAS">📷 Cámaras</option>
                <option value="FIBER_OPTIC">🔌 Fibra Óptica</option>
                <option value="NETWORK">🌐 Red</option>
                <option value="SERVERS">🖥️ Servidores</option>
                <option value="VIDEO_WALL">📺 Video Wall</option>
                <option value="DSS_PRO">💾 DSS Pro</option>
                <option value="NVR">🎬 NVR</option>
                <option value="OTHER">⚙️ Otro</option>
              </select>
            </div>

            <div>
              <label className="label">Prioridad *</label>
              <select
                {...register('priority')}
                className={cn('select border-l-4', PRIORITY_COLORS[selectedPriority as keyof typeof PRIORITY_COLORS])}
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 pb-2 border-b">Información Técnica</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ubicación</label>
              <input
                {...register('location')}
                className="input"
                placeholder="Av. Balmaceda esq. Matta, Poste #12"
              />
            </div>
            <div>
              <label className="label">ID de Cámara</label>
              <input
                {...register('cameraId')}
                className="input"
                placeholder="CAM-PT-047"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dirección IP</label>
              <input
                {...register('ipAddress')}
                className="input"
                placeholder="192.168.10.47"
              />
            </div>
            <div>
              <label className="label">Fecha Programada</label>
              <input
                {...register('scheduledAt')}
                type="datetime-local"
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 pb-2 border-b">Asignación</h2>

          <div>
            <label className="label">Técnico Asignado</label>
            <select {...register('assignedToId')} className="select">
              <option value="">Sin asignar</option>
              {technicians?.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 pb-2 border-b mb-4">Etiquetas</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              className="input flex-1"
              placeholder="urgente, cenco, fibra..."
            />
            <button type="button" onClick={addTag} className="btn-secondary">
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="badge bg-brand-100 text-brand-700 flex items-center gap-1">
                #{tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <button type="button" onClick={() => router.push(`/tickets/${id}`)} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn-primary"
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
