'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Package,
  MapPin,
  Wifi,
  Cpu,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Ticket,
} from 'lucide-react';
import { assetsApi, companiesApi } from '@/lib/api';
import { cn, ASSET_TYPE_CONFIG, ASSET_STATUS_CONFIG } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Asset, AssetType, AssetStatus } from '@/types';

const ASSET_TYPES: AssetType[] = ['CAMERA', 'NVR', 'DVR', 'SWITCH', 'ROUTER', 'FIBER_LINK', 'SERVER', 'UPS', 'ACCESS_POINT', 'OTHER'];
const ASSET_STATUSES: AssetStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAULTY', 'RETIRED'];

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const form = useForm<any>({ defaultValues: { status: 'ACTIVE' } });

  const { data: assetsRes, isLoading } = useQuery({
    queryKey: ['assets', filterType, filterStatus],
    queryFn: () => assetsApi.getAll({
      type: filterType || undefined,
      status: filterStatus || undefined,
    }),
  });

  const { data: companiesRes } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll(),
    enabled: isSuperAdmin,
  });

  const assets: Asset[] = assetsRes?.data?.data ?? [];
  const companies = companiesRes?.data?.data ?? [];

  const filtered = assets.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.brand?.toLowerCase().includes(q) ||
      a.model?.toLowerCase().includes(q) ||
      a.serialNumber?.toLowerCase().includes(q) ||
      a.ipAddress?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q)
    );
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Activo creado exitosamente');
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear activo'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Activo actualizado');
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al actualizar activo'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Activo eliminado');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  const openCreate = () => {
    setEditingAsset(null);
    form.reset({ status: 'ACTIVE', companyId: isSuperAdmin ? '' : user?.companyId });
    setModalOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    form.reset({
      name: asset.name,
      type: asset.type,
      status: asset.status,
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      ipAddress: asset.ipAddress || '',
      macAddress: asset.macAddress || '',
      location: asset.location || '',
      floor: asset.floor || '',
      notes: asset.notes || '',
      installedAt: asset.installedAt ? asset.installedAt.split('T')[0] : '',
      lastMaintenanceAt: asset.lastMaintenanceAt ? asset.lastMaintenanceAt.split('T')[0] : '',
      warrantyUntil: asset.warrantyUntil ? asset.warrantyUntil.split('T')[0] : '',
      companyId: asset.companyId,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAsset(null);
    form.reset();
  };

  const onSubmit = (data: any) => {
    const payload = {
      ...data,
      installedAt: data.installedAt || undefined,
      lastMaintenanceAt: data.lastMaintenanceAt || undefined,
      warrantyUntil: data.warrantyUntil || undefined,
      companyId: isSuperAdmin ? (data.companyId || undefined) : undefined,
    };

    if (editingAsset) {
      const { companyId, ...updatePayload } = payload;
      updateMutation.mutate({ id: editingAsset.id, data: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cámaras, NVR, switches y equipos de red
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Activo
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Buscar por nombre, marca, IP, serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_CONFIG[t].label}</option>
            ))}
          </select>
          <select
            className="select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>{ASSET_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Cargando activos...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay activos registrados</p>
            {isAdmin && (
              <p className="text-gray-400 text-sm mt-1">
                Comienza agregando cámaras, NVR y otros equipos
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Activo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Ubicación / IP</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Empresa</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Tickets</th>
                  {isAdmin && (
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((asset) => {
                  const typeConf = ASSET_TYPE_CONFIG[asset.type];
                  const statusConf = ASSET_STATUS_CONFIG[asset.status];
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                            {typeConf.icon}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{asset.name}</p>
                            {(asset.brand || asset.model) && (
                              <p className="text-xs text-gray-400">
                                {[asset.brand, asset.model].filter(Boolean).join(' ')}
                              </p>
                            )}
                            {asset.serialNumber && (
                              <p className="text-xs text-gray-400">S/N: {asset.serialNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {typeConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge text-xs', statusConf.color, statusConf.bg)}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {asset.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[160px]">{asset.location}</span>
                            </div>
                          )}
                          {asset.ipAddress && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                              <Wifi className="w-3 h-3" />
                              {asset.ipAddress}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{asset.company?.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{asset._count?.tickets ?? 0}</span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(asset)}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(asset)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span>{filtered.length} activo{filtered.length !== 1 ? 's' : ''}</span>
          <span>
            {filtered.filter((a) => a.status === 'ACTIVE').length} activos
          </span>
          <span className="text-yellow-600">
            {filtered.filter((a) => a.status === 'MAINTENANCE').length} en mantención
          </span>
          <span className="text-red-600">
            {filtered.filter((a) => a.status === 'FAULTY').length} con falla
          </span>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAsset ? 'Editar Activo' : 'Nuevo Activo'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
              {/* Row: name + type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    className="input w-full"
                    placeholder="Cámara PTZ Sector Norte"
                    {...form.register('name', { required: true })}
                  />
                </div>
                <div>
                  <label className="label">Tipo *</label>
                  <select className="select w-full" {...form.register('type', { required: true })}>
                    <option value="">Seleccionar tipo</option>
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t}>{ASSET_TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: brand + model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Marca</label>
                  <input className="input w-full" placeholder="Hikvision" {...form.register('brand')} />
                </div>
                <div>
                  <label className="label">Modelo</label>
                  <input className="input w-full" placeholder="DS-2DE4A425IWG-E" {...form.register('model')} />
                </div>
              </div>

              {/* Row: serial + IP */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">N° Serie</label>
                  <input className="input w-full" placeholder="SN-20230401-047" {...form.register('serialNumber')} />
                </div>
                <div>
                  <label className="label">Dirección IP</label>
                  <input className="input w-full font-mono" placeholder="192.168.10.47" {...form.register('ipAddress')} />
                </div>
              </div>

              {/* Row: mac + status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">MAC Address</label>
                  <input className="input w-full font-mono" placeholder="AA:BB:CC:DD:EE:FF" {...form.register('macAddress')} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select className="select w-full" {...form.register('status')}>
                    {ASSET_STATUSES.map((s) => (
                      <option key={s} value={s}>{ASSET_STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row: location + floor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Ubicación</label>
                  <input className="input w-full" placeholder="Av. Balmaceda esq. Matta" {...form.register('location')} />
                </div>
                <div>
                  <label className="label">Piso / Sector</label>
                  <input className="input w-full" placeholder="Piso 2 - Sala de Control" {...form.register('floor')} />
                </div>
              </div>

              {/* Row: dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Instalado</label>
                  <input className="input w-full" type="date" {...form.register('installedAt')} />
                </div>
                <div>
                  <label className="label">Últ. Mantención</label>
                  <input className="input w-full" type="date" {...form.register('lastMaintenanceAt')} />
                </div>
                <div>
                  <label className="label">Garantía hasta</label>
                  <input className="input w-full" type="date" {...form.register('warrantyUntil')} />
                </div>
              </div>

              {/* Company (only SUPER_ADMIN creating new) */}
              {isSuperAdmin && !editingAsset && (
                <div>
                  <label className="label">Empresa</label>
                  <select className="select w-full" {...form.register('companyId')}>
                    <option value="">Seleccionar empresa</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">Notas</label>
                <textarea
                  className="input w-full resize-none"
                  rows={2}
                  placeholder="Observaciones o notas de mantenimiento..."
                  {...form.register('notes')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isBusy}>
                  {isBusy ? 'Guardando...' : editingAsset ? 'Guardar cambios' : 'Crear activo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Eliminar activo</h3>
                <p className="text-sm text-gray-500">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Esta acción no se puede deshacer. Si el activo tiene tickets asociados, no podrá eliminarse.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="btn-danger"
                disabled={deleteMutation.isPending}
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
