'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCheck, UserX, Edit2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, companiesApi } from '@/lib/api';
import { ROLE_CONFIG, formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', role: 'TECHNICIAN',
    companyId: currentUser?.companyId || '', password: 'Temporal1234!', phone: ''
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', { search }],
    queryFn: () => usersApi.getAll().then((r) => r.data.data as User[]),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll().then((r) => r.data.data),
    enabled: currentUser?.role === 'SUPER_ADMIN',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
      setShowModal(false);
      setForm({ email: '', firstName: '', lastName: '', role: 'TECHNICIAN', companyId: currentUser?.companyId || '', password: 'Temporal1234!', phone: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al crear usuario'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado');
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        {['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role || '') && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Usuario', 'Rol', 'Empresa', 'Estado', 'Último Acceso', 'Acciones'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (filteredUsers || []).map((u) => {
              const roleCfg = ROLE_CONFIG[u.role];
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-700">
                          {getInitials(u.firstName, u.lastName)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${roleCfg.color}`}>{roleCfg.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{u.company.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Nunca'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {currentUser?.id !== u.id && ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role || '') && (
                      <button
                        onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors
                          ${u.isActive
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                          }`}
                      >
                        {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Crear Nuevo Usuario</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    className="input"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input
                    className="input"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="González"
                  />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="usuario@empresa.cl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Rol *</label>
                  <select
                    className="select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="TECHNICIAN">Técnico</option>
                    <option value="OPERATOR">Operador</option>
                    <option value="CLIENT">Cliente</option>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <>
                        <option value="ADMIN">Administrador</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>
                {currentUser?.role === 'SUPER_ADMIN' && companies && (
                  <div>
                    <label className="label">Empresa *</label>
                    <select
                      className="select"
                      value={form.companyId}
                      onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    >
                      {companies.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Contraseña temporal *</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending}
                className="btn-primary flex-1"
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
