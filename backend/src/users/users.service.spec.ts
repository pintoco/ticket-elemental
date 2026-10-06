import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { AuthUser } from '../common/types/auth-user';

const actor = (role: UserRole, id = 'actor'): AuthUser => ({ id, role, companyId: 'c1', email: 'a@b.cl' });

function build(target: { id: string; role: UserRole }) {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ ...target, companyId: 'c1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    company: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
  };
  return { service: new UsersService(prisma), prisma };
}

describe('UsersService.update', () => {
  it('blocks OPERATOR from promoting themselves', async () => {
    const { service } = build({ id: 'actor', role: UserRole.OPERATOR });
    await expect(
      service.update('actor', { role: UserRole.ADMIN }, actor(UserRole.OPERATOR)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks OPERATOR from editing other users', async () => {
    const { service } = build({ id: 'other', role: UserRole.CLIENT });
    await expect(
      service.update('other', { firstName: 'x' }, actor(UserRole.OPERATOR)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks ADMIN from editing a SUPER_ADMIN', async () => {
    const { service } = build({ id: 'sa', role: UserRole.SUPER_ADMIN });
    await expect(
      service.update('sa', { isActive: false }, actor(UserRole.ADMIN)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets a TECHNICIAN edit their own profile', async () => {
    const { service, prisma } = build({ id: 'actor', role: UserRole.TECHNICIAN });
    await service.update('actor', { firstName: 'Nuevo' }, actor(UserRole.TECHNICIAN));
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('revokes refresh token when user is deactivated', async () => {
    const { service, prisma } = build({ id: 'u2', role: UserRole.OPERATOR });
    await service.update('u2', { isActive: false }, actor(UserRole.ADMIN));
    expect(prisma.user.update.mock.calls[0][0].data.refreshToken).toBeNull();
  });
});
