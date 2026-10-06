import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Asset, Company, PrismaClient, Ticket, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export const PASSWORD = 'Passw0rd!';

export interface World {
  companies: { ep: Company; a: Company; b: Company };
  users: Record<
    'superAdmin' | 'tech' | 'adminEp' | 'adminA' | 'operatorA' | 'clientA' | 'clientA2' | 'adminB' | 'operatorB',
    User
  >;
  tickets: { byOperatorA: Ticket; byClientA: Ticket; byClientA2: Ticket; ofB: Ticket; assignedToTech: Ticket };
  assets: { a: Asset; b: Asset };
}

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return {
    app,
    prisma: new PrismaClient(),
    jwt: app.get(JwtService),
  };
}

export async function resetDb(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE audit_logs, notifications, attachments, ticket_comments, tickets, assets, users, companies RESTART IDENTITY CASCADE',
  );
}

/** Two client companies (A, B) plus the provider (Elemental Pro) with users for every role. */
export async function seedWorld(prisma: PrismaClient): Promise<World> {
  const password = await bcrypt.hash(PASSWORD, 4);
  const company = (name: string, slug: string) => prisma.company.create({ data: { name, slug } });
  const [ep, a, b] = await Promise.all([
    company('Elemental Pro', 'elementalpro'),
    company('Empresa A', 'empresa-a'),
    company('Empresa B', 'empresa-b'),
  ]);

  const user = (key: string, role: UserRole, companyId: string) =>
    prisma.user.create({
      data: { email: `${key}@test.cl`, password, firstName: key, lastName: 'Test', role, companyId },
    });

  const users = {
    superAdmin: await user('superadmin', UserRole.SUPER_ADMIN, ep.id),
    tech: await user('tech', UserRole.TECHNICIAN, ep.id),
    adminEp: await user('adminep', UserRole.ADMIN, ep.id),
    adminA: await user('admina', UserRole.ADMIN, a.id),
    operatorA: await user('operatora', UserRole.OPERATOR, a.id),
    clientA: await user('clienta', UserRole.CLIENT, a.id),
    clientA2: await user('clienta2', UserRole.CLIENT, a.id),
    adminB: await user('adminb', UserRole.ADMIN, b.id),
    operatorB: await user('operatorb', UserRole.OPERATOR, b.id),
  };

  const assets = {
    a: await prisma.asset.create({ data: { name: 'Cam A', type: 'CAMERA', companyId: a.id } }),
    b: await prisma.asset.create({ data: { name: 'Cam B', type: 'CAMERA', companyId: b.id } }),
  };

  let n = 0;
  const ticket = (companyId: string, creatorId: string, extra: Partial<Ticket> = {}) =>
    prisma.ticket.create({
      data: {
        ticketNumber: `EP-2099-${String(++n).padStart(5, '0')}`,
        title: `Ticket ${n}`,
        description: 'Descripción de prueba',
        companyId,
        creatorId,
        ...extra,
      },
    });

  const tickets = {
    byOperatorA: await ticket(a.id, users.operatorA.id),
    byClientA: await ticket(a.id, users.clientA.id),
    byClientA2: await ticket(a.id, users.clientA2.id),
    ofB: await ticket(b.id, users.operatorB.id),
    assignedToTech: await ticket(ep.id, users.adminEp.id, { assignedToId: users.tech.id }),
  };

  // One public and one internal comment on a ticket of company A
  await prisma.ticketComment.createMany({
    data: [
      { content: 'Comentario público', isInternal: false, ticketId: tickets.byOperatorA.id, authorId: users.adminA.id },
      { content: 'NOTA INTERNA', isInternal: true, ticketId: tickets.byOperatorA.id, authorId: users.adminA.id },
    ],
  });

  return { companies: { ep, a, b }, users, tickets, assets };
}

export function tokenFor(jwt: JwtService, user: User) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, companyId: user.companyId },
    { secret: process.env.JWT_SECRET },
  );
}

export async function closeApp(app: INestApplication, prisma: PrismaClient) {
  await prisma.$disconnect();
  await app.close();
}
