import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Opt OUT of the global auth requirement. The default is authenticated; a public
 *  route says so explicitly, it is never public by omission (api-design rubric #3). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
