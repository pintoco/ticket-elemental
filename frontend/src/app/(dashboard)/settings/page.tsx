'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Shield, Pencil, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_CONFIG } from '@/lib/utils';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile().then((r) => r.data.data),
  });

  const startEdit = () => {
    setProfileForm({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
    });
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(user!.id, data),
    onSuccess: (res) => {
      setUser(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      toast.success('Perfil actualizado');
    },
    onError: () => toast.error('Error al actualizar perfil'),
  });

  const pwMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(user!.id, data),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Error al cambiar contraseña';
      toast.error(msg);
    },
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      phone: profileForm.phone || undefined,
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const roleCfg = user ? ROLE_CONFIG[user.role] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Profile Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Mi Perfil</h2>
          </div>
          {!editing && (
            <button onClick={startEdit} className="btn-secondary text-xs">
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-gray-500">{user?.email}</p>
            {roleCfg && (
              <span className={`badge ${roleCfg.color} mt-1`}>{roleCfg.label}</span>
            )}
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  className="input"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input
                  className="input"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">{profile?.email}</p>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+56912345678"
                />
              </div>
              <div>
                <label className="label">Empresa</label>
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">{profile?.company?.name}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                <Check className="w-4 h-4" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre</label>
              <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{profile?.firstName}</p>
            </div>
            <div>
              <label className="label">Apellido</label>
              <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{profile?.lastName}</p>
            </div>
            <div>
              <label className="label">Email</label>
              <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{profile?.email}</p>
            </div>
            <div>
              <label className="label">Teléfono</label>
              <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{profile?.phone || '—'}</p>
            </div>
            <div>
              <label className="label">Empresa</label>
              <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{profile?.company?.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-5 h-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Cambiar Contraseña</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="label">Contraseña actual</label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="input"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
              className="input"
              placeholder="Repite la nueva contraseña"
              required
            />
          </div>
          <button type="submit" disabled={pwMutation.isPending} className="btn-primary">
            {pwMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>

      {/* System Info */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Información del Sistema</h2>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Versión', value: 'v1.0.0' },
            { label: 'Plataforma', value: 'Elemental Pro Help Desk' },
            { label: 'Stack', value: 'NestJS + Next.js + PostgreSQL' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-800 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
