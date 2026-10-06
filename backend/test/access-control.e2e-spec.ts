import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { PASSWORD, World, closeApp, createTestApp, resetDb, seedWorld, tokenFor } from './helpers';

describe('Access control (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwt: JwtService;
  let w: World;

  const as = (user: keyof World['users']) => {
    const token = tokenFor(jwt, w.users[user]);
    const auth = { Authorization: `Bearer ${token}` };
    return {
      get: (url: string) => request(app.getHttpServer()).get(`/api/v1${url}`).set(auth),
      post: (url: string, body?: object) => request(app.getHttpServer()).post(`/api/v1${url}`).set(auth).send(body),
      patch: (url: string, body?: object) => request(app.getHttpServer()).patch(`/api/v1${url}`).set(auth).send(body),
      del: (url: string) => request(app.getHttpServer()).delete(`/api/v1${url}`).set(auth),
    };
  };

  const ticketIds = (res: request.Response): string[] => res.body.data.data.map((t: any) => t.id);

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
    w = await seedWorld(prisma);
  });

  afterAll(async () => {
    await closeApp(app, prisma);
  });

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/api/v1/tickets').expect(401);
    });

    it('rejects tokens of deactivated users', async () => {
      await prisma.user.update({ where: { id: w.users.operatorA.id }, data: { isActive: false } });
      await as('operatorA').get('/tickets').expect(401);
    });
  });

  describe('multi-tenant isolation (company B cannot reach company A)', () => {
    it('does not list tickets of other companies', async () => {
      const res = await as('adminB').get('/tickets').expect(200);
      expect(ticketIds(res)).toEqual([w.tickets.ofB.id]);
    });

    it('cannot read, update or delete a ticket of another company', async () => {
      const id = w.tickets.byOperatorA.id;
      await as('adminB').get(`/tickets/${id}`).expect(403);
      await as('adminB').patch(`/tickets/${id}`, { title: 'hacked title' }).expect(403);
      await as('adminB').del(`/tickets/${id}`).expect(403);
      expect(await prisma.ticket.count({ where: { id } })).toBe(1);
    });

    it('cannot create tickets for another company', async () => {
      await as('adminB')
        .post('/tickets', {
          title: 'Ticket ajeno',
          description: 'Intento de crear en otra empresa',
          priority: 'LOW',
          type: 'INCIDENT',
          category: 'OTHER',
          companyId: w.companies.a.id,
        })
        .expect(403);
    });

    it('cannot comment on or read comments of another company ticket', async () => {
      const id = w.tickets.byOperatorA.id;
      await as('adminB').post(`/tickets/${id}/comments`, { content: 'intruso' }).expect(403);
      await as('adminB').get(`/tickets/${id}/comments`).expect(403);
    });

    it('cannot attach an asset of another company to a ticket', async () => {
      await as('operatorB')
        .patch(`/tickets/${w.tickets.ofB.id}`, { assetId: w.assets.a.id })
        .expect(400);
    });

    it('cannot read or modify assets of another company', async () => {
      await as('adminB').get(`/assets/${w.assets.a.id}`).expect(403);
      await as('adminB').patch(`/assets/${w.assets.a.id}`, { name: 'Nombre nuevo' }).expect(403);
      await as('adminB').del(`/assets/${w.assets.a.id}`).expect(403);
      const list = await as('adminB').get('/assets').expect(200);
      expect(list.body.data.map((x: any) => x.id)).toEqual([w.assets.b.id]);
    });

    it('cannot read or edit users of another company', async () => {
      await as('adminB').get(`/users/${w.users.operatorA.id}`).expect(403);
      await as('adminB').patch(`/users/${w.users.operatorA.id}`, { firstName: 'x' }).expect(403);
      const list = await as('adminB').get('/users').expect(200);
      const companyIds = new Set(list.body.data.map((u: any) => u.companyId));
      expect([...companyIds]).toEqual([w.companies.b.id]);
    });

    it('cannot create users in another company', async () => {
      await as('adminB')
        .post('/users', {
          email: 'nuevo@test.cl',
          password: 'Passw0rd!',
          firstName: 'Nuevo',
          lastName: 'Usuario',
          role: 'OPERATOR',
          companyId: w.companies.a.id,
        })
        .expect(403);
    });

    it('cannot read or edit another company', async () => {
      await as('adminB').get(`/companies/${w.companies.a.id}`).expect(403);
      await as('adminB').patch(`/companies/${w.companies.a.id}`, { name: 'Hack' }).expect(403);
    });

    it('dashboard metrics only count own company tickets', async () => {
      const res = await as('adminB').get('/dashboard/metrics').expect(200);
      expect(res.body.data.summary.total).toBe(1);
    });

    it('audit logs only show own company entries', async () => {
      await as('adminA')
        .post('/tickets', {
          title: 'Ticket auditado',
          description: 'Genera un registro de auditoría',
          priority: 'LOW',
          type: 'INCIDENT',
          category: 'OTHER',
        })
        .expect(201);
      const res = await as('adminB').get('/audit-logs').expect(200);
      expect(res.body.data.data).toHaveLength(0);
    });

    it('SUPER_ADMIN can see everything', async () => {
      const res = await as('superAdmin').get('/tickets?limit=100').expect(200);
      expect(res.body.data.meta.total).toBe(5);
      await as('superAdmin').get(`/tickets/${w.tickets.ofB.id}`).expect(200);
    });
  });

  describe('role matrix', () => {
    it('CLIENT only sees tickets they created', async () => {
      const res = await as('clientA').get('/tickets').expect(200);
      expect(ticketIds(res)).toEqual([w.tickets.byClientA.id]);
      await as('clientA').get(`/tickets/${w.tickets.byClientA.id}`).expect(200);
      await as('clientA').get(`/tickets/${w.tickets.byClientA2.id}`).expect(403);
      await as('clientA').get(`/tickets/${w.tickets.byOperatorA.id}`).expect(403);
    });

    it('OPERATOR sees all tickets of own company', async () => {
      const res = await as('operatorA').get('/tickets').expect(200);
      expect(ticketIds(res).sort()).toEqual(
        [w.tickets.byOperatorA.id, w.tickets.byClientA.id, w.tickets.byClientA2.id].sort(),
      );
    });

    it('TECHNICIAN only sees tickets assigned to them', async () => {
      const res = await as('tech').get('/tickets').expect(200);
      expect(ticketIds(res)).toEqual([w.tickets.assignedToTech.id]);
      await as('tech').get(`/tickets/${w.tickets.byOperatorA.id}`).expect(403);
    });

    it('hides internal notes from OPERATOR/CLIENT in ticket detail and comment list', async () => {
      const id = w.tickets.byOperatorA.id;

      const detail = await as('operatorA').get(`/tickets/${id}`).expect(200);
      expect(detail.body.data.comments.map((c: any) => c.content)).toEqual(['Comentario público']);

      const list = await as('operatorA').get(`/tickets/${id}/comments`).expect(200);
      expect(list.body.data.map((c: any) => c.content)).toEqual(['Comentario público']);

      const adminDetail = await as('adminA').get(`/tickets/${id}`).expect(200);
      expect(adminDetail.body.data.comments).toHaveLength(2);
    });

    it('ignores isInternal when posted by an OPERATOR', async () => {
      const id = w.tickets.byOperatorA.id;
      const res = await as('operatorA')
        .post(`/tickets/${id}/comments`, { content: 'intento de nota interna', isInternal: true })
        .expect(201);
      expect(res.body.data.isInternal).toBe(false);
    });

    it('only ADMIN/SUPER_ADMIN can delete tickets', async () => {
      const id = w.tickets.byOperatorA.id;
      await as('operatorA').del(`/tickets/${id}`).expect(403);
      await as('clientA').del(`/tickets/${w.tickets.byClientA.id}`).expect(403);
      await as('adminA').del(`/tickets/${id}`).expect(200);
    });

    it('only managers can list or create users', async () => {
      await as('operatorA').get('/users').expect(403);
      await as('clientA').get('/users').expect(403);
      await as('operatorA')
        .post('/users', {
          email: 'x@test.cl',
          password: 'Passw0rd!',
          firstName: 'X',
          lastName: 'Y',
          role: 'OPERATOR',
          companyId: w.companies.a.id,
        })
        .expect(403);
    });

    it('ADMIN cannot create TECHNICIAN or SUPER_ADMIN users', async () => {
      for (const role of ['TECHNICIAN', 'SUPER_ADMIN']) {
        await as('adminEp')
          .post('/users', {
            email: `${role.toLowerCase()}@test.cl`,
            password: 'Passw0rd!',
            firstName: 'X',
            lastName: 'Y',
            role,
            companyId: w.companies.ep.id,
          })
          .expect(403);
      }
    });

    it('SUPER_ADMIN can create a TECHNICIAN in Elemental Pro only', async () => {
      const payload = {
        email: 'newtech@test.cl',
        password: 'Passw0rd!',
        firstName: 'New',
        lastName: 'Tech',
        role: 'TECHNICIAN',
      };
      await as('superAdmin').post('/users', { ...payload, companyId: w.companies.a.id }).expect(400);
      await as('superAdmin').post('/users', { ...payload, companyId: w.companies.ep.id }).expect(201);
    });

    it('nobody below SUPER_ADMIN can escalate their own role', async () => {
      await as('operatorA').patch(`/users/${w.users.operatorA.id}`, { role: 'ADMIN' }).expect(403);
      await as('adminA').patch(`/users/${w.users.adminA.id}`, { role: 'SUPER_ADMIN' }).expect(403);
      await as('adminA').patch(`/users/${w.users.adminA.id}`, { isActive: false }).expect(403);
      expect((await prisma.user.findUnique({ where: { id: w.users.operatorA.id } })).role).toBe('OPERATOR');
    });

    it('ADMIN cannot modify or deactivate SUPER_ADMIN/TECHNICIAN accounts', async () => {
      await as('adminEp').patch(`/users/${w.users.superAdmin.id}`, { isActive: false }).expect(403);
      await as('adminEp').patch(`/users/${w.users.tech.id}`, { firstName: 'x' }).expect(403);
      await as('adminEp').del(`/users/${w.users.tech.id}`).expect(403);
    });

    it('users can edit their own profile but not others', async () => {
      await as('operatorA').patch(`/users/${w.users.operatorA.id}`, { firstName: 'Nuevo' }).expect(200);
      await as('operatorA').patch(`/users/${w.users.clientA.id}`, { firstName: 'x' }).expect(403);
    });

    it('only SUPER_ADMIN can create companies', async () => {
      await as('adminA').post('/companies', { name: 'Nueva', slug: 'nueva' }).expect(403);
    });

    it('rejects assigning a ticket to a non-technician', async () => {
      await as('adminA')
        .patch(`/tickets/${w.tickets.byOperatorA.id}`, { assignedToId: w.users.operatorA.id })
        .expect(400);
      await as('adminA')
        .patch(`/tickets/${w.tickets.byOperatorA.id}`, { assignedToId: w.users.tech.id })
        .expect(200);
    });

    it('rejects unknown fields (mass assignment)', async () => {
      await as('operatorA')
        .patch(`/tickets/${w.tickets.byOperatorA.id}`, { companyId: w.companies.b.id })
        .expect(400);
      await as('operatorA')
        .patch(`/tickets/${w.tickets.byOperatorA.id}`, { creatorId: w.users.operatorB.id })
        .expect(400);
    });
  });

  describe('session revocation', () => {
    const login = (email: string, password = PASSWORD) =>
      request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password });

    it('invalidates the refresh token after a password change', async () => {
      const res = await login(w.users.operatorA.email).expect(200);
      const { refreshToken, accessToken } = res.body.data;

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const relogin = await login(w.users.operatorA.email).expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${w.users.operatorA.id}/change-password`)
        .set('Authorization', `Bearer ${relogin.body.data.accessToken}`)
        .send({ currentPassword: PASSWORD, newPassword: 'NuevaPass123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: relogin.body.data.refreshToken })
        .expect(401);
      expect(accessToken).toBeDefined();
    });

    it('invalidates the refresh token when the user is deactivated', async () => {
      const res = await login(w.users.operatorA.email).expect(200);
      await as('adminA').del(`/users/${w.users.operatorA.id}`).expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: res.body.data.refreshToken })
        .expect(401);
    });
  });
});
