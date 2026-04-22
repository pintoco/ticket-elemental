'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Ticket, Globe, Phone, MapPin, Plus, Pencil, X, Wrench } from 'lucide-react';
import { companiesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface CompanyForm {
  name: string;
  slug: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  slug: '',
  description: '',
  email: '',
  phone: '',
  address: '',
  isActive: true,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CompaniesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<CompanyForm>>({});

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const canCreate = isSuperAdmin;
  const canEdit = isSuperAdmin || isAdmin;

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa creada exitosamente');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear empresa');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa actualizada exitosamente');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar empresa');
    },
  });

  function openCreate() {
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(company: any) {
    setEditingCompany(company);
    setForm({
      name: company.name || '',
      slug: company.slug || '',
      description: company.description || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      isActive: company.isActive ?? true,
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCompany(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      // auto-generate slug only when creating
      ...(editingCompany ? {} : { slug: slugify(name) }),
    }));
  }

  function validate(): boolean {
    const errs: Partial<CompanyForm> = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (!editingCompany && !form.slug.trim()) errs.slug = 'El slug es obligatorio';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email inválido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    };

    if (editingCompany) {
      payload.isActive = form.isActive;
      updateMutation.mutate({ id: editingCompany.id, data: payload });
    } else {
      payload.slug = form.slug.trim();
      createMutation.mutate(payload);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // The provider company = SUPER_ADMIN's company
  const providerCompanyId = isSuperAdmin ? user?.companyId : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Empresas del Sistema</h2>
          <p className="text-sm text-gray-500">
            {isSuperAdmin
              ? 'Gestión multi-empresa — Elemental Pro presta servicios a las empresas cliente'
              : 'Información de tu empresa'}
          </p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Empresa
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(companies || []).map((company: any) => {
            const isProvider = company.id === providerCompanyId;
            return (
              <div
                key={company.id}
                className={`card p-5 hover:shadow-md transition-shadow ${isProvider ? 'ring-2 ring-brand-200' : ''}`}
              >
                {/* Card header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isProvider ? 'bg-brand-600' : 'bg-brand-100'}`}>
                    {isProvider
                      ? <Wrench className="w-5 h-5 text-white" />
                      : <Building2 className="w-5 h-5 text-brand-600" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                    <p className="text-xs text-gray-400">{company.slug}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {isProvider && (
                      <span className="badge bg-brand-100 text-brand-700">Proveedor</span>
                    )}
                    <span className={`badge ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {company.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>

                {company.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{company.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Users className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{company._count?.users || 0}</p>
                    <p className="text-xs text-gray-500">Usuarios</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Ticket className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">{company._count?.tickets || 0}</p>
                    <p className="text-xs text-gray-500">Tickets</p>
                  </div>
                </div>

                {/* Contact info */}
                {(company.email || company.phone || company.address) && (
                  <div className="pt-3 border-t border-gray-100 space-y-1">
                    {company.email && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        {company.email}
                      </p>
                    )}
                    {company.phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        {company.phone}
                      </p>
                    )}
                    {company.address && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {company.address}
                      </p>
                    )}
                  </div>
                )}

                {/* Edit button */}
                {canEdit && (isSuperAdmin || company.id === user?.companyId) && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(company)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg py-1.5 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar empresa
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingCompany ? 'Editar Empresa' : 'Nueva Empresa Cliente'}
                </h3>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="label">Nombre de la empresa *</label>
                <input
                  className={`input ${errors.name ? 'border-red-300 focus:ring-red-200' : ''}`}
                  placeholder="Ej: Municipalidad de La Serena"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Slug — only on create */}
              {!editingCompany && (
                <div>
                  <label className="label">Identificador (slug) *</label>
                  <input
                    className={`input font-mono text-sm ${errors.slug ? 'border-red-300 focus:ring-red-200' : ''}`}
                    placeholder="municipalidad-la-serena"
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">Identificador único, solo letras minúsculas y guiones.</p>
                  {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Descripción breve de la empresa..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email de contacto</label>
                  <input
                    className={`input ${errors.email ? 'border-red-300 focus:ring-red-200' : ''}`}
                    type="email"
                    placeholder="contacto@empresa.cl"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input
                    className="input"
                    placeholder="+56 9 1234 5678"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="label">Dirección</label>
                <input
                  className="input"
                  placeholder="Av. Francisco de Aguirre 100, La Serena"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              {/* isActive toggle — only on edit */}
              {editingCompany && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Estado de la empresa</p>
                    <p className="text-xs text-gray-500">Las empresas inactivas no pueden crear tickets</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.isActive ? 'bg-brand-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting
                    ? 'Guardando...'
                    : editingCompany
                    ? 'Guardar cambios'
                    : 'Crear empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
