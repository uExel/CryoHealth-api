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

const ROLES: Role[] = ['cryohealth_admin', 'facility_admin', 'chw', 'viewer'];

/** Real controller + the same two global guards, in the same order, as AppModule;
 *  only the service is stubbed. */
describe('GET /lakes-admin requires a login', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const http = () => app.getHttpServer() as App;
  const lakes = { listAdmin: jest.fn(), list: jest.fn() };

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
    lakes.listAdmin.mockReturnValue({ lakes: [] });
    lakes.list.mockReturnValue({ lakes: [] });
  });

  const token = (role: Role) =>
    jwt.sign({ sub: `user-${role}`, role, name: role });

  it('returns 401 with no token and does not reach the service', async () => {
    await request(http()).get('/lakes-admin').expect(401);
    expect(lakes.listAdmin).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', async () => {
    await request(http())
      .get('/lakes-admin')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
    expect(lakes.listAdmin).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', async () => {
    const expired = jwt.sign(
      { sub: 'user-admin', role: 'cryohealth_admin', name: 'admin' },
      { expiresIn: -60 },
    );
    await request(http())
      .get('/lakes-admin')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
    expect(lakes.listAdmin).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with a different secret', async () => {
    const forged = jwt.sign(
      { sub: 'user-admin', role: 'cryohealth_admin', name: 'admin' },
      { secret: 'some-other-secret' },
    );
    await request(http())
      .get('/lakes-admin')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
    expect(lakes.listAdmin).not.toHaveBeenCalled();
  });

  it.each(ROLES)('lets a logged-in %s through (any role)', async (role) => {
    await request(http())
      .get('/lakes-admin')
      .set('Authorization', `Bearer ${token(role)}`)
      .expect(200);
    expect(lakes.listAdmin).toHaveBeenCalledTimes(1);
  });

  it('keeps the public lake list open without a token', async () => {
    await request(http()).get('/lakes').expect(200);
  });
});
