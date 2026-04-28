'use client';

import { useState } from 'react';
import { Bell, Search, Menu, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_CONFIG } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import Link from 'next/link';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const roleConfig = user ? ROLE_CONFIG[user.role] : null;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex-1 max-w-md ml-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tickets, cámaras, IPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {unreadData?.count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadData.count > 9 ? '9+' : unreadData.count}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : '?'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            {roleConfig && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleConfig.color}`}>
                {roleConfig.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
