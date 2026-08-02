import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const ctxFor = (user?: { role: string }): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const requires = (roles?: string[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  it('passes when the route declares no roles', () => {
    requires(undefined);
    expect(guard.canActivate(ctxFor({ role: 'viewer' }))).toBe(true);
  });

  it('passes a matching role', () => {
    requires(['chw', 'facility_admin']);
    expect(guard.canActivate(ctxFor({ role: 'chw' }))).toBe(true);
  });

  it('rejects a non-matching role', () => {
    requires(['cryohealth_admin']);
    expect(() => guard.canActivate(ctxFor({ role: 'chw' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when there is no user at all', () => {
    requires(['viewer']);
    expect(() => guard.canActivate(ctxFor(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
