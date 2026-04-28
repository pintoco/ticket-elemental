'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import Cookies from 'js-cookie';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tickets': 'Tickets',
  '/tickets/new': 'Nuevo Ticket',
  '/assets': 'Activos',
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

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

  const handleMenuClick = () => {
    if (isMobile) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  if (!isAuthenticated && !Cookies.get('accessToken')) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        )}
      >
        <Header onMenuClick={handleMenuClick} title={getTitle()} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
