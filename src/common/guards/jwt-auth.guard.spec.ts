import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

const ctxFor = (headers: Record<string, string> = {}): ExecutionContext => {
  const req = { headers };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let config: ConfigService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = new Reflector();
    config = { get: jest.fn() } as unknown as ConfigService;
    guard = new JwtAuthGuard(reflector, config);
  });

  afterEach(() => jest.restoreAllMocks());

  it('bypasses passport entirely for a @Public() route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const superSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
    expect(guard.canActivate(ctxFor())).toBe(true);
    expect(superSpy).not.toHaveBeenCalled();
  });

  it('defers to passport for a route with no @Public() and no valid service key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);
    expect(guard.canActivate(ctxFor())).toBe(true);
    expect(superSpy).toHaveBeenCalled();
  });

  it('accepts a valid x-api-key on an @AllowServiceKey() route without touching passport', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === 'allowServiceKey' ? true : false,
      );
    jest
      .spyOn(config, 'get')
      .mockReturnValue('a-very-long-shared-secret-key-value');
    const superSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
    const ctx = ctxFor({ 'x-api-key': 'a-very-long-shared-secret-key-value' });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(superSpy).not.toHaveBeenCalled();
    expect(ctx.switchToHttp().getRequest<{ user?: object }>().user).toEqual({
      sub: 'service:cryohealth-geo',
      role: 'cryohealth_admin',
      name: 'CryoHealth-geo',
    });
  });

  it('falls through to passport when the x-api-key is wrong, even on an @AllowServiceKey() route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === 'allowServiceKey' ? true : false,
      );
    jest
      .spyOn(config, 'get')
      .mockReturnValue('a-very-long-shared-secret-key-value');
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(false);
    const ctx = ctxFor({ 'x-api-key': 'wrong-key' });

    expect(guard.canActivate(ctx)).toBe(false);
    expect(superSpy).toHaveBeenCalled();
  });

  it('falls through to passport when no key is configured server-side', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === 'allowServiceKey' ? true : false,
      );
    jest.spyOn(config, 'get').mockReturnValue(undefined);
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(false);
    const ctx = ctxFor({ 'x-api-key': 'anything' });

    expect(guard.canActivate(ctx)).toBe(false);
    expect(superSpy).toHaveBeenCalled();
  });
});
