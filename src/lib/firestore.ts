import { doc, getDoc, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function createUserProfileIfNotExists(uid: string, email: string | null, displayName: string | null, photoURL: string | null) {
  const userRef = doc(db, 'users', uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        email: email || '',
        displayName: displayName || '',
        photoURL: photoURL || '',
        role: 'user',
        credits: 1000,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function getUserCredits(uid: string): Promise<number> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) return 0;
    const credits = snap.data().credits;
    return typeof credits === 'number' ? credits : 0;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

export async function deductCredits(uid: string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer');
  }
  const userRef = doc(db, 'users', uid);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) throw new Error('User document not found');
      const current = typeof snap.data().credits === 'number' ? snap.data().credits : 0;
      if (current < amount) throw new Error('insufficient_credits');
      transaction.update(userRef, { credits: current - amount });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_credits') throw error;
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// TODO: Move to server-side after Stripe integration to prevent client-side manipulation
export async function addCredits(uid: string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('amount must be a positive integer');
  }
  const userRef = doc(db, 'users', uid);
  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      await createUserProfileIfNotExists(
        uid,
        currentUser.email,
        currentUser.displayName,
        currentUser.photoURL
      );
    }

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) {
        throw new Error('user_not_found');
      }
      const data = snap.data();
      const currentCredits = data && typeof data.credits === 'number' ? data.credits : 0;
      transaction.update(userRef, { credits: currentCredits + amount });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'user_not_found') {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}
