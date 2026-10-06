import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { AuthUser } from '../common/types/auth-user';

const baseTicket = {
  id: 't1',
  companyId: 'c1',
  creatorId: 'creator',
  assignedToId: 'tech',
  status: 'OPEN',
  priority: 'LOW',
  title: 'x',
  comments: [],
};

function build() {
  const prisma: any = {
    ticket: { findUnique: jest.fn().mockResolvedValue(baseTicket) },
    user: { findUnique: jest.fn() },
    asset: { findUnique: jest.fn() },
  };
  const service = new TicketsService(prisma, {} as any, {} as any, {} as any);
  return { service, prisma };
}

const user = (role: UserRole, id = 'u1', companyId = 'c1'): AuthUser => ({
  id,
  role,
  companyId,
  email: 'a@b.cl',
});

describe('TicketsService.findOne', () => {
  it('hides internal comments from OPERATOR and CLIENT', async () => {
    const { service, prisma } = build();
    await service.findOne('t1', user(UserRole.OPERATOR));
    expect(prisma.ticket.findUnique.mock.calls[0][0].include.comments.where).toEqual({ isInternal: false });
  });

  it('shows internal comments to ADMIN', async () => {
    const { service, prisma } = build();
    await service.findOne('t1', user(UserRole.ADMIN));
    expect(prisma.ticket.findUnique.mock.calls[0][0].include.comments.where).toBeUndefined();
  });

  it('forbids CLIENT from reading tickets created by someone else', async () => {
    const { service } = build();
    await expect(service.findOne('t1', user(UserRole.CLIENT, 'other'))).rejects.toThrow(ForbiddenException);
  });

  it('forbids access across companies', async () => {
    const { service } = build();
    await expect(service.findOne('t1', user(UserRole.ADMIN, 'a', 'c2'))).rejects.toThrow(ForbiddenException);
  });
});

describe('TicketsService.update relation validation', () => {
  it('rejects an assignee that is not a technician', async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.OPERATOR, isActive: true });
    await expect(
      service.update('t1', { assignedToId: 'u9' } as any, user(UserRole.ADMIN)),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an asset from another company', async () => {
    const { service, prisma } = build();
    prisma.asset.findUnique.mockResolvedValue({ companyId: 'other' });
    await expect(
      service.update('t1', { assetId: 'a1' } as any, user(UserRole.ADMIN)),
    ).rejects.toThrow(BadRequestException);
  });
});
