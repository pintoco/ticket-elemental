'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  Bell,
  Settings,
  LogOut,
  Shield,
  PlusCircle,
  ChevronRight,
  Package,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const navItems = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/tickets', label: 'Tickets', icon: Ticket },
      { href: '/tickets/new', label: 'Nuevo Ticket', icon: PlusCircle },
    ],
  },
  {
    title: 'Gestión',
    roles: ['SUPER_ADMIN', 'ADMIN', 'TECHNICIAN'],
    items: [
      { href: '/assets', label: 'Activos', icon: Package },
      { href: '/users', label: 'Usuarios', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/companies', label: 'Empresas', icon: Building2, roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/notifications', label: 'Notificaciones', icon: Bell },
      { href: '/settings', label: 'Configuración', icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    router.push('/login');
    toast.success('Sesión cerrada');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const canSee = (roles?: string[]) => {
    if (!roles) return true;
    return roles.includes(user?.role || '');
  };

  const handleLinkClick = () => {
    onMobileClose?.();
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-sidebar border-r border-white/5 flex flex-col transition-all duration-300 z-40',
        // Desktop width
        collapsed ? 'lg:w-16' : 'lg:w-64',
        // Always 64px wide base, overridden to 256px on desktop when not collapsed
        'w-64',
        // Mobile: hide/show via translate; desktop: always visible
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5 flex-shrink-0">
        <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">Elemental Pro</p>
            <p className="text-gray-500 text-xs">Help Desk</p>
          </div>
        )}
        {/* Desktop collapse button */}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="ml-auto text-gray-500 hover:text-white transition-colors hidden lg:flex"
            title="Colapsar menú"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="ml-auto text-gray-500 hover:text-white transition-colors lg:hidden"
          title="Cerrar menú"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center h-10 mt-2 mx-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Expandir menú"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navItems.map((section) => {
          if (!canSee(section.roles)) return null;
          return (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 mb-2">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  if (!canSee((item as any).roles)) return null;
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        'sidebar-link',
                        active && 'active',
                        collapsed && 'lg:justify-center lg:px-2',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
                      {!collapsed && active && (
                        <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/5 p-3 flex-shrink-0">
        <div className={cn('flex items-center gap-3', collapsed && 'lg:justify-center')}>
          <div className="w-9 h-9 bg-brand-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
            </span>
          </div>
          <div className={cn('flex-1 min-w-0', collapsed && 'lg:hidden')}>
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              'text-gray-500 hover:text-red-400 transition-colors',
              collapsed ? 'lg:ml-0' : 'ml-auto',
            )}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
