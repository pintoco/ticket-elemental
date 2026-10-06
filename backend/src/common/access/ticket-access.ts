import { ForbiddenException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AuthUser } from '../types/auth-user';

/** Prisma filter with the tickets the user is allowed to see. */
export function ticketAccessWhere(user: AuthUser): Prisma.TicketWhereInput {
  switch (user.role) {
    case UserRole.SUPER_ADMIN:
      return {};
    case UserRole.TECHNICIAN:
      return { companyId: user.companyId, assignedToId: user.id };
    case UserRole.CLIENT:
      return { companyId: user.companyId, creatorId: user.id };
    default:
      return { companyId: user.companyId };
  }
}

/** Throws unless the user may access an already-loaded ticket. */
export function assertTicketAccess(
  ticket: { companyId: string; assignedToId?: string | null; creatorId: string },
  user: AuthUser,
): void {
  if (user.role === UserRole.SUPER_ADMIN) return;
  if (ticket.companyId !== user.companyId) throw new ForbiddenException('Access denied');
  if (user.role === UserRole.TECHNICIAN && ticket.assignedToId !== user.id) {
    throw new ForbiddenException('Access denied');
  }
  if (user.role === UserRole.CLIENT && ticket.creatorId !== user.id) {
    throw new ForbiddenException('Access denied');
  }
}

/** Roles allowed to read internal notes. */
export const INTERNAL_NOTE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.TECHNICIAN,
];
