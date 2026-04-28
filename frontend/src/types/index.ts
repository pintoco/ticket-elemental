export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TECHNICIAN' | 'OPERATOR' | 'CLIENT';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'ON_SITE' | 'RESOLVED' | 'VALIDATED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketType = 'INCIDENT' | 'MAINTENANCE' | 'INSTALLATION' | 'EMERGENCY';
export type TicketCategory = 'CAMERAS' | 'FIBER_OPTIC' | 'NETWORK' | 'SERVERS' | 'VIDEO_WALL' | 'DSS_PRO' | 'NVR' | 'OTHER';

export type AssetType = 'CAMERA' | 'NVR' | 'DVR' | 'SWITCH' | 'ROUTER' | 'FIBER_LINK' | 'SERVER' | 'UPS' | 'ACCESS_POINT' | 'OTHER';
export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAULTY' | 'RETIRED';

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number; tickets: number };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  companyId: string;
  company: Pick<Company, 'id' | 'name' | 'slug'>;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  brand?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  macAddress?: string;
  location?: string;
  floor?: string;
  notes?: string;
  installedAt?: string;
  lastMaintenanceAt?: string;
  warrantyUntil?: string;
  companyId: string;
  company: Pick<Company, 'id' | 'name' | 'slug'>;
  createdAt: string;
  updatedAt: string;
  _count?: { tickets: number };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category: TicketCategory;
  location?: string;
  cameraId?: string;
  ipAddress?: string;
  slaHours?: number;
  scheduledAt?: string;
  onSiteAt?: string;
  resolvedAt?: string;
  validatedAt?: string;
  closedAt?: string;
  tags: string[];
  companyId: string;
  company: Pick<Company, 'id' | 'name' | 'slug'>;
  creatorId: string;
  creator: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  assignedToId?: string;
  assignedTo?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  assetId?: string;
  asset?: Pick<Asset, 'id' | 'name' | 'type'>;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; attachments: number };
}

export interface TicketComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  ticketId: string;
  authorId: string;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'role' | 'avatar'>;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticket?: Pick<Ticket, 'id' | 'ticketNumber' | 'title'>;
}

export interface DashboardMetrics {
  summary: {
    total: number;
    open: number;
    inProgress: number;
    pending: number;
    resolved: number;
    closed: number;
    critical: number;
    high: number;
  };
  byCategory: Array<{ category: TicketCategory; count: number }>;
  byCompany: Array<{ company: Pick<Company, 'id' | 'name'>; count: number }>;
  byTechnician: Array<{
    technician: Pick<User, 'id' | 'firstName' | 'lastName'>;
    count: number;
  }>;
  recentTickets: Ticket[];
  trend: Array<{ date: string; created: number; resolved: number }>;
  avgResolutionHours: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
