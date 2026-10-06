import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';
import { World, closeApp, createTestApp, resetDb, seedWorld, tokenFor } from './helpers';

describe('Ticket number generation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwt: JwtService;
  let w: World;

  beforeAll(async () => {
    ({ app, prisma, jwt } = await createTestApp());
    await resetDb(prisma);
    w = await seedWorld(prisma);
  });

  afterAll(async () => {
    await closeApp(app, prisma);
  });

  it('assigns unique, sequential numbers under concurrent creation', async () => {
    const auth = { Authorization: `Bearer ${tokenFor(jwt, w.users.operatorA)}` };
    const concurrent = 10;

    const responses = await Promise.all(
      Array.from({ length: concurrent }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/v1/tickets')
          .set(auth)
          .send({
            title: `Ticket concurrente ${i}`,
            description: 'Creación concurrente de tickets',
            priority: 'LOW',
            type: 'INCIDENT',
            category: 'OTHER',
          }),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual(Array(concurrent).fill(201));

    const numbers = responses.map((r) => r.body.data.ticketNumber as string);
    expect(new Set(numbers).size).toBe(concurrent);
    numbers.forEach((n) => expect(n).toMatch(/^EP-\d{4}-\d{5}$/));
  });
});
