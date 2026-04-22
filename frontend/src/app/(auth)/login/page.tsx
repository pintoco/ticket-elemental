'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, Wifi } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data.email, data.password);
      const { data: responseData } = response.data;
      setAuth(responseData);
      toast.success(`Bienvenido, ${responseData.user.firstName}!`);
      router.push('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (email: string, password: string) => {
    onSubmit({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Elemental Pro</h1>
              <p className="text-blue-300 text-sm">Help Desk & Service Desk</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Gestión de tickets<br />
            <span className="text-brand-400">profesional y eficiente</span>
          </h2>
          <p className="text-blue-200 text-lg mb-12 max-w-md">
            Plataforma especializada en redes, CCTV, fibra óptica y soporte TI para empresas municipales y corporativas.
          </p>

          <div className="space-y-4">
            {[
              { icon: '📷', title: 'Gestión de Cámaras CCTV', desc: 'PTZ, fijas, NVR, Video Wall' },
              { icon: '🔌', title: 'Fibra Óptica y Redes', desc: 'VLAN, switches, enlaces inalámbricos' },
              { icon: '🖥️', title: 'Soporte TI Avanzado', desc: 'DSS Pro, servidores, infraestructura' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{item.title}</p>
                  <p className="text-blue-300 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Elemental Pro</h1>
              <p className="text-blue-300 text-xs">Help Desk</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
              <p className="text-gray-500 mt-1 text-sm">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="usuario@empresa.cl"
                  className={cn('input', errors.email && 'border-red-400 focus:ring-red-400')}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn('input pr-10', errors.password && 'border-red-400 focus:ring-red-400')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full py-2.5 bg-brand-600 text-white font-semibold rounded-lg transition-all',
                  'hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-2',
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            {/* Quick Access */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 font-medium">Acceso rápido (demo):</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Super Admin', email: 'admin@elementalpro.cl', pass: 'Admin1234!' },
                  { label: 'Técnico', email: 'tecnico1@elementalpro.cl', pass: 'Tecnico1234!' },
                  { label: 'Operador CENCO', email: 'operador@laserena.cl', pass: 'Operador1234!' },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quickLogin(acc.email, acc.pass)}
                    className="text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    <span className="font-medium text-gray-700">{acc.label}</span>
                    <span className="text-gray-400 ml-2">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-blue-300/60 text-xs mt-6">
            © {new Date().getFullYear()} Elemental Pro — Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
