'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth.store';
import Cookies from 'js-cookie';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tickets': 'Tickets',
  '/tickets/new': 'Nuevo Ticket',
  '/users': 'Usuarios',
  '/companies': 'Empresas',
  '/notifications': 'Notificaciones',
  '/settings': 'Configuración',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  const getTitle = () => {
    if (pathname.includes('/tickets/') && pathname !== '/tickets/new') return 'Detalle de Ticket';
    return PAGE_TITLES[pathname] || 'Elemental Pro';
  };

  if (!isAuthenticated && !Cookies.get('accessToken')) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={getTitle()}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
