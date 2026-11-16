import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/types/role.type';
import { LakesController } from './lakes.controller';
import { LakesService } from './lakes.service';

const LAKE_ID = '11111111-1111-4111-8111-111111111111';
const NON_ADMINS: Role[] = ['facility_admin', 'chw', 'viewer'];

/** Real controller + the same two global guards, in the same order, as AppModule; only
 *  the service is stubbed. What is asserted is whether the handler is reached. */
describe('LakesController admin write permissions', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const http = () => app.getHttpServer() as App;
  const lakes = {
    createLake: jest.fn(),
    updateLake: jest.fn(),
    deleteLake: jest.fn(),
    listAdmin: jest.fn(),
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ jwt: { secret: 'test-secret' } })],
        }),
        PassportModule,
        JwtModule.register({ secret: 'test-secret' }),
      ],
      controllers: [LakesController],
      providers: [
        JwtStrategy,
        { provide: LakesService, useValue: lakes },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.resetAllMocks();
    lakes.createLake.mockReturnValue({ lake: { id: LAKE_ID } });
    lakes.updateLake.mockReturnValue({ lake: { id: LAKE_ID } });
    lakes.deleteLake.mockReturnValue({ ok: true });
  });

  const token = (role: Role) =>
    jwt.sign({ sub: `user-${role}`, role, name: role });

  const routes = [
    {
      name: 'POST /admin/lakes',
      call: (t?: string) => send(request(http()).post('/admin/lakes'), t),
      handler: () => lakes.createLake,
    },
    {
      name: 'PUT /admin/lakes/:id',
      call: (t?: string) =>
        send(request(http()).put(`/admin/lakes/${LAKE_ID}`), t),
      handler: () => lakes.updateLake,
    },
    {
      name: 'DELETE /admin/lakes/:id',
      call: (t?: string) =>
        send(request(http()).delete(`/admin/lakes/${LAKE_ID}?reason=x`), t),
      handler: () => lakes.deleteLake,
    },
  ];

  function send(req: request.Test, t?: string) {
    return (t ? req.set('Authorization', `Bearer ${t}`) : req).send({});
  }

  describe.each(routes)('$name', ({ call, handler }) => {
    it('lets cryohealth_admin through to the handler', async () => {
      const res = await call(token('cryohealth_admin'));
      expect(res.status).toBeLessThan(300);
      expect(handler()).toHaveBeenCalledTimes(1);
    });

    it.each(NON_ADMINS)(
      'returns 403 for %s and never reaches the handler',
      async (role) => {
        const res = await call(token(role));
        expect(res.status).toBe(403);
        expect(handler()).not.toHaveBeenCalled();
      },
    );

    it('returns 401 with no token', async () => {
      const res = await call();
      expect(res.status).toBe(401);
      expect(handler()).not.toHaveBeenCalled();
    });
  });

  it('leaves GET /admin/lakes as it was (any authenticated role)', async () => {
    lakes.listAdmin.mockReturnValue({ rows: [] });
    const res = await request(http())
      .get('/admin/lakes')
      .set('Authorization', `Bearer ${token('viewer')}`);
    expect(res.status).toBe(200);
    expect(lakes.listAdmin).toHaveBeenCalledTimes(1);
  });
});
