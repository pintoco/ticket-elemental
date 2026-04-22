'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCheck, UserX, Edit2, Shield, Trash2 } from 'lucide-react';
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '', role: 'OPERATOR',
    companyId: currentUser?.companyId || '', password: 'Temporal1234!', phone: ''
  });
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', role: '',
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
      setForm({ email: '', firstName: '', lastName: '', role: 'OPERATOR', companyId: currentUser?.companyId || '', password: 'Temporal1234!', phone: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al crear usuario'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado');
      setEditingUser(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error al actualizar usuario'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado');
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al eliminar usuario');
      setConfirmDeleteId(null);
    },
  });

  const openEdit = (u: User) => {
    setEditForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone || '', role: u.role });
    setEditingUser(u);
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const isMainCompanyRole = (role: string) => role === 'TECHNICIAN' || role === 'SUPER_ADMIN';

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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors
                            ${u.isActive
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                            }`}
                        >
                          {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {u.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => { setConfirmDeleteId(u.id); setConfirmDeleteName(`${u.firstName} ${u.lastName}`); }}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
                <h3 className="font-bold text-gray-900">Eliminar usuario</h3>
                <p className="text-sm text-gray-500">{confirmDeleteName}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Esta acción es permanente. Si el usuario tiene tickets o comentarios asociados, se mostrará un error y deberás desactivarlo en su lugar.
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Editar Usuario</h2>
            <p className="text-sm text-gray-500 mb-4">{editingUser.email}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    className="input"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input
                    className="input"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+56912345678"
                />
              </div>
              <div>
                <label className="label">Rol *</label>
                <select
                  className="select"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  disabled={
                    currentUser?.role !== 'SUPER_ADMIN' &&
                    (isMainCompanyRole(editForm.role) || isMainCompanyRole(editingUser.role))
                  }
                >
                  <option value="OPERATOR">Operador</option>
                  <option value="CLIENT">Cliente</option>
                  <option value="ADMIN">Administrador</option>
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <>
                      <option value="TECHNICIAN">Técnico</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={() => editMutation.mutate({ id: editingUser.id, data: editForm })}
                disabled={editMutation.isPending}
                className="btn-primary flex-1"
              >
                {editMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setForm({
                        ...form,
                        role: newRole,
                        companyId: isMainCompanyRole(newRole) ? (currentUser?.companyId || '') : form.companyId,
                      });
                    }}
                  >
                    <option value="OPERATOR">Operador</option>
                    <option value="CLIENT">Cliente</option>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <>
                        <option value="TECHNICIAN">Técnico</option>
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
                      disabled={isMainCompanyRole(form.role)}
                      onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    >
                      {companies.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {isMainCompanyRole(form.role) && (
                      <p className="text-xs text-gray-400 mt-1">Siempre pertenecen a Elemental Pro</p>
                    )}
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
