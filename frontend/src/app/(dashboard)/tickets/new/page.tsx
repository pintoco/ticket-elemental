'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { ticketsApi, usersApi, companiesApi } from '@/lib/api';
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
  companyId: z.string().optional(),
  scheduledAt: z.string().optional(),
  slaHours: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'MEDIUM',
      type: 'INCIDENT',
      category: 'OTHER',
      companyId: user?.companyId,
    },
  });

  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => usersApi.getTechnicians().then((r) => r.data.data),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll().then((r) => r.data.data),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      ticketsApi.create({ ...data, tags }),
    onSuccess: (res) => {
      toast.success('Ticket creado exitosamente');
      router.push(`/tickets/${res.data.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear ticket');
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
    createMutation.mutate(data);
  };

  const selectedCategory = watch('category');
  const selectedPriority = watch('priority');

  const PRIORITY_COLORS = {
    LOW: 'border-gray-300',
    MEDIUM: 'border-blue-400',
    HIGH: 'border-orange-400',
    CRITICAL: 'border-red-500',
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Crear Nuevo Ticket</h1>
          <p className="text-sm text-gray-500">Complete el formulario para registrar un nuevo ticket</p>
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
              placeholder="Ej: Cámara PTZ sin señal en sector centro"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Descripción *</label>
            <textarea
              {...register('description')}
              rows={4}
              className={cn('input resize-none', errors.description && 'border-red-400')}
              placeholder="Describe el problema con detalle. ¿Qué ocurre? ¿Cuándo comenzó? ¿Impacto?"
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

          <div className="grid grid-cols-2 gap-3">
            {user?.role === 'SUPER_ADMIN' && companies && (
              <div>
                <label className="label">Empresa</label>
                <select {...register('companyId')} className="select">
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

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
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Crear Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
