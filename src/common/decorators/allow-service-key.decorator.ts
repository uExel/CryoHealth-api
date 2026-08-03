import { SetMetadata } from '@nestjs/common';

export const ALLOW_SERVICE_KEY = 'allowServiceKey';
/** Opt IN, per-route, to accepting GEO_SERVICE_API_KEY as an alternative to a human JWT
 *  — for machine callers (CryoHealth-geo) that have no user to log in as. A valid key
 *  is treated as a 'cryohealth_admin' JWT would be; it does not bypass RolesGuard, and
 *  a route still needs @Roles(...) to actually authorize anything. Scoped per-route
 *  (not a global bypass) so adding a new service integration is a visible, reviewable
 *  decision on that one handler, same spirit as @Public(). */
export const AllowServiceKey = () => SetMetadata(ALLOW_SERVICE_KEY, true);
