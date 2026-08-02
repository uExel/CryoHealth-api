import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

const ctxFor = (): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  const reflector = new Reflector();
  const guard = new JwtAuthGuard(reflector);

  afterEach(() => jest.restoreAllMocks());

  it('bypasses passport entirely for a @Public() route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const superSpy = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
    expect(guard.canActivate(ctxFor())).toBe(true);
    expect(superSpy).not.toHaveBeenCalled();
  });

  it('defers to passport for a route with no @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);
    expect(guard.canActivate(ctxFor())).toBe(true);
    expect(superSpy).toHaveBeenCalled();
  });
});
