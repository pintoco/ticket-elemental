import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TicketStatus, TicketPriority, TicketCategory, TicketType, UserRole } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
}

export function formatRelativeDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Abierto', color: 'text-blue-700', bg: 'bg-blue-100' },
  IN_PROGRESS: { label: 'En Proceso', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  PENDING: { label: 'Pendiente', color: 'text-orange-700', bg: 'bg-orange-100' },
  RESOLVED: { label: 'Resuelto', color: 'text-green-700', bg: 'bg-green-100' },
  CLOSED: { label: 'Cerrado', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bg: string; dot: string }> = {
  LOW: { label: 'Baja', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  MEDIUM: { label: 'Media', color: 'text-blue-600', bg: 'bg-blue-100', dot: 'bg-blue-400' },
  HIGH: { label: 'Alta', color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-400' },
  CRITICAL: { label: 'Crítica', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: string }> = {
  CAMERAS: { label: 'Cámaras', icon: '📷' },
  FIBER_OPTIC: { label: 'Fibra Óptica', icon: '🔌' },
  NETWORK: { label: 'Red', icon: '🌐' },
  SERVERS: { label: 'Servidores', icon: '🖥️' },
  VIDEO_WALL: { label: 'Video Wall', icon: '📺' },
  DSS_PRO: { label: 'DSS Pro', icon: '💾' },
  NVR: { label: 'NVR', icon: '🎬' },
  OTHER: { label: 'Otro', icon: '⚙️' },
};

export const TYPE_CONFIG: Record<TicketType, { label: string }> = {
  INCIDENT: { label: 'Incidente' },
  MAINTENANCE: { label: 'Mantención' },
  INSTALLATION: { label: 'Instalación' },
  EMERGENCY: { label: 'Emergencia' },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'text-purple-700 bg-purple-100' },
  ADMIN: { label: 'Administrador', color: 'text-blue-700 bg-blue-100' },
  TECHNICIAN: { label: 'Técnico', color: 'text-green-700 bg-green-100' },
  OPERATOR: { label: 'Operador', color: 'text-yellow-700 bg-yellow-100' },
  CLIENT: { label: 'Cliente', color: 'text-gray-700 bg-gray-100' },
};
