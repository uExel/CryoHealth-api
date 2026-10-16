import { ServiceAccount } from 'firebase-admin/app';

/** Builds the Firebase Admin credential from FIREBASE_PROJECT_ID,
 *  FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY. Returns undefined when none
 *  are set (push disabled); throws when only some are set. The private key
 *  arrives with literal "\n" sequences from .env files, so they are restored
 *  to real newlines. */
export function firebaseCredentialFromEnv(env: {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}): ServiceAccount | undefined {
  const { projectId, clientEmail, privateKey } = env;
  if (!projectId && !clientEmail && !privateKey) return undefined;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase credentials are incomplete: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY together.',
    );
  }
  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}
