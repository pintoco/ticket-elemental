import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../types/auth-user';
import { assertTicketAccess, ticketAccessWhere } from './ticket-access';

const user = (role: UserRole, id = 'u1', companyId = 'c1'): AuthUser => ({
  id,
  role,
  companyId,
  email: `${id}@test.cl`,
});

const ticket = { companyId: 'c1', creatorId: 'creator', assignedToId: 'tech' };

describe('ticketAccessWhere', () => {
  it('SUPER_ADMIN has no filter', () => {
    expect(ticketAccessWhere(user(UserRole.SUPER_ADMIN))).toEqual({});
  });
  it('ADMIN and OPERATOR are scoped to company', () => {
    expect(ticketAccessWhere(user(UserRole.ADMIN))).toEqual({ companyId: 'c1' });
    expect(ticketAccessWhere(user(UserRole.OPERATOR))).toEqual({ companyId: 'c1' });
  });
  it('TECHNICIAN only sees assigned tickets', () => {
    expect(ticketAccessWhere(user(UserRole.TECHNICIAN, 'tech'))).toEqual({
      companyId: 'c1',
      assignedToId: 'tech',
    });
  });
  it('CLIENT only sees own tickets', () => {
    expect(ticketAccessWhere(user(UserRole.CLIENT, 'cli'))).toEqual({
      companyId: 'c1',
      creatorId: 'cli',
    });
  });
});

describe('assertTicketAccess', () => {
  it('allows SUPER_ADMIN on any company', () => {
    expect(() =>
      assertTicketAccess({ ...ticket, companyId: 'other' }, user(UserRole.SUPER_ADMIN)),
    ).not.toThrow();
  });
  it('blocks other companies', () => {
    expect(() =>
      assertTicketAccess({ ...ticket, companyId: 'other' }, user(UserRole.ADMIN)),
    ).toThrow(ForbiddenException);
  });
  it('allows OPERATOR in same company', () => {
    expect(() => assertTicketAccess(ticket, user(UserRole.OPERATOR))).not.toThrow();
  });
  it('blocks CLIENT on tickets created by others', () => {
    expect(() => assertTicketAccess(ticket, user(UserRole.CLIENT, 'cli'))).toThrow(ForbiddenException);
    expect(() => assertTicketAccess(ticket, user(UserRole.CLIENT, 'creator'))).not.toThrow();
  });
  it('blocks TECHNICIAN on tickets not assigned to them', () => {
    expect(() => assertTicketAccess(ticket, user(UserRole.TECHNICIAN, 'x'))).toThrow(ForbiddenException);
    expect(() => assertTicketAccess(ticket, user(UserRole.TECHNICIAN, 'tech'))).not.toThrow();
  });
});
