import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_SERVICE_KEY } from '../decorators/allow-service-key.decorator';
import { JwtPayload } from '../types/jwt-payload.type';

/** Registered globally (see AppModule). @Public() is the only way past it — there is
 *  no route that is unprotected just because nobody added a guard to it.
 *
 *  @AllowServiceKey() is a second, narrower way past it: a route opted into accepting
 *  GEO_SERVICE_API_KEY (via the x-api-key header) as an alternative to a human JWT, for
 *  machine callers that have no user to log in as. A valid key attaches a synthetic
 *  'cryohealth_admin' JwtPayload to the request so RolesGuard downstream behaves exactly
 *  as it would for a real admin — the key does not skip role checks, only the JWT step. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const allowsServiceKey = this.reflector.getAllAndOverride<boolean>(
      ALLOW_SERVICE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (allowsServiceKey && this.hasValidServiceKey(ctx)) return true;

    return super.canActivate(ctx);
  }

  private hasValidServiceKey(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();
    const provided = req.headers['x-api-key'];
    const expected = this.config.get<string>('GEO_SERVICE_API_KEY');
    if (!provided || !expected) return false;

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch rather than returning false —
    // lengths differing is itself not secret, so compare that first.
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    req.user = {
      sub: 'service:cryohealth-geo',
      role: 'cryohealth_admin',
      name: 'CryoHealth-geo',
    };
    return true;
  }
}
